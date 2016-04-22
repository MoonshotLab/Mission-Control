var db          = require('./db');
var google      = require('./google');
var utils       = require('./utils');
var junkdrawer  = require('./junkdrawer');



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
    .catch(utils.logError);



  setInterval(function(){
    // resubscribe to the calendar once a day
    db.getSettings().then(google.initCalendarSyncWithSettings);

    // update users once a day
    google.getDirectoryUsers()
      .then(db.upsertUsers)
      // .then(junkdrawer.attachAnniversariesToUsers)
      // .then(junkdrawer.attachBirthdaysToUsers);
    }, 86400000);
};
