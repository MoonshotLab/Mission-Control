$(function(){
  $.ajax({
    url : '/gratitudes'
  }).done(function(gratitudes){

    var template = _.template(
      $('script#template-gratitude').html()
    );

    gratitudes.forEach(function(gratitude){
      $('body').append(template(gratitude));
    });

  });
});
