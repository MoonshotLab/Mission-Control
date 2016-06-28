var path      = require('path');
var fs        = require('fs');
var moment    = require('moment-timezone');
var config    = require('../config')();
var db        = require('./db');
var utils     = require('./utils');

var styles    = [
  "tvcs-font:\'GT Walsheim\'",
  "tv-position:top-left",
  "color:rgb(255, 255, 255)",
  " "
].join('; ');



exports.gratitudes = function(id){
  utils.log(3, 'creating gratitude tvml', id);

  return new Promise(function(resolve, reject){
    db.getRecordById('gratitudes', id).then(function(record){
      var textContent = [
        '<tvce-attributedText style="' + styles + 'margin:102 0 0 194; font-size:49;">GRATITUDES</tvce-attributedText>',
        '<row style="tv-position:top-left; height:771;"><tvce-attributedText style="' + styles + 'width:1538; margin:100 0 0 191; font-size:80;">' + record.body.toUpperCase() + '</tvce-attributedText></row>',
        '<tvce-attributedText style="' + styles + 'margin:0 0 0 1400; font-size:49;">' + record.from.name.toUpperCase() + '</tvce-attributedText>',
      ].join('');

      resolve(createDivDocument(textContent));
    }).catch(function(err){
      reject(createErrorDocument(err));
    });
  });
};



exports.events = function(id){
  utils.log(3, 'creating event tvml', id);

  return new Promise(function(resolve, reject){
    db.getRecordById('events', id).then(function(record){
      var date        = moment(record.start.dateTime).tz('America/Chicago').format('dddd, MMMM Do');
      var startTime   = moment(record.start.dateTime).tz('America/Chicago').format('h:mm');
      var endTime     = moment(record.end.dateTime).tz('America/Chicago').format('h:mm a');
      var timeLoc     = startTime + '-' + endTime;
      if(record.location)
        timeLoc = timeLoc + ' | ' + record.location;
      var details     = [date, timeLoc];

      if(record.rsvpcode){
        details.push([
          'RSVP: Text', record.rsvpcode, 'to', config.PHONE_NUMBER
        ].join(' '));
      }

      var textContent = [
        '<tvce-attributedText style="' + styles + 'width:1538; margin:102 0 0 191; font-size:49;">CALENDAR</tvce-attributedText>',
        '<tvce-attributedText style="' + styles + 'width:1538; tvcs-text-decoration:text-shadow; margin:70 0 0 191; font-size:110;">' + record.summary.toUpperCase() + '</tvce-attributedText>',
        '<tvce-attributedText style="' + styles + 'width:1538; margin:40 0 0 200; font-size:61;">' + details.join('\n').toUpperCase() + '</tvce-attributedText>',
      ];

      if(record.description){
        textContent.push(
          '<tvce-attributedText style="' + styles + 'width:1538; margin:50 0 0 200; font-size:33;">' + record.description.toUpperCase() + '</tvce-attributedText>'
        );
      }

      if(record.maxattendees){
        var spotsLeft = record.maxattendees - record.attendees.length;
        textContent.push(
          '<tvce-attributedText style="' + styles + 'tv-position:bottom-right; margin:0 190 98 1400; font-size:49;">' + spotsLeft + ' SPOTS LEFT</tvce-attributedText>'
        );
      }

      resolve(createDivDocument(textContent.join('')));
    }).catch(function(err){
      reject(createErrorDocument(err));
    });
  });
};



exports.navigation = function(){
  utils.log(3, 'creating navigation tvml');

  return new Promise(function(resolve, reject){
    resolve([
      '<?xml version="1.0" encoding="UTF-8" ?>',
      '<document>',
        '<showcaseTemplate mode="showcase">',
          '<carousel id="carousel">',
            '<section>',
              '<lockup type="events">',
                '<img src="' + config.ROOT_URL + '/samples/calendar.jpg" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; font-size:60;">CALENDAR</tvce-attributedText>',
              '</lockup>',
            '</section>',
            '<section>',
              '<lockup type="gratitudes">',
                '<img src="' + config.ROOT_URL + '/samples/gratitudes.png" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; font-size:60;">GRATITUDES</tvce-attributedText>',
              '</lockup>',
            '</section>',
            '<section>',
              '<lockup type="mixed">',
                '<img src="' + config.ROOT_URL + '/samples/everything.png" />',
                '<tvce-attributedText style="tvcs-font:\'GT Walsheim\'; font-size:60;">MIX</tvce-attributedText>',
              '</lockup>',
            '</section>',
          '</carousel>',
        '</showcaseTemplate>',
      '</document>'
    ].join(''));
  }).catch(function(err){
    reject(createErrorDocument(err));
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



// get a random background image
var bgImages = [];
utils.getAllBackgroundImages().then(function(images){
  bgImages = images;
});

var getRandomBackgroundUrl = function(){
  var image = bgImages[Math.floor(Math.random()*bgImages.length)];
  return config.ROOT_URL + '/' + image;
};
