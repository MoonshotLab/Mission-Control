var async = require('async');
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
    upsertCalendarItem(item, callback);
  });
};



var upsertCalendarItem = function(item, callback){
  item.googleId = item.id;
  delete item.id;

  db.collection('events').update(
    { googleId : item.googleId },
    item,
    { upsert : true },
    callback
  );
};
