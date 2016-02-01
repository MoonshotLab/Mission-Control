var googleAuth = require('./google-auth');


exports.auth = function(req, res){
  res.redirect(googleAuth.getAuthUrl());
};


exports.authCallback = function(req, res){
  googleAuth.setCredsWithCode(req.query.code, function(err){
    if(err) res.send(err);
    else res.send('logged in!');
  });
};


exports.users = function(req, res){
  googleAuth.getDirectoryUsers(function(err, users){
    res.send(users);
  });
};
