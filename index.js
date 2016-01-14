var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');

// express setup
console.log('server running on port 3000');
app.use(bodyParser.urlencoded({ extended: true }));
server.listen('3000');
