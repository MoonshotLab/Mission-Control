var tvml = require('./tvml');
var db = require('./db');
var google = require('./google');
var utils = require('./utils');
var async = require('async');
var path = require('path');
var config = require('../config')();


// Auth
exports.auth = function(req, res){
  res.redirect(google.getAuthUrl());
};


exports.authCallback = function(req, res){
  res.send('Logged in, fetching calendar items...');

  google.getTokenFromCode(req.query.code)
    .then(function(tokens){
      google.initCalendarSyncWithSettings({
        accessToken   : tokens.access_token,
        refreshToken  : tokens.refresh_token,
        webHookId     : new Date().getTime()
      }).then(function(settings){
        db.saveSettings(settings);
        google.getDirectoryUsers().then(db.upsertUsers);
      });

    }).catch(utils.handleError);
};



// API
exports.events = function(req, res){
  db.getEvents(req.query, { _id : 1 }).then(function(events){
    utils.addPropertyToObjectsInArray(events, 'type', 'events');
    res.send(events);
  }).catch(function(err){
    res.status(500).send(err);
  });
};


// startDate and endDate query params need to be
// unix timestamps with milliseconds, eg. 1455057144380
exports.gratitudes = function(req, res){
  db.getGratitudes(req.query, { _id : 1 }).then(function(gratitudes){
    utils.addPropertyToObjectsInArray(gratitudes, 'type', 'gratitudes');
    res.send(gratitudes);
  }).catch(function(err){
    res.status(500).send(err);
  });
};


exports.user = function(req, res){
  db.getUsers(req.query).then(function(user){
    res.send(user);
  });
};


exports.mixed = function(req, res){
  var records = [];

  async.series([
    function(next){
      db.getGratitudes(req.query, { _id : 1 }).then(function(gratitudes){
        utils.addPropertyToObjectsInArray(gratitudes, 'type', 'gratitudes');
        records = records.concat(gratitudes);
        next();
      });
    },
    function(next){
      db.getEvents(req.query, { _id : 1 }).then(function(events){
        utils.addPropertyToObjectsInArray(events, 'type', 'events');
        records = records.concat(events);
        next();
      });
    }
  ],
  function(){
    utils.shuffleArray(records);
    res.send(records);
  });
};




// External Services
exports.newGratitude = function(req, res){

  var body = '';
  req.on('data', function(chunk){
    body += chunk;
  });

  req.on('end', function(){
    var email = JSON.parse(body);
    var gratitude = {
      from    : email.message_data.addresses.from,
      subject : email.message_data.subject,
      body    : utils.cleanEmailBody(email.message_data.bodies[0].content)
    };

    // if the character count is too long, reply to the user and don't
    // remember the gratitude
    var charCount = utils.countCharacters(gratitude.body);
    if(charCount > 140 && config.MODE == 'production'){
      google.sendMail({
        toAddress : gratitude.from.email,
        subject   : 'Your Gratitude is too long!',
        body      : 'Your gratitude is great, but it\'s just a little too long. Please stay brief and keep it under <b>140 characters</b>. Please do not reply to this e-mail.'
      });
    } else{
      db.saveGratitude(gratitude);
    }

  });

  res.end();
};


exports.calendarUpdate = function(req, res){
  google.syncCalendar();
  res.end();
};




// views
exports.view = function(req, res){
  var filePath = path.join(__dirname, '../public', req.params.page + '.html');
  res.sendFile(filePath);
};


exports.tvml = function(req, res){
  if(typeof tvml[req.params.type] == 'function'){
    tvml[req.params.type](req.params.id).then(function(document){
      res.send(document);
    }).catch(function(document){
      res.send(document);
    });
  } else res.sendStatus(404);
};
