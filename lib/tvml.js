var path      = require('path');
var fs        = require('fs');
var moment    = require('moment');
var config    = require('../config')();
var db        = require('./db');

var styles    = [
  "tvcs-font:\'GT Walsheim\'",
  "tv-position:top-left",
  "color:rgb(255, 255, 255)",
  " "
].join('; ');



exports.gratitudes = function(id){
  return new Promise(function(resolve, reject){
    db.getRecordById('gratitudes', id).then(function(record){
      var textContent = [
        '<tvce-attributedText style="' + styles + 'margin:102 0 0 194; font-size:49;">GRATITUDES</tvce-attributedText>',
        '<row style="tv-position:top-left; height:781;"><tvce-attributedText style="' + styles + 'width:1538; margin:90 0 0 191; font-size:89;">' + record.body.toUpperCase() + '</tvce-attributedText></row>',
        '<tvce-attributedText style="' + styles + 'margin:0 0 0 1400; font-size:49;">' + record.from.name.toUpperCase() + '</tvce-attributedText>',
      ].join('');

      resolve(createDivDocument(textContent));
    }).catch(function(err){
      reject(createErrorDocument(err));
    });
  });
};



exports.events = function(id){
  return new Promise(function(resolve, reject){
    db.getRecordById('events', id).then(function(record){
      var date        = moment(record.start.dateTime).format('dddd, MMMM Do');
      var startTime   = moment(record.start.dateTime).format('h:mm');
      var endTime     = moment(record.end.dateTime).format('h:mm a');
      var description = [
        date,
        startTime + '-' + endTime + '|' + record.location
      ];

      if(record.rsvpCode){
        description.push([
          'RSVP: Text', record.rsvpCode, 'to', config.PHONE_NUMBER
        ].join(' '));
      }

      var textContent = [
        '<tvce-attributedText style="' + styles + 'margin:102 0 0 191; font-size:49;">ROCKETU</tvce-attributedText>',
        '<tvce-attributedText style="' + styles + 'tvcs-text-decoration:text-shadow; margin:90 0 0 191; font-size:110;">' + record.summary.toUpperCase() + '</tvce-attributedText>',
        '<tvce-attributedText style="' + styles + 'margin:90 0 0 200; font-size:61;">' + description.join('').toUpperCase() + '</tvce-attributedText>',
      ].join('');

      resolve(createDivDocument(textContent));
    }).catch(function(err){
      reject(createErrorDocument(err));
    });
  });
};



exports.navigation = function(){
  return new Promise(function(resolve, reject){
    resolve([
      '<?xml version="1.0" encoding="UTF-8" ?>',
      '<document>',
        '<showcaseTemplate mode="showcase">',
          '<banner>',
            '<tvce-attributedText style="tv-position:top-left; tvcs-font:\'GT Walsheim\'; margin:70 0 0 0; color:rgb(255, 255, 255); font-size:110;">MISSION CONTROL</tvce-attributedText>',
          '</banner>',
          '<carousel id="carousel">',
            '<section>',
              '<lockup type="events">',
                '<img src="' + config.ROOT_URL + '/samples/rocket_u.jpg" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; color:rgb(255, 255, 255); font-size:60;">ROCKETU</tvce-attributedText>',
              '</lockup>',
            '</section>',
            '<section>',
              '<lockup type="gratitudes">',
                '<img src="' + config.ROOT_URL + '/samples/gratitudes.png" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; color:rgb(255, 255, 255); font-size:60;">GRATITUDES</tvce-attributedText>',
              '</lockup>',
            '</section>',
            '<section>',
              '<lockup type="everything">',
                '<img src="' + config.ROOT_URL + '/samples/everything.png" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; color:rgb(255, 255, 255); font-size:60;">EVERYTHING</tvce-attributedText>',
              '</lockup>',
            '</section>',
          '</carousel>',
        '</showcaseTemplate>',
      '</document>'
    ].join(''));
  });
};



var createDivDocument = function(content){
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<document>',
      '<divTemplate>',
        '<lockup>',
          '<img width="1920" height="1080" src="' + getRandomBackgroundUrl() + '" />',
          '<overlay>',
            content,
          '</overlay>',
        '</lockup>',
      '</divTemplate>',
    '</document>'
  ].join(' ');
};



var createErrorDocument = function(data){
  return [
    '<?xml version="1.0" encoding="UTF-8" ?>',
    '<document>',
      '<alertTemplate>',
        '<title>Error :(</title>',
        '<description>',
          data,
        '</description>',
      '</alertTemplate>',
    '</document>'
  ].join(' ');
};



// collect all the available backgrounds from the background directory
var images    = [];
var imagePath = path.join(process.cwd(), 'public/backgrounds');
fs.readdir(imagePath, function(err, fileNames){
  fileNames.forEach(function(fileName){
    if(fileName[0] != '.') images.push(fileName);
  });
});


// get a random background image
var getRandomBackgroundUrl = function(){
  var image = images[Math.floor(Math.random()*images.length)];
  return config.ROOT_URL + '/backgrounds/' + image;
};
