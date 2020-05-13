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

  fetch("https://chasegale.com/contributions.php", {
    headers: {
        'Content-Type': 'text/html',
        'Accept': 'text/html',
    },
    referrerPolicy: 'no-referrer',
    cache: 'no-cache'
  }).then(response => {
      return response.text();
  }).then(html => {
        let template = document.createElement('template');
        template.innerHTML = html;
        
        const contributionsSVG = template.content.querySelector('svg.js-calendar-graph-svg');
        const contributionsDOM = document.getElementById('contributions');

        // Remove weekdays
        contributionsSVG.querySelectorAll('text.wday').forEach(txt => txt.remove());

        // Animate month names
        contributionsSVG.querySelectorAll('text.month').forEach((txt, idx) => {
            // CSS3 Selectors have a problem with SVG 'text' elements, js now forcing the spear
            txt.style.animationDelay = `${150 + (50 * idx)}ms`;
        });
        
        // We have better plans than the hard-coded transform, ditch it
        contributionsSVG.firstElementChild.removeAttribute('transform');

        contributionsDOM.appendChild(contributionsSVG);
  }).catch(err => {
    console.error(err);
  });

})(jQuery);