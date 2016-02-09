var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var io = require('socket.io')(server);
var config = require('./config')();
var routes = require('./lib/routes');
var db = require('./lib/db');
var google = require('./lib/google');
var utils = require('./lib/utils');


// express setup
console.log('server running on port 3000');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
server.listen('3000');


// retrieve the settings and init
db.connect()
	.then(db.getSettings)
	.then(google.initCalendarSyncWithSettings)
	.then(db.saveSettings)
	.catch(utils.handleError);



// auth
app.get('/auth', routes.auth);
app.get('/auth-callback', routes.authCallback);

// api
app.get('/events', routes.events);
app.get('/gratitudes', routes.gratitudes);

// external services
app.post('/new-email', routes.newEmail);
app.post('/calendar-update', routes.calendarUpdate);

app.post('/new-text-message', function(req, res){
	var userInput = req.body.Body.toLowerCase();
	var message;

	if(userInput.indexOf("iot")!= -1){
		message = "You signed up for Internet of Things!";
	}
	if(userInput.indexOf("make")!= -1){
		message = "You signed up for Make!";
	}
	if(userInput.indexOf("3d")!= -1 || userInput.indexOf("3-d")!= -1){
		message = "You signed up for 3-D printing!";
	}
	res.setHeader("Content-Type", "text/xml");
	res.send('<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<Response><Message>' + message + '</Message></Response>');
});


app.get('/new-calendar-item', function(req, res){
  io.sockets.emit('new-calendar-item', req.query);
  res.send(req.query);
});
