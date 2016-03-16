var express = require('express');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var config = require('./config')();
var routes = require('./lib/routes');
var db = require('./lib/db');
var google = require('./lib/google');
var utils = require('./lib/utils');
var socket = require('./lib/socket');
socket.init(server);


// express setup
console.log('server running on port 3000');
app.use(function(req, res, next){
  res.setHeader('Cache-Control', 'no-cache');
  return next();
});
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
server.listen('3000');


// retrieve the settings and init
db.connect()
	.then(db.getSettings)
	.then(google.initCalendarSyncWithSettings)
	.then(db.saveSettings)
	.then(google.getDirectoryUsers)
	.then(db.upsertUsers)
	.catch(utils.handleError);

// resubscribe to the calendar once a day
setInterval(function(){
	db.getSettings().then(google.initCalendarSyncWithSettings);
}, 86400);



// auth
app.get('/auth', routes.auth);
app.get('/auth-callback', routes.authCallback);

// api
app.get('/api/events', routes.events);
app.get('/api/gratitudes', routes.gratitudes);
app.get('/api/user', routes.user);

// views
app.get('/tvml/:type/:id', routes.tvml);
app.get('/:page', routes.view);

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
