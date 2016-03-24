var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require('path');
var bodyParser = require('body-parser');
var config = require('./config')();
var routes = require('./lib/routes');
var db = require('./lib/db');
var google = require('./lib/google');
var utils = require('./lib/utils');
var socket = require('./lib/socket');
var session = require('express-session');
var MongoSession = require('connect-mongodb-session')(session);
socket.init(server);


// express setup
utils.log(1, 'server running on port ' + config.PORT);
app.use(function(req, res, next){
  res.setHeader('Cache-Control', 'no-cache');
  return next();
});
app.use(session({
  secret : config.SESSION_SECRET,
  store  : new MongoSession({
     uri        : config.DB_CONNECT,
     collection : 'sessions'
  })
}));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'public'));
app.set('view engine', 'jade');
server.listen(config.PORT);


// retrieve the settings and init
db.connect()
	.then(db.getSettings)
	.then(google.initCalendarSyncWithSettings)
	.then(db.saveSettings)
	.then(google.getDirectoryUsers)
	.then(db.upsertUsers)
	.catch(utils.logError);

// resubscribe to the calendar once a day
setInterval(function(){
	db.getSettings().then(google.initCalendarSyncWithSettings);
}, 86400000);



// auth
app.get('/auth', routes.auth);
app.get('/auth-callback', routes.authCallback);

// api
app.get('/api/events', routes.events);
app.get('/api/gratitudes', routes.gratitudes);
app.get('/api/mixed', routes.mixed);
app.get('/api/user', routes.user);
app.get('/api/events/:id', routes.event);
app.get('/api/gratitudes/:id', routes.gratitude);

// views
app.get('/tvml/:type', routes.tvml);
app.get('/tvml/:type/:id', routes.tvml);
app.get('/', routes.slideshow);

// external services
app.post('/gratitude/new', routes.newGratitude);
app.post('/rsvp/new', routes.newRsvp);
app.post('/events/update', routes.updateCalendar);
app.post('/voice', routes.voiceResponse);
