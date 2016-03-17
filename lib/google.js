var google = require('googleapis');
var config = require('../config')();
var utils  = require('./utils');
var db     = require('./db');

var OAuth2        = google.auth.OAuth2;
var directory     = google.admin('directory_v1');
var mail          = google.gmail('v1');
var calendar      = google.calendar('v3');
var redirectUrl   = config.ROOT_URL + '/auth-callback';
var oauth2Client  = new OAuth2(
  config.GOOGLE_ID, config.GOOGLE_SECRET, redirectUrl
);



// pass me a settings object with the following format and I'll
// unsubscribe from the calendar, make new access tokens,
// resubscribe to the calendar, and sync the calendar
// {
//    accessToken       : 'a google access token string'
//    refreshToken      : 'a google refresh token string'
//    webHookId         : 'the webhook id of the previously subscribed channel'
//    webHookResourceId : 'the webhook resource id of the previously subscribed channel'
// }
exports.initCalendarSyncWithSettings = function(settings){
  return new Promise(function(resolve, reject){
    setCredsWithTokens({
      refresh_token	: settings.refreshToken
    });

    // unsubscribe from the old one
    if(settings.webHookId && settings.webHookResourceId)
      unsubscribeFromCalendar(settings).catch(reject);

    // subscribe to a new one
    var webHookId = new Date().getTime();
    subscribeToCalendar(webHookId).then(function(resourceId){
      settings.webHookId          = webHookId;
      settings.webHookResourceId  = resourceId;
      resolve(settings);
    }).catch(reject);
  });
};



var unsubscribeFromCalendar = function(opts){
  return new Promise(function(resolve, reject){

    calendar.channels.stop({
      auth        : oauth2Client,
      userId      : 'me',
      calendarId  : config.GOOGLE_CALENDAR_ID,
      resource    : {
        'id'          : opts.webHookId,
        'resourceId'  : opts.webHookResourceId
      }
    }, function(err, res){
      if(err) reject(err);
      else resolve(res);
    });
  });
};



var subscribeToCalendar = function(webhookId){
  return new Promise(function(resolve, reject){
    var webHookUrl = config.ROOT_URL + '/events/update';

    calendar.events.watch({
      auth        : oauth2Client,
      userId      : 'me',
      calendarId  : config.GOOGLE_CALENDAR_ID,
      resource    : {
        'address'   : webHookUrl,
        'id'        : webhookId,
        'params'    : { 'ttl': '86400' },
        'type'      : 'web_hook'
      }
    }, function(err, res){
      if(err) reject(err);
      else resolve(res.resourceId);
    });
  });
};



exports.sendMail = function(opts){
  var base64Email = utils.generateBase64EncodedEmail({
    toAddress : opts.toAddress,
    subject   : opts.subject,
    body      : opts.body
  });

  mail.users.messages.send({
    auth      : oauth2Client,
    userId    : 'me',
    resource  : { raw : base64Email }
  });
};



exports.getAuthUrl = function(){
  return oauth2Client.generateAuthUrl({
    access_type     : 'offline',
    approval_prompt : 'force',
    scope           : [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.readonly'
    ]
  });
};




exports.getTokenFromCode = function(code){
  return new Promise(function(resolve, reject){
    oauth2Client.getToken(code, function(err, tokens) {
      if(err) reject(err);
      else resolve(tokens);
    });
  });
};



var setCredsWithTokens = function(tokens){
  oauth2Client.setCredentials(tokens);
};



exports.getDirectoryUsers = function(opts){
  var users = [];
  var query = {
    customer  : 'my_customer',
    auth      : oauth2Client,
    userId    : 'me'
  };

  return new Promise(function(resolve, reject){
    (function get(opts){
      // load passed options to the query
      if(!opts) opts = {};
      for(var key in opts){
        query[key] = opts[key];
      }

      // retrieve all the users in the domain, recursing
      directory.users.list(query, function(err, data){
        if(err) reject(err);
        else {
          data.users.forEach(function(user){
            // unformat the phone number
            if(user.phones){
              user.phones.forEach(function(phone){
                phone.value = phone.value.replace(/-/g, '');
              });
            }

            users.push({
              name              : user.name,
              googleId          : user.id,
              primaryEmail      : user.primaryEmail,
              emails            : user.emails,
              phones            : user.phones,
              thumbnailPhotoUrl : user.thumbnailPhotoUrl
            });
          });

          if(data.nextPageToken) get({ pageToken : data.nextPageToken });
          else resolve(users);
        }
      });
     })();
  });
};



exports.syncCalendar = function(){
  calendar.events.list({
    auth        : oauth2Client,
    userId      : 'me',
    orderBy     : 'startTime',
    singleEvents: true,
    maxResults  : 2500,
    showDeleted : true,
    calendarId  : config.GOOGLE_CALENDAR_ID,
    timeMin     : utils.buildRFC3339FromDate(new Date())
  }, function(err, res){
    if(!err && res.items) db.saveEvents(res.items);
  });

  console.log('syncing calendar...');
};



exports.sendCalendarInvite = function(toEmail, event){
  var attendees = event.attendees;
  if(!attendees) attendees = [];

  attendees.push({ email : toEmail });

  calendar.events.patch({
    auth        : oauth2Client,
    eventId     : event.googleId,
    calendarId  : config.GOOGLE_CALENDAR_ID,
    resource    : {
      attendees : attendees
    }
  });
};
