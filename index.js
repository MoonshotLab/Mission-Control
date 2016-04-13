var express       = require('express');
var app           = express();
var server        = require('http').createServer(app);
var path          = require('path');
var bodyParser    = require('body-parser');
var config        = require('./config')();
var routes        = require('./lib/routes');
var utils         = require('./lib/utils');
var session       = require('express-session');
var MongoSession  = require('connect-mongodb-session')(session);


// initialize socket
var socket = require('./lib/socket');
socket.init(server);


// connect to the db and run the background tasks
var jobs = require('./lib/jobs');
jobs.run();


// express setup
utils.log(1, 'server running on port ' + config.PORT);
app.use(function(req, res, next){
  res.setHeader('Cache-Control', 'no-cache');
  return next();
});
app.use(session({
  secret : config.SESSION_SECRET,
  resave : false,
  saveUninitialized : false,
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



// auth
app.get('/auth', routes.auth);
app.get('/auth-callback', routes.authCallback);

// api
app.get('/api/events', routes.events);
app.get('/api/gratitudes', routes.gratitudes);
app.get('/api/birthdays', routes.birthdays);
app.get('/api/anniversaries', routes.anniversaries);
app.get('/api/mixed', routes.mixed);
app.get('/api/events/:id', routes.event);
app.get('/api/gratitudes/:id', routes.gratitude);
app.get('/api/users', routes.users);

// views
app.get('/tvml/:type', routes.tvml);
app.get('/tvml/:type/:id', routes.tvml);
app.get('/', routes.slideshow);

// external services
app.post('/gratitude/new', routes.newGratitude);
app.post('/gratitude/error', routes.gratitudeError);
app.post('/rsvp/new', routes.newRsvp);
app.post('/events/update', routes.updateCalendar);
app.post('/voice', routes.voiceResponse);
