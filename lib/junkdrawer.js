var needle = require('needle');
var async  = require('async');
var db     = require('./db');
var jsdom  = require('jsdom');



exports.attachAnniversariesToUsers = function(url){
  return new Promise(function(resolve, reject){
    var url = 'https://junkdrawer.barkleyus.com/allanniv.asp';
    fetchAndUpdateUser(url, 'anniversary')
      .then(resolve).catch(reject);
  });
};



exports.attachBirthdaysToUsers = function(){
  return new Promise(function(resolve, reject){
    var url = 'https://junkdrawer.barkleyus.com/allbdays.asp';
    fetchAndUpdateUser(url, 'birthday')
      .then(resolve).catch(reject);
  });
};



var fetchAndUpdateUser = function(url, keyPropertyName){
  return new Promise(function(resolve, reject){
    fetchPartnersFromJunkDrawer(url, keyPropertyName).then(function(partners){
      async.eachSeries(partners, function(partner, next){
        upsertUser(partner, keyPropertyName, next);
      }, function(err){
        if(err) reject(err);
        else resolve();
      });
    });
  });
};



var upsertUser = function(partner, keyPropertyName, next){
  var query = {
    'name.givenName'  : partner.firstName,
    'name.familyName' : partner.lastName
  };

  db.getUsers(query).then(function(users){
    if(!users.length) next();
    else {
      users[0][keyPropertyName] = partner.date;
      db.upsertUsers(users).then(function(){
        next();
      }).catch(function(err){
        utils.log(err);
        next();
      });
    }
  }).catch(function(err){
    utils.log(err);
  });
};



var fetchPartnersFromJunkDrawer = function(url, keyPropertyName){
  return new Promise(function(resolve, reject){
    needle.get(url, function(err, res){
      var html = res.body;
      var deps = ['http://code.jquery.com/jquery.js'];

      jsdom.env(html, deps, function(err, window){
        if(err) reject(err);
        resolve(getUsersAndDateFromDocument(window, keyPropertyName));
      });
    });
  });
};



var getUsersAndDateFromDocument = function(window, keyPropertyName){
  var userList = [];

  window.$('.home-content').find('a').each(function(i, el){
    var text        = window.$(el).parent().text();
    var dateString  = text.substring(0, 10);
    var nameString  = text.substring(14, text.length);

    if(keyPropertyName == 'birthday'){
      dateString  = text.substring(0, 5);
      nameString  = text.substring(7, text.length);
    }

    var splits      = nameString.split(' ');
    var firstName   = splits[0];
    var lastName    = splits[1];
    var date        = new Date(dateString);

    userList.push({
      firstName : firstName,
      lastName  : lastName,
      date      : date
    });
  });

  return userList;
};
