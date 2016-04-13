var db          = require('./lib/db');
var google      = require('./lib/google');
var utils       = require('./lib/utils');
var junkdrawer  = require('./lib/junkdrawer');



exports.run = function(){
  // retrieve the settings and init
  db.connect()
    .then(db.getSettings)
    .then(google.initCalendarSyncWithSettings)
    .then(db.saveSettings)
    .then(google.getDirectoryUsers)
    .then(db.upsertUsers)
    .then(junkdrawer.attachAnniversariesToUsers)
    .then(junkdrawer.attachBirthdaysToUsers)
    .catch(utils.logError);



  setInterval(function(){
    // resubscribe to the calendar once a day
    db.getSettings().then(google.initCalendarSyncWithSettings);

    // update users once a day
    google.getDirectoryUsers()
      .then(db.upsertUsers)
      .then(junkdrawer.attachAnniversariesToUsers)
      .then(junkdrawer.attachBirthdaysToUsers);
  }, 86400000);
};
