var async = require('async');
var utils = require('./utils');
var config = require('../config')();
var MongoClient = require('mongodb').MongoClient;
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
  return new Promise(function(resolve, reject){
    db.collection('events').find(query).toArray(function(err, docs){
      if(err) reject(err);
      else resolve(docs);
    });
  });
};



exports.saveEvents = function(events){
  async.eachSeries(events, function(item, callback){
    item.googleId = item.id;
    delete item.id;

    db.collection('events').update(
      { googleId : item.googleId },
      item,
      { upsert : true },
      callback
    );
  });
};



exports.getGratitudes = function(query){
  if(query.startDate || query.endDate) query.created_on = {};
  if(query.startDate){
    query.created_on.$gte = new Date(query.startDate);
  }
  if(query.endDate){
    query.created_on.$lte = new Date(query.endDate);
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
