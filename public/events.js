window.countIndex = -1;
window.events     = [];


// hide and show the gratitudes
var displayEvent = function(event){
  var template = _.template(
    $('script#template-event').html()
  );

  $('#event-container').empty();
  $('#event-container').html(template(event));
};



// start play mode
var playEvent = function(){
  // increment or reset the counter if there are no more gratitudes
  window.countIndex++;
  if(!window.events[window.countIndex]){
    window.countIndex = 0;
  }

  // show it
  displayEvent(window.events[window.countIndex]);
};



$(function(){
  // request all the events in the future
  $.ajax({
    url : '/api/events?future=true'
  }).done(function(result){
    window.events = result;
    playEvent();
    setInterval(playEvent, 5000);
  });
});
