var socket = io();
socket.on('new-calendar-item', function(data){

  $('h1').text(data.title);
  $('h2').text(data.date);
  $('p').text(data.description);
});


