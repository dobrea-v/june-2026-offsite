/*
 * Scroll-journey widget — "Scroll yourself sharp".
 * Mounts the intro → sticky scrollytelling → outro into a container. The scroll mechanic
 * is the original prototype, unchanged: scroll drives 40 "sessions", a blurry menu sharpens,
 * the glasses slide away, and a rail tracks progress.
 *
 * Usage:
 *   <link rel="stylesheet" href="scroll-journey.css">
 *   <div id="journey"></div>
 *   <script src="scroll-journey.js"></script>
 *   <script>OryxJourney.mount('#journey', { nextHref: '#assess', nextLabel: 'Test your own vision' });</script>
 *
 * opts.nextHref  : where the outro's primary CTA points (default '#assess').
 * opts.nextLabel : the outro CTA label (default 'Test your own vision').
 */
(function (global) {
  'use strict';

  function template(opts) {
    var nextHref = opts.nextHref || '#assess';
    var nextLabel = opts.nextLabel || 'Test your own vision';
    return '' +
    '<section class="intro">' +
      '<div class="wordmark">oryx<sup>™</sup></div>' +
      '<span class="eyebrow">It’s not rocket science. It’s neuroscience.</span>' +
      '<h1>Lose the readers. <span class="accent">Keep the clarity.</span></h1>' +
      '<p>Right now, the only sharp part of the menu is behind your reading glasses. ' +
        'Keep scrolling — every scroll is a training session, and your eyes are about to take over.</p>' +
      '<div class="scroll-hint" id="scrollHint"><span>Scroll to train</span><div class="chevron"></div></div>' +
    '</section>' +

    '<section class="journey" id="journey">' +
      '<div class="sticky">' +
        '<div class="vision-stage" id="stage">' +
          '<span class="acuity-badge" id="acuityBadge">Glasses doing 100%</span>' +
          '<div class="menu-layer" id="blurryLayer">' + menuCard() + '</div>' +
          '<div class="menu-layer" id="sharpLayer" aria-hidden="true">' + menuCard() + '</div>' +
          glassesSvg() +
        '</div>' +
        '<div class="hud">' +
          '<div class="hud-top">' +
            '<span class="rail-label">Training timeline</span>' +
            '<span class="session-label" id="sessionLabel">Session 1</span>' +
          '</div>' +
          '<div class="rail" id="rail">' +
            '<div class="fill" id="railFill"></div>' +
            '<div class="playhead" id="railHead"></div>' +
            '<div class="tick" data-at="0"   style="left: 0%"></div>' +
            '<div class="tick" data-at="25"  style="left: 25%"></div>' +
            '<div class="tick" data-at="50"  style="left: 50%"></div>' +
            '<div class="tick" data-at="75"  style="left: 75%"></div>' +
            '<div class="tick" data-at="100" style="left: 100%"></div>' +
          '</div>' +
          '<div class="tick-labels">' +
            '<span data-at="0">Session 1</span><span data-at="25">Session 10</span>' +
            '<span data-at="50">Session 20</span><span data-at="75">Session 30</span>' +
            '<span data-at="100">Session 40</span>' +
          '</div>' +
          '<p class="beat" id="beatText"></p>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="outro">' +
      '<h2>See close. <span class="accent">Go far.</span></h2>' +
      '<p>That was 40 sessions — about ten minutes a day. No glasses, no surgery, ' +
        'just your brain learning to see sharp again. Now find out where your eyes stand today.</p>' +
      '<a class="cta" href="' + nextHref + '">' + nextLabel + ' <span class="arrow">↓</span></a>' +
      '<button class="replay" type="button" data-replay>Replay the journey</button>' +
    '</section>';
  }

  function menuCard() {
    return '<div class="menu-card">' +
      '<div class="restaurant">CHEZ LUMIÈRE</div>' +
      '<div class="sub">Bistro · Est. 1987</div>' +
      '<div class="dish"><span>Seared scallops, brown butter</span><span class="dots"></span><span class="price">24</span></div>' +
      '<div class="dish"><span>Wild mushroom tagliatelle</span><span class="dots"></span><span class="price">19</span></div>' +
      '<div class="dish"><span>Duck confit, cherry jus</span><span class="dots"></span><span class="price">28</span></div>' +
      '<div class="dish"><span>Crème brûlée</span><span class="dots"></span><span class="price">9</span></div>' +
      '<p class="fineprint">Ask your server about tonight’s specials. A discretionary 12.5% service ' +
        'charge is added to tables of six or more. Please tell us about allergies — ' +
        'our kitchen handles nuts, gluten and shellfish.</p>' +
    '</div>';
  }

  function glassesSvg() {
    return '<svg id="glasses" viewBox="0 0 300 110" aria-hidden="true">' +
      '<path d="M20,42 L4,30" stroke="#221c33" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<path d="M280,42 L296,30" stroke="#221c33" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<path d="M126,44 Q150,28 174,44" stroke="#221c33" stroke-width="7" fill="none"/>' +
      '<rect x="18" y="16" width="108" height="78" rx="32" fill="rgba(255,255,255,0.07)" stroke="#221c33" stroke-width="7"/>' +
      '<rect x="174" y="16" width="108" height="78" rx="32" fill="rgba(255,255,255,0.07)" stroke="#221c33" stroke-width="7"/>' +
      '<path d="M38,32 Q52,22 70,24" stroke="rgba(255,255,255,0.55)" stroke-width="4" stroke-linecap="round" fill="none"/>' +
      '<path d="M194,32 Q208,22 226,24" stroke="rgba(255,255,255,0.55)" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '</svg>';
  }

  function wire(root) {
    var q = function (sel) { return root.querySelector(sel); };
    var journey    = q('#journey');
    var stage      = q('#stage');
    var blurry     = q('#blurryLayer');
    var sharp      = q('#sharpLayer');
    var glasses    = q('#glasses');
    var badge      = q('#acuityBadge');
    var sessionEl  = q('#sessionLabel');
    var railFill   = q('#railFill');
    var railHead   = q('#railHead');
    var beatText   = q('#beatText');
    var scrollHint = q('#scrollHint');
    var ticks      = [].slice.call(root.querySelectorAll('.tick'))
                       .concat([].slice.call(root.querySelectorAll('.tick-labels span')));

    var MAX_BLUR = 7;
    var TOTAL_SESSIONS = 40;
    var SLIDE_START = 0.474;  // glasses begin sliding away ~30% into the scroll (eased t at raw 0.30)

    var beats = [
      { at: 0,   msg: 'Session 1 — the menu is sharp <strong>only through your readers</strong>. Everything else is a guess.' },
      { at: 25,  msg: 'Ten sessions in — the world <strong>outside the lenses</strong> is starting to sharpen.' },
      { at: 50,  msg: 'Halfway. You catch yourself <strong>reading past the rims</strong> without noticing.' },
      { at: 75,  msg: 'Thirty sessions: the lenses <strong>barely matter anymore</strong>. Your eyes are doing the work.' },
      { at: 100, msg: '<strong>The glasses slide away — you don’t need them.</strong> See close. Go far.' }
    ];
    var currentBeat = -1;

    function beatFor(value) {
      var idx = 0;
      beats.forEach(function (b, i) { if (value >= b.at) idx = i; });
      return idx;
    }

    var VB = { w: 300, h: 110, lensCx: [72, 228], lensCy: 55, lensRx: 54, lensRy: 39 };
    var geo = null;

    function layoutGlasses() {
      var W = stage.clientWidth;
      var H = stage.clientHeight;
      var gw = W < 560 ? W * 0.74 : Math.min(W * 0.58, 400);
      var scale = gw / VB.w;
      var gh = VB.h * scale;
      var cx = W * 0.5;
      var cy = H * 0.46;

      glasses.style.width  = gw + 'px';
      glasses.style.height = gh + 'px';
      glasses.style.left   = (cx - gw / 2) + 'px';
      glasses.style.top    = (cy - gh / 2) + 'px';

      geo = {
        rx: VB.lensRx * scale * 0.94,
        ry: VB.lensRy * scale * 0.94,
        centers: VB.lensCx.map(function (x) { return [cx + (x - VB.w / 2) * scale, cy]; })
      };
      var m = geo.centers.map(function (c) {
        return 'radial-gradient(ellipse ' + geo.rx + 'px ' + geo.ry + 'px at ' + c[0] + 'px ' + c[1] + 'px, #000 96%, transparent 100%)';
      }).join(', ');
      sharp.style.webkitMaskImage = m;
      sharp.style.maskImage = m;
    }

    function scrollProgress() {
      var rect = journey.getBoundingClientRect();
      var total = journey.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -rect.top / total));
    }

    function render() {
      var raw = scrollProgress();
      var value = raw * 100;
      var t = 1 - Math.pow(1 - raw, 1.8);

      blurry.style.filter = 'blur(' + (MAX_BLUR * (1 - t)).toFixed(2) + 'px)';

      var slide = Math.max(0, (t - SLIDE_START) / (1 - SLIDE_START));
      var ease = slide * slide * (3 - 2 * slide);
      glasses.style.transform = 'translateY(' + (ease * 180) + 'px) rotate(' + (ease * 14) + 'deg)';
      glasses.style.opacity = String(1 - Math.max(0, (ease - 0.45) / 0.55));
      sharp.style.opacity = String(1 - ease);

      var n = Math.max(1, Math.round(raw * TOTAL_SESSIONS));
      sessionEl.textContent = 'Session ' + n;
      railFill.style.width = value + '%';
      railHead.style.left = value + '%';
      badge.textContent = 'Glasses doing ' + Math.max(0, Math.round((1 - t) * 100)) + '%';

      var idx = beatFor(value);
      if (idx !== currentBeat) {
        currentBeat = idx;
        beatText.style.opacity = '0';
        setTimeout(function () {
          beatText.innerHTML = beats[idx].msg;
          beatText.style.opacity = '1';
        }, 180);
      }

      ticks.forEach(function (el) {
        el.classList.toggle('reached', value >= parseFloat(el.dataset.at));
      });

      scrollHint.style.opacity = (raw > 0.01 || scrollY > 60) ? '0' : '1';
    }

    var pending = false;
    function onScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { render(); pending = false; });
    }
    addEventListener('scroll', onScroll, { passive: true });

    var resizeTimer;
    addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { layoutGlasses(); render(); }, 150);
    });

    var replay = root.querySelector('[data-replay]');
    if (replay) replay.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    layoutGlasses();
    render();
  }

  var OryxJourney = {
    mount: function (target, opts) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) throw new Error('OryxJourney.mount: target not found: ' + target);
      el.classList.add('oryx-journey');
      el.innerHTML = template(opts || {});
      wire(el);
      return el;
    }
  };

  global.OryxJourney = OryxJourney;
})(typeof window !== 'undefined' ? window : this);
