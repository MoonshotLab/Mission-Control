$(function(){
  // query from up to one month ago
  var startDate = new Date().getTime()-2592000000;

  $.ajax({
    url : '/gratitudes?startDate=' + startDate
  }).done(function(gratitudes){

    var template = _.template(
      $('script#template-gratitude').html()
    );

    gratitudes.forEach(function(gratitude){
      $('body').append(template(gratitude));
    });
  });

});
