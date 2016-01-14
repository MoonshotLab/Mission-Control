var socket = io();
socket.on('new-calendar-item', function(data){
  console.log(data);
});
