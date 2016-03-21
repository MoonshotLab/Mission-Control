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
  res.sendStatus(200);

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

    }).catch(utils.logError);
};



// API
exports.events = function(req, res){
  req.query.status = 'confirmed';
  req.query.future = true;

  db.getEvents(req.query, { _id : 1 }).then(function(events){
    utils.addPropertyToObjectsInArray(events, 'type', 'events');
    res.send(events);
  }).catch(function(err){
    res.status(500).send(err);
  });
};


exports.event = function(req, res){
  db.getRecordById('events', req.params.id).then(function(doc){
    res.send(doc);
  }).catch(function(err){
    utils.logError(err);
    res.status(500).send(err);
  });
};


// startDate and endDate query params need to be
// unix timestamps with milliseconds, eg. 1455057144380
exports.gratitudes = function(req, res){
  req.query.endDate   = new Date().getTime();
  req.query.startDate = new Date().getTime() - 2592000000;

  db.getGratitudes(req.query, { _id : 1 }).then(function(gratitudes){
    utils.addPropertyToObjectsInArray(gratitudes, 'type', 'gratitudes');
    res.send(gratitudes);
  }).catch(function(err){
    res.status(500).send(err);
  });
};


exports.gratitude = function(req, res){
  db.getRecordById('gratitudes', req.params.id).then(function(doc){
    res.send(doc);
  }).catch(function(err){
    utils.logError(err);
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
      var query = {
        endDate   : new Date().getTime(),
        startDate : new Date().getTime() - 2592000000
      };

      db.getGratitudes(query, { _id : 1 }).then(function(gratitudes){
        utils.addPropertyToObjectsInArray(gratitudes, 'type', 'gratitudes');
        records = records.concat(gratitudes);
        next();
      });
    },
    function(next){
      var query = {
        status : 'confirmed',
        future : true
      };

      db.getEvents(query, { _id : 1 }).then(function(events){
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
  var email     = req.body;
  var gratitude = {
    from    : email.message_data.addresses.from,
    subject : email.message_data.subject,
    body    : utils.cleanEmailBody(email.message_data.bodies[0].content)
  };

  utils.log(2, 'new email received', email);

  // if the character count is too long, reply to the user and don't
  // remember the gratitude
  var charCount = utils.countCharacters(gratitude.body);
  if(charCount > 140 && config.MODE == 'production'){
    utils.log(2, 'gratitude too long, sending back', gratitude);

    google.sendMail({
      toAddress : gratitude.from.email,
      subject   : 'Your Gratitude is too long!',
      body      : 'Your gratitude is great, but it\'s just a little too long. Please stay brief and keep it under <b>140 characters</b>. Please do not reply to this e-mail.'
    });
  } else db.saveGratitude(gratitude);

  res.sendStatus(200);
};


// TODO: this whole thing could probably be done a little more elegantly
exports.newRsvp = function(req, res){
  utils.log(2, 'text message received', req.body);

  var sendMessage = function(text){
    res.setHeader('Content-Type', 'text/xml');
    var textMessage = utils.createTextMessage(text);
    res.send(textMessage);
  };

  if(req.session.status == 'pending'){
    // if there's a pending text message session with the "sessioned" user
    // we're expecting an e-mail address to come through next
    var emailAddresses = utils.extractEmailFromString(req.body.Body);

    if(emailAddresses){
      // sign them up for the event using their e-mail address
      var emailAddress = emailAddresses[0];
      google.sendCalendarInvite(emailAddress, req.session.event);
      sendMessage('Thanks! You\'ve RSVP\'d to ' + req.session.event.summary + '. It\'s been added to your calendar and a reminder e-mail is on the way.');
      req.session.destroy();
    } else{
      // bad email address
      sendMessage('Sorry, that doesn\'t appear to be a valid e-mail address. Can you please send it to me again?');
    }
  } else {
    // if the status isn't pending, we're just looking for a short code
    var userInput   = req.body.Body.toLowerCase().trim();
    var phoneNumber = req.body.From.slice(2, req.body.From.length);

    db.getEvents({ rsvpcode : userInput }).then(function(events){

      if(events.length === 0) {
        // event wasn't found, ask user to type the short code again
        sendMessage('Sorry, I couldn\'t find that event. Did you type the short code right?');
      } else{
        // look for a user with the phone number from the text message
        db.getUsers({ phoneNumber : phoneNumber }).then(function(users){
          if(users.length === 0){
            // if one couldn't be found, record the session and ask for a response
            req.session.event  = events[0];
            req.session.status = 'pending';
            sendMessage('Sorry, I couldn\'t find anyone with that phone number. Please respond with your e-mail address and I\'ll send you an invitation.');
          } else {
            // let them know everything went well and destroy the session
            google.sendCalendarInvite(users[0].primaryEmail, events[0]);
            sendMessage('Thanks ' + users[0].name.givenName + '! You\'ve RSVP\'d to ' + events[0].summary + '. It\'s been added to your calendar and a reminder e-mail is on the way.');
            req.session.destroy();
          }
        }).catch(sendMessage);
      }

    }).catch(sendMessage);
  }
};


exports.updateCalendar = function(req, res){
  google.syncCalendar();
  res.sendStatus(200);
};




// views
var bgImages = [];
utils.getAllBackgroundImages().then(function(images){
  bgImages = images;
});

exports.slideshow = function(req, res){
  res.render('slideshow', { config : {
    PHONE_NUMBER  : config.PHONE_NUMBER,
    BACKGROUNDS   : bgImages
  } });
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
