var io;

exports.init = function(server){
   io = require('socket.io')(server);
};

exports.emit = function(eventName, data){
  io.emit(eventName, data);
};
