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
  utils.log(1, 'starting calendar sync', settings);

  return new Promise(function(resolve, reject){
    setCredsWithTokens({
      refresh_token	: settings.refreshToken
    });

    // unsubscribe from the old one
    if(settings.webHookId && settings.webHookResourceId)
      unsubscribeFromCalendar(settings).catch(utils.logError);

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
  utils.log(2, 'unsubscribing from calendar', opts);

  return new Promise(function(resolve, reject){

    calendar.channels.stop({
      auth        : oauth2Client,
      userId      : 'me',
      calendarId  : config.GOOGLE_CALENDAR_ID,
      resource    : {
        'id'          : String(opts.webHookId),
        'resourceId'  : opts.webHookResourceId
      }
    }, function(err, res){
      if(err) reject(err);
      else {
        utils.log(2, 'unsubscribed from calendar', opts);
      }
    });
  });
};



var subscribeToCalendar = function(webhookId){
  utils.log(2, 'subscribing to calendar', webhookId);

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
      else {
        resolve(res.resourceId);
        utils.log(2, 'subscribed to calendar', webhookId);
      }
    });
  });
};



exports.sendMail = function(opts){
  utils.log(2, 'sending mail', opts);

  var base64Email = utils.generateBase64EncodedEmail({
    toAddress : opts.toAddress,
    subject   : opts.subject,
    body      : opts.body
  });

  mail.users.messages.send({
    auth      : oauth2Client,
    userId    : 'me',
    resource  : { raw : base64Email }
  }, function(err, res){
    if(err) utils.logError(err);
    else utils.log(2, 'mail sent', opts);
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



exports.getDirectoryUsers = function(){
  utils.log(2, 'getting directory users');

  var users = [];
  var query = {
    customer  : 'my_customer',
    auth      : oauth2Client,
    userId    : 'me'
  };

  return new Promise(function(resolve, reject){
    (function get(opts){
      utils.log(3, 'retrieved a page of users from the directory');

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
          else {
            utils.log(2, 'got ' + users.length + ' directory users');
            resolve(users);
          }
        }
      });
     })();
  });
};



exports.syncCalendar = function(){
  utils.log(2, 'syncing the calendar');

  calendar.events.list({
    auth        : oauth2Client,
    userId      : 'me',
    orderBy     : 'updated',
    singleEvents: true,
    maxResults  : 2500,
    showDeleted : true,
    calendarId  : config.GOOGLE_CALENDAR_ID,
    timeMin     : utils.buildRFC3339FromDate(new Date())
  }, function(err, res){
    if(err) utils.logError(err);
    if(res.items) db.saveEvents(res.items);
  });
};



exports.sendCalendarInvite = function(toEmail, event){
  utils.log(2, 'sending calendar invite to', toEmail);

  var attendees = event.attendees;
  if(!attendees) attendees = [];

  attendees.push({ email : toEmail });

  calendar.events.patch({
    auth              : oauth2Client,
    eventId           : event.googleId,
    calendarId        : config.GOOGLE_CALENDAR_ID,
    sendNotifications : true,
    resource          : {
      attendees       : attendees
    }
  }, function(err){
    if(err) utils.logError(err);
    else utils.log(2, 'calendar invite sent to', toEmail);
  });
};
