// Hero orbit system: skill pills orbit the photo on tilted ellipses, over a
// faint particle halo. Mouse parallax on pointer devices; scrolling flattens
// and fades the system. Without this script the pills keep their static CSS
// positions; with reduced motion it draws one still frame.
(function () {
  'use strict';

  var hero = document.querySelector('.hero-section');
  var visual = document.querySelector('.hero-visual');
  var system = visual && visual.querySelector('.orbit-system');
  if (!hero || !system || !('IntersectionObserver' in window)) return;

  var DEG = Math.PI / 180;
  var PERSPECTIVE = 900;
  var avatarWrap = system.querySelector('.hero-avatar-wrap');
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(pointer: fine)').matches;

  // Each orbit is a horizontal circle tipped `open` degrees toward the viewer,
  // then rotated `tilt` degrees on screen. Pills are dealt round-robin onto the
  // orbits and spaced evenly around each one, so none ever share a position.
  var ORBITS = [
    { radius: 1.00, open: 26, tilt: -16, period: 46 },
    { radius: 1.20, open: 20, tilt: 12, period: 64 },
    { radius: 1.40, open: 30, tilt: 3, period: 82 }
  ];
  var badges = system.querySelectorAll('.hero-badge');
  var pills = [].slice.call(badges).map(function (el, i) {
    var k = i % ORBITS.length;
    var onOrbit = Math.ceil((badges.length - k) / ORBITS.length);
    var slot = Math.floor(i / ORBITS.length);
    return { el: el, orbit: ORBITS[k], phase: slot * 2 * Math.PI / onOrbit + k * 1.3 };
  });

  var canvas = document.createElement('canvas');
  canvas.className = 'orbit-particles';
  canvas.setAttribute('aria-hidden', 'true');
  system.insertBefore(canvas, system.firstChild);
  var ctx = canvas.getContext('2d');
  visual.classList.add('orbits-on');

  var photoRadius, orbitScale, xFit, width, height, dots = [];
  var parallaxX = 0, parallaxY = 0, targetX = 0, targetY = 0;
  var running = false, heroVisible = true;

  function glowSprite(rgb) {
    var c = document.createElement('canvas');
    c.width = c.height = 32;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(' + rgb + ',1)');
    grad.addColorStop(0.25, 'rgba(' + rgb + ',0.55)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return c;
  }
  var warmGlow = glowSprite('255,236,222');
  var accentGlow = glowSprite('232,133,74');

  // Roughly normal, in -1..1: clusters dots around the halo radius.
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }

  function layout() {
    photoRadius = avatarWrap.offsetWidth / 2;
    orbitScale = photoRadius + (innerWidth < 768 ? 48 : 80);
    // On narrow screens, slim the orbits horizontally so the widest pill (~88px) never leaves the screen.
    var box = visual.getBoundingClientRect();
    var centre = box.left + box.width / 2;
    var room = Math.min(centre, innerWidth - centre) - 48;
    xFit = Math.min(1, room / (orbitScale * ORBITS[ORBITS.length - 1].radius));
    width = Math.round(visual.clientWidth * 1.5);
    height = Math.round(visual.clientHeight * 1.45);
    var dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = finePointer && innerWidth >= 768 ? 120 : 70;
    dots = [];
    for (var i = 0; i < count; i++) {
      var far = Math.random() < 0.18;
      dots.push({
        angle: Math.random() * Math.PI * 2,
        radius: far ? photoRadius * (1.9 + Math.random() * 0.9) : photoRadius * (1.45 + gauss() * 0.4),
        size: 0.8 + Math.random() * 1.6,
        alpha: 0.18 + Math.random() * 0.5,
        twinkle: 0.4 + Math.random() * 1.2,
        twinklePhase: Math.random() * Math.PI * 2,
        spin: (Math.random() < 0.5 ? -1 : 1) * (0.004 + Math.random() * 0.012),
        depth: 0.3 + Math.random() * 0.9,
        accent: Math.random() < 0.22
      });
    }
  }

  // 0 with the hero fully in view, 1 once 70% of it has scrolled away.
  function scrollProgress() {
    var r = hero.getBoundingClientRect();
    return Math.min(1, Math.max(0, -r.top / (r.height * 0.7)));
  }

  function placePills(t, p) {
    pills.forEach(function (pill) {
      var o = pill.orbit;
      var angle = pill.phase + t * 2 * Math.PI / o.period;
      var r = orbitScale * o.radius;
      var x = r * Math.cos(angle), zFlat = r * Math.sin(angle);
      var open = o.open * (1 - p) * DEG; // scrolling closes the orbit to edge-on
      var y = zFlat * Math.sin(open), z = zFlat * Math.cos(open);
      var tilt = o.tilt * DEG;
      var sx = (x * Math.cos(tilt) - y * Math.sin(tilt)) * xFit;
      var sy = x * Math.sin(tilt) + y * Math.cos(tilt);
      var scale = PERSPECTIVE / (PERSPECTIVE - z);
      var depth = z / r;                      // -1 behind the photo .. 1 in front
      var shift = 8 + 10 * depth;             // nearer pills move more with the cursor
      pill.el.style.transform = 'translate(-50%,-50%) translate3d(' +
        (sx * scale + parallaxX * shift).toFixed(1) + 'px,' +
        (sy * scale + parallaxY * shift).toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ')';
      pill.el.style.opacity = (0.4 + 0.3 * (depth + 1)).toFixed(2);
      pill.el.style.zIndex = z > 0 ? 3 : 1;
    });
  }

  function drawParticles(t, p) {
    ctx.clearRect(0, 0, width, height);
    var cx = width / 2, cy = height / 2, squash = 0.88 - 0.6 * p, fade = 1 - 0.7 * p;
    var points = dots.map(function (d) {
      var a = d.angle + t * d.spin;
      return {
        x: cx + Math.cos(a) * d.radius + parallaxX * 16 * d.depth,
        y: cy + Math.sin(a) * d.radius * squash + parallaxY * 16 * d.depth,
        alpha: d.alpha * (0.55 + 0.45 * Math.sin(t * d.twinkle + d.twinklePhase)) * fade,
        dot: d
      };
    });

    // Faint constellation lines between near neighbours.
    var reach = photoRadius * 0.55;
    ctx.lineWidth = 0.6;
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var dx = points[i].x - points[j].x, dy = points[i].y - points[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < reach) {
          ctx.strokeStyle = 'rgba(255,214,190,' + ((1 - dist / reach) * 0.11 * fade).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }
    points.forEach(function (pt) {
      var s = pt.dot.size * 3;
      ctx.globalAlpha = pt.alpha;
      ctx.drawImage(pt.dot.accent ? accentGlow : warmGlow, pt.x - s, pt.y - s, s * 2, s * 2);
    });
    ctx.globalAlpha = 1;
  }

  function drawStill() {
    placePills(0, 0);
    drawParticles(0, 0);
  }

  function frame(now) {
    if (!running) return;
    var t = now / 1000;
    parallaxX += (targetX - parallaxX) * 0.05;
    parallaxY += (targetY - parallaxY) * 0.05;
    var p = scrollProgress();
    system.style.transform = 'translate3d(' + (parallaxX * 5).toFixed(1) + 'px,' +
      (parallaxY * 5 + p * 40).toFixed(1) + 'px,0) scale(' + (1 - 0.2 * p).toFixed(3) + ')';
    system.style.opacity = (1 - 0.75 * p).toFixed(3);
    placePills(t, p);
    drawParticles(t, p);
    requestAnimationFrame(frame);
  }

  function updateRunning() {
    var shouldRun = !reduceMotion && heroVisible && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) requestAnimationFrame(frame);
  }

  layout();
  if (reduceMotion) drawStill();

  if (finePointer && !reduceMotion) {
    addEventListener('pointermove', function (e) {
      targetX = (e.clientX / innerWidth - 0.5) * 2;
      targetY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  new IntersectionObserver(function (entries) {
    heroVisible = entries[0].isIntersecting;
    updateRunning();
  }).observe(hero);
  document.addEventListener('visibilitychange', updateRunning);
  addEventListener('resize', function () {
    layout();
    if (reduceMotion) drawStill();
  });
  updateRunning();
})();
