var db = require('./db');
var google = require('./google');
var utils = require('./utils');



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
      }).then(db.saveSettings).catch(utils.handleError);

    }).catch(utils.handleError);
};



exports.users = function(req, res){
  google.getDirectoryUsers(function(err, users){
    res.send(users);
  });
};



exports.newEmail = function(req, res){

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
    if(charCount > 140){
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



exports.events = function(req, res){
  db.getEvents(req.query).then(function(events){
    res.send(events);
  }).catch(function(err){
    res.status(500).send(err);
  });
};



exports.gratitudes = function(req, res){
  db.getGratitudes(req.query).then(function(gratitudes){
    res.send(gratitudes);
  }).catch(function(err){
    res.status(500).send(err);
  });
};
