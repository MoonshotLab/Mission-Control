var async = require('async');
var utils = require('./utils');
var config = require('../config')();
var mongo = require('mongodb');
var socket = require('./socket');
var MongoClient = mongo.MongoClient;
var db;


exports.connect = function(){
  return new Promise(function(resolve, reject){
    MongoClient.connect(config.DB_CONNECT, function(err, connection){
      if(err) reject(err);
      else{
        utils.log(1, 'database connected');
        db = connection;
        resolve();
      }
    });
  });
};



exports.getSettings = function(){
  return new Promise(function(resolve, reject){
    db.collection('settings').find({}).toArray(function(err, docs){
      if(err) reject(err);
      if(!docs.length) reject('No Settings Documents Found');
      else {
        utils.log(3, 'settings fetched', docs[0]);
        resolve(docs[0]);
      }
    });
  });
};



exports.saveSettings = function(settings){
  return new Promise(function(resolve, reject){
    db.collection('settings').update({}, settings, { upsert : true },
      function(err, res){
        if(err) reject(err);
        else {
          utils.log(1, 'settings updated', settings);
          resolve(res);
        }
      }
    );
  });
};



var getEvents = function(query, limit){
  utils.log(3, 'fetching events with query', query);

  if(!query) query = {};
  if(!limit) limit = {};

  if(query.future){
    query['start.dateTime'] = { $gte : new Date() };
    delete query.future;
  }

  return new Promise(function(resolve, reject){
    db.collection('events').find(query, limit)
    .sort({ updated : -1}).toArray(function(err, docs){
      if(err) reject(err);
      else{
        utils.log(3, 'events fetched');
        resolve(docs);
      }
    });
  });
};
exports.getEvents = getEvents;



// retrieves an event by an rsvp code
// returning the next occuring event
exports.getEventByRsvpCode = function(query, limit){
  function compare(a, b){
    if(a.start.dateTime < b.start.dateTime) return -1;
    else if(a.start.dateTime > b.start.dateTime) return 1;
    else return 0;
  }

  return new Promise(function(resolve, reject){
    getEvents(query, limit).then(function(events){
      if(!events.length) resolve(null);
      else{
        events.sort(compare);
        resolve(events);
      }
    }).catch(reject);
  });
};



exports.saveEvents = function(events){
  utils.log(2, 'upserting ' + events.length + ' events');

  async.eachSeries(events, function(item, callback){

    // overwrite a few of the properties coming from google so we
    // can later query more easily
    item.googleId       = item.id;
    item.start.dateTime = new Date(item.start.dateTime);
    item.end.dateTime   = new Date(item.end.dateTime);
    if(!item.attendees) item.attendees = [];
    delete item.id;

    // look at the description field for a specially formatted object
    // then HULK SMASH those fields into the event object
    var options = utils.parseStringAsObject(item.description);
    if(options){
      for(var key in options){
        item[key] = options[key];
      }
    }

    // get rid of the special object in the description
    if(item.description)
      item.description = item.description.replace(/{.*}/, '');

    db.collection('events').findAndModify(
      { googleId : item.googleId },
      [['_id', 1]],
      item,
      { upsert : true },
      function(err, res){
        if(res && res.value && item.updated){
          // if the old document has a different update stamp then the
          // new document, we know a change has been made
          if(res.value.updated != item.updated){
            socket.emit('update', { type : 'events', _id : res.value._id });
          }
        } else if(res && res.lastErrorObject){
          // if it's a newly created document
          var id = res.lastErrorObject.upserted;
          socket.emit('update', { type : 'events', _id : id });
        }
        callback();
      }
    );
  }, function(){
    utils.log(2, 'upserted ' + events.length + ' events');
  });
};



// startDate and endDate need to be unix timestamps
// with milliseconds, eg. 1455057144380
exports.getGratitudes = function(query, limit){
  utils.log(3, 'fetching gratitudes with query', query);

  if(!query) query = {};
  if(!limit) limit = {};

  if(query.startDate || query.endDate) query._id = {};
  if(query.startDate){
    query._id.$gte = utils.objectIdWithTimestamp(query.startDate);
    delete query.startDate;
  }
  if(query.endDate){
    query._id.$lte = utils.objectIdWithTimestamp(query.endDate);
    delete query.endDate;
  }

  return new Promise(function(resolve, reject){
    db.collection('gratitudes').find(query, limit).toArray(function(err, docs){
      if(err) reject(err);
      else {
        utils.log(3, 'gratitudes fetched');
        resolve(docs);
      }
    });
  });
};



exports.saveGratitude = function(gratitude){
  utils.log(2, 'saving gratitude', gratitude);
  db.collection('gratitudes').insertOne(gratitude, function(err, res){
    if(err) utils.logError(err);
    else {
      socket.emit('update', { type : 'gratitudes', _id : res.insertedId });
      utils.log(2, 'gratitude saved', gratitude);
    }
  });
};



exports.upsertUsers = function(users){
  utils.log(2, 'upserting ' + users.length + ' users');

  return new Promise(function(resolve, reject){
    async.eachSeries(users, function(user, next){
      db.collection('users').update(
        { googleId  : user.googleId },
        { $set      : user },
        { upsert    : true },
        next
      );
    }, function done(){
      utils.log(2, 'updated ' + users.length + ' users');
      resolve(users);
    });
  });
};



exports.getUsers = function(query){
  utils.log(3, 'fetching users with query', query);

  if(query.phoneNumber){
    query.phones = { $elemMatch: { value: query.phoneNumber }};
    delete query.phoneNumber;
  }

  return new Promise(function(resolve, reject){
    db.collection('users').find(query).toArray(function(err, docs){
      if(err) reject(err);
      else {
        utils.log(3, 'users fetched');
        resolve(docs);
      }
    });
  });
};


exports.getRecordById = function(collectionName, id){
  utils.log(3, 'getting ' + collectionName, id);

  return new Promise(function(resolve, reject){
    var query;
    try{
      query = {'_id' : new mongo.ObjectId(id) };
    } catch(e){
      reject(e);
    }

    db.collection(collectionName).findOne(query, function(err, doc){
      if(err) reject(err);
      else if(doc) {
        resolve(doc);
        utils.log(3, 'got ' + collectionName, doc);
      } else reject('Could not find document');
    });
  });
};


exports.deleteGratitude = function(messageIds){
  utils.log(3, 'deleting gratitude', messageIds);
  messageIds.forEach(function(messageId){
    db.collection('gratitudes')
      .deleteOne({ messageId : messageId }, function(err, res){
        if(!err) utils.log('2', 'deleted gratitude');
        else utils.logError(err);
      });
  });
};
