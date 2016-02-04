var googleAuth = require('./google-auth');
var utils = require('./utils');


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


exports.newEmail = function(req, res){

  var body = '';
  req.on('data', function(chunk){
    body += chunk;
  });

  req.on('end', function(){
    var contextObject = JSON.parse(body);
    var email = {
      from    : contextObject.message_data.addresses.from,
      to      : contextObject.message_data.addresses.to,
      subject : contextObject.message_data.subject,
      body    : utils.cleanEmailBody(contextObject.message_data.bodies[0].content)
    };

    console.log('New Email:', email);
  });
};
