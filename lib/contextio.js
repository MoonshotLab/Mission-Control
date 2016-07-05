var ContextIO = require('contextio');
var config    = require('../config')();


var client = ContextIO({
  key       : config.CONTEXTIO_KEY,
  secret    : config.CONTEXTIO_SECRET,
  version   : 'lite'
});



// for some reason the context.io webhook just stops working
// after a week or so. This re-establishes it
exports.redoWebhooks = function(){
  return new Promise(function(resolve, reject){
    client.users().get().then(function(users){
      users.forEach(function(user){
        if(user.first_name == 'Cristina' &&
        user.last_name == 'Martinez'){
          deleteExistingWebHooks(user.id, function(){
            startWebhook(user.id);
            resolve();
          });
        }
      });
    });
  });
};



var startWebhook = function(userId){
  client.users(userId).webhooks().post({
    callback_url      : config.ROOT_URL + '/gratitude/new',
    failure_notif_url : config.ROOT_URL + '/gratitude/error',
    filter_to         : 'gratitudes@barkleyus.com',
    include_body      : 1
  });
};



// delete all existing webhooks
var deleteExistingWebHooks = function(userId, next){
  var completions = 0;

  client.users(userId).webhooks().get().then(function(hooks){
    if(hooks.length === 0) next();
    hooks.forEach(function(hook){

      client.users(userId).webhooks(hook.webhook_id).delete().then(function(res){
        completions++;
        if(completions == hooks.length) next();
      });
    });
  });
};
