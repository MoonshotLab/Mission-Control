var db          = require('./db');
var google      = require('./google');
var utils       = require('./utils');
var junkdrawer  = require('./junkdrawer');
var contextIo   = require('./contextio');



exports.run = function(){
  // retrieve the settings and init
  db.connect()
    .then(db.getSettings)
    .then(google.initCalendarSyncWithSettings)
    .then(db.saveSettings)
    .then(google.getDirectoryUsers)
    .then(db.upsertUsers)
    // .then(junkdrawer.attachAnniversariesToUsers)
    // .then(junkdrawer.attachBirthdaysToUsers)
    .then(contextIo.redoWebhooks)
    .catch(utils.logError);



  setInterval(function(){
    // resubscribe to the calendar once a day
    db.getSettings().then(google.initCalendarSyncWithSettings);

    // resubscribe to the webhooks once a day
    contextIo.redoWebhooks();

    // update users once a day
    google.getDirectoryUsers()
      .then(db.upsertUsers)
      // .then(junkdrawer.attachAnniversariesToUsers)
      // .then(junkdrawer.attachBirthdaysToUsers);
      .catch(utils.logError);
    }, 86400000);
};
