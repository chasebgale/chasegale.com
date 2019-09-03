(function($){
	
	$('.entry-content').each(function(i){
    $(this).find('img').each(function(){
      if ($(this).parent().hasClass('fancybox')) return;

      var alt = this.alt;

      $(this).wrap('<a href="' + this.src + '" title="' + alt + '" class="fancybox"></a>');
    });

    $(this).find('.fancybox').each(function(){
      $(this).attr('rel', 'article' + i);
    });
  });

	if ($.fancybox){
    $('.fancybox').fancybox();
  }

  $(".mobile-nav-panel").click(function() {
    $(".nav").toggleClass("active")
  });

  let now = new Date();
  $("#experience").text(now.getUTCFullYear() - 2001);

})(jQuery);