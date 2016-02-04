// NOTE: this is kind of a weird way of doing this, but emails with images
// come in like - [image: Inline image 1] - where 1 is incremented with each
// image. This loops over and rips images out
exports.cleanEmailBody = function(text){
  var clean = text;
  for(var i=0; i<25; i++){
    clean = clean.replace('[image: Inline image ' + i +']', '');
  }
  return clean;
};



exports.countCharacters = function(string){
  var stringWithoutNewLines = string.replace(/\r?\n/g, '');
  return stringWithoutNewLines.length;
};



exports.generateBase64EncodedEmail = function(opts){
  var emailContent = [];
  emailContent.push('From: \"Barkley Gratitudes\" <gratitudes@barkleyus.com>');
  emailContent.push('To: ' + opts.toAddress);
  emailContent.push('Content-type: text/html;charset=iso-8859-1');
  emailContent.push('MIME-Version: 1.0');
  emailContent.push('Subject: ' + opts.subject);
  emailContent.push('');
  emailContent.push(opts.body);

  var email = emailContent.join('\r\n').trim();
  var base64EncodedEmail = new Buffer(email).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_');

  return base64EncodedEmail;
};
