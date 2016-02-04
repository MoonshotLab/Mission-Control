var google = require('./google');
var utils = require('./utils');



exports.auth = function(req, res){
  res.redirect(google.getAuthUrl());
};



exports.authCallback = function(req, res){
  google.setCredsWithCode(req.query.code, function(err){
    if(err) res.send(err);
    else res.send('logged in!');
  });
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
      to      : email.message_data.addresses.to,
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
      // store the gratitude
    }
  });
};
