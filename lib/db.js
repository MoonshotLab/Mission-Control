var async = require('async');
var utils = require('./utils');
var config = require('../config')();
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var db;


exports.connect = function(){
  return new Promise(function(resolve, reject){
    MongoClient.connect(config.DB_CONNECT, function(err, connection){
      if(err) reject(err);
      else{
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
      if(!docs.length) reject({ err : 'No Settings Documents Found'});
      else resolve(docs[0]);
    });
  });
};



exports.saveSettings = function(settings){
  return new Promise(function(resolve, reject){
    db.collection('settings').update({}, settings, { upsert : true },
      function(err, res){
        if(err) reject(err);
        else resolve(res);
      }
    );
  });
};



exports.getEvents = function(query){
  if(query.future){
    query['start.dateTime'] = { $gte : new Date() };
    delete query.future;
  }

  return new Promise(function(resolve, reject){
    db.collection('events').find(query).toArray(function(err, docs){
      if(err) reject(err);
      else resolve(docs);
    });
  });
};



exports.saveEvents = function(events){
  async.eachSeries(events, function(item, callback){

    // overwrite a few of the properties coming from google so we
    // can later query more easily
    var id              = item.id;
    item.googleId       = id;
    item.start.dateTime = new Date(item.start.dateTime);
    item.end.dateTime   = new Date(item.end.dateTime);

    // look at the description field for a specially formatted object
    // then HULK SMASH those fields into the event object
    var options = utils.parseStringAsObject(item.description);
    if(options){
      for(var key in options){
        item[key] = options[key];
      }
    }

    // get rid of the special object in the description
    item.description = item.description.replace(/{.*}/, '');

    db.collection('events').update(
      { googleId : item.googleId },
      item,
      { upsert : true },
      callback
    );
  });
};



// startDate and endDate need to be unix timestamps
// with milliseconds, eg. 1455057144380
exports.getGratitudes = function(query){
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
    db.collection('gratitudes').find(query).toArray(function(err, docs){
      if(err) reject(err);
      else resolve(docs);
    });
  });
};



exports.saveGratitude = function(gratitude){
  db.collection('gratitudes').insertOne(gratitude, function(err, res){
    if(err) utils.handleError(err);
  });
};



exports.upsertUsers = function(users){
  return new Promise(function(resolve, reject){
    async.eachSeries(users, function(user, next){
      db.collection('users').update(
        { googleId  : user.googleId },
        { $set      : user },
        { upsert    : true },
        next
      );
    }, function done(){
      resolve(users);
    });
  });
};



exports.getUsers = function(query){
  if(query.phoneNumber){
    query.phones = { $elemMatch: { value: query.phoneNumber }};
    delete query.phoneNumber;
  }

  return new Promise(function(resolve, reject){
    db.collection('users').find(query).toArray(function(err, docs){
      if(err) reject(err);
      else resolve(docs);
    });
  });
};


exports.getRecordById = function(collectionName, id){
  return new Promise(function(resolve, reject){
    var query;
    try{
      query = {'_id' : new mongo.ObjectId(id) };
    } catch(e){
      reject(e);
    }

    db.collection(collectionName).findOne(query, function(err, doc){
      if(err) reject(err);
      else if(doc) resolve(doc);
      else reject('Could not find document');
    });
  });
};
