config.playbackType  = null;
config.playbackSpeed = 10000;


var slides = {
  collection        : [],
  currentIndex      : 0,
  lastPlayed        : null,
  playbackInterval  : null
};


// listen for socket events
var socket = io();
socket.on('update', function(data){
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
});



// listen for click events on the navigation
$(function(){
  $('#navigation a').click(function(e){
    $('#navigation').addClass('hide');
    var type = $(e.target).data('type');
    config.playbackType = type;
    startSlideshow(type);
  });
});



// start the slideshow
var startSlideshow = function(type){
  if(slides.playbackInterval) clearInterval(slides.playbackInterval);

  // go get the asked for collection
  var url = '/api/' + type;
  $.ajax({
    url : url
  }).done(function(collection){
    slides.collection = collection;

    // are there any slides available?
    if(slides.collection[slides.currentIndex]){
      var slide = slides.collection[slides.currentIndex];
      changeSlide({ type : slide.type, id : slide._id });
    }

    // start a repeating interval to change slides
    slides.playbackInterval = setInterval(function(){
      slides.currentIndex++;
      if(!slides.collection[slides.currentIndex])
        slides.currentIndex = 0;

      var slide = slides.collection[slides.currentIndex];
      changeSlide({ type : slide.type, id : slide._id });
    }, config.playbackSpeed);
  });
};



// changes slides
var changeSlide = function(opts){
  var $slide1 = $('.slide-1');
  var $slide2 = $('.slide-2');

  $.ajax({
    url : '/api/' + opts.type + '/' + opts.id
  }).done(function(result){
    var template  = _.template($('script#template-' + opts.type).html());
    var bgImage   = 'url(/' + config.BACKGROUNDS[Math.floor(Math.random()*config.BACKGROUNDS.length)] + ')';
    if($slide1.hasClass('show')){
      $slide2.empty();
      $slide2.html(template(result));
      $slide2.css('background-image', bgImage);
      $slide2.addClass('show');
      $slide1.removeClass('show');
    } else{
      $slide1.empty();
      $slide1.html(template(result));
      $slide1.css('background-image', bgImage);
      $slide1.addClass('show');
      $slide2.removeClass('show');
    }
  });
};



// restart the slideshow once an hour to ensure we're not
// display events which occured in the past
setInterval(function(){
  if(slides.playbackInterval) clearInterval(slides.playbackInterval);
  startSlideshow();
}, 3600000);
