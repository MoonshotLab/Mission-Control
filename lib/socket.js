var utils = require('./utils');
var io;

exports.init = function(server){
  utils.log(1, 'socket.io ready');
  io = require('socket.io')(server);
};

exports.emit = function(eventName, data){
  utils.log(3, 'socket event ' + eventName, data);
  io.emit(eventName, data);
};
