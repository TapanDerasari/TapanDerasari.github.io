// Page behaviours: go-to-top button, nav shadow, skill-bar fill.
// Loaded with `defer`; everything degrades to static content without it.
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) return;

  // Show go-to-top and the nav shadow once the hero is out of view.
  var header = document.querySelector('header.hero-section');
  var nav = document.getElementById('main-nav');
  var toTop = document.querySelector('.js-top');
  if (header) {
    new IntersectionObserver(function (entries) {
      var pastHero = !entries[0].isIntersecting;
      if (toTop) toTop.classList.toggle('active', pastHero);
      if (nav) nav.classList.toggle('scrolled', pastHero);
    }).observe(header);
  }

  // Grow skill bars from 0 to their CSS width the first time Skills is seen.
  var skills = document.getElementById('fh5co-skills');
  if (skills) {
    var bars = skills.querySelectorAll('.skill-bar-fill');
    bars.forEach(function (bar) { bar.style.width = '0%'; });
    var skillsObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      skillsObserver.disconnect();
      bars.forEach(function (bar, i) {
        setTimeout(function () { bar.style.width = ''; }, 80 * i);
      });
    }, { threshold: 0.15 });
    skillsObserver.observe(skills);
  }
})();
