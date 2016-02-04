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
