var config = {
  ROOT_URL          : null,
  playbackType      : null,
  playbackSpeed     : 15000
};

var slides = {
  collection        : [],
  currentIndex      : 0,
  lastPlayed        : null,
  playbackInterval  : null
};



// load the default template on launch
App.onLaunch = function(options){
  config.ROOT_URL = options.BASEURL;
  changeSlide({ type : 'navigation' });
};




// listen for socket events
var socketEvent = function(data){
  if(data.type == config.playbackType || config.playbackType == 'mixed'){
    // if the id already exists, then it's an update.
    // Ignore because it will auto update on fetch
    // otherwise, show the update immediately
    var exists = false;
    slides.collection.forEach(function(item){
      if(item._id == data._id) exists = true;
    });

    if(!exists)
      slides.collection.splice(slides.currentIndex + 1, 0, data);
  }
};



// start the slideshow
var startSlideshow = function(){
  if(slides.playbackInterval) clearInterval(slides.playbackInterval);

  // add a loading slide
  slides.lastPlayed = makeLoadingDocument();
  navigationDocument.pushDocument(slides.lastPlayed);

  var url = config.ROOT_URL + '/api/' + config.playbackType;
  fetchCollection(url, function(collection){
    // save the collection and apply the first slide
    slides.collection = collection;
    if(slides.collection[slides.currentIndex]){
      var slide = slides.collection[slides.currentIndex];
      changeSlide({ type : slide.type, id : slide._id });
    }

    // setup a plaback interval
    slides.playbackInterval = setInterval(function(){
      slides.currentIndex++;
      if(!slides.collection[slides.currentIndex])
        slides.currentIndex = 0;

      var slide = slides.collection[slides.currentIndex];
      changeSlide({ type : slide.type, id : slide._id });
    }, config.playbackSpeed);
  });
};



var backButtonHandler = function(){
  if(slides.playbackInterval) clearInterval(slides.playbackInterval);
};



// fetches new TVML documents and handles slide changes
var changeSlide = function(opts){
  var url = [
    config.ROOT_URL, 'tvml', opts.type, opts.id
  ].join('/');

  var request = new XMLHttpRequest();
  request.responseType = 'application/xml';
  request.addEventListener('load', function(){
    if(opts.type == 'navigation'){
      // the navigation document will only be called once
      // so just push it onto the view stack
      var doc = request.responseXML;
      navigationDocument.pushDocument(doc);

      // listen for selections from the carousel
      doc.getElementById('carousel').addEventListener('select', function(e){
        var type = e.target.getAttribute('type');
        config.playbackType = type;
        startSlideshow();
      });
    } else {
      // make sure to first add the new slide
      // give the transition some time to finish
      // then remove the old slide and reassign
      var nextSlide = request.responseXML;
      navigationDocument.pushDocument(nextSlide);

      // listen for a back button press
      nextSlide.addEventListener('unload', backButtonHandler);

      // schedule a removal of the last slide or the loader
      if(slides.lastPlayed) scheduleSlideRemoval(nextSlide);
      else slides.lastPlayed = nextSlide;
    }
  }, false);

  request.open('GET', url, true);
  request.send();
};



// fetches a slide collection
var fetchCollection = function(url, next){
  var request = new XMLHttpRequest();
  request.responseType = 'application/json';
  request.addEventListener('load', function(){
    next(JSON.parse(request.response));
  }, false);
  request.open('GET', url, true);
  request.send();
};



// make a generic loading document
var makeLoadingDocument = function(){
  var str = [
    '<document>',
      '<loadingTemplate>',
        '<activityIndicator>',
          '<title>Loading...</title>',
        '</activityIndicator>',
      '</loadingTemplate>',
    '</document>',
  ].join('');

  var parser  = new DOMParser();
  return parser.parseFromString(str, 'text/xml');
};



var scheduleSlideRemoval = function(nextSlide){
  setTimeout(function(){
    // remove the event handler so it doesn't get called for the wrong slide
    slides.lastPlayed.removeEventListener('unload', backButtonHandler);

    // pressing the back button can sometimes mess us all up
    // just deal with it and don't do anything about it
    try{
      navigationDocument.removeDocument(slides.lastPlayed);
    } catch(e){}

    //
    slides.lastPlayed = nextSlide;
  }, 1000);
};



// restart the slideshow once an hour to ensure we're not
// display events which occured in the past
setInterval(function(){
  if(slides.playbackInterval) clearInterval(slides.playbackInterval);
  startSlideshow();
}, 3600000);
