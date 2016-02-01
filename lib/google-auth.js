var google = require('googleapis');
var config = require('../config')();

var OAuth2        = google.auth.OAuth2;
var directory     = google.admin('directory_v1');
var redirectUrl   = config.ROOT_URL + '/auth-callback';
var oauth2Client  = new OAuth2(
  config.GOOGLE_ID, config.GOOGLE_SECRET, redirectUrl
);


exports.getAuthUrl = function(){
  return oauth2Client.generateAuthUrl({
    access_type : 'offline',
    scope       : 'https://www.googleapis.com/auth/admin.directory.user.readonly'
  });
};



exports.setCredsWithCode = function(code, next){
  oauth2Client.getToken(code, function(err, tokens) {
    if(!err) oauth2Client.setCredentials(tokens);
    next(err, null);
  });
};



exports.getDirectoryUsers = function(next){
  var query = {
    domain  : 'barkleyus.com',
    auth    : oauth2Client
  };

  directory.users.list(query, next);
};
