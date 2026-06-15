/*
 * Oryx Near-Vision Assessment — self-contained funnel widget (vanilla JS, no build step).
 *
 * Web adaptation of the printed A4 "Oryx-Test" reading chart. Because a browser is an
 * uncalibrated environment (unknown screen size / DPI / viewing distance), every result is
 * framed as INDICATIVE, never clinical — matching the claims-discipline note in the offsite doc.
 *
 * Funnel: intro -> reading test (pick smallest comfortable line) -> email gate -> result + clinic CTA.
 *
 * Usage:
 *   <div id="oryx"></div>
 *   <script src="oryx-assessment.js"></script>
 *   <script>OryxAssessment.mount('#oryx', { endpoint: '/api/leads' });</script>
 *
 * mount(target, opts)
 *   target  : CSS selector string or Element
 *   opts.endpoint   : optional URL to POST captured leads to ({email, line, fraction, ts}).
 *                     If omitted, leads are stored in localStorage (demo mode).
 *   opts.clinicUrl  : "Find a partner clinic" CTA target (default oryxneuro.com).
 *   opts.learnUrl   : "Learn more" CTA target (default oryxneuro.com).
 *   opts.onLead     : optional callback(lead) fired after capture.
 */
(function (global) {
  'use strict';

  // Reading ladder. `size` (px) is roughly proportional to the Snellen denominator so the
  // visual step-down mirrors the printed sheet. A1 is bold, matching the original design.
  var LINES = [
    { code: 'A1', frac: '6/30',  size: 34, weight: 700, age: '70+', text: 'You notice bold headlines before your morning coffee' },
    { code: 'A2', frac: '6/24',  size: 28, weight: 500, age: '65',  text: 'Magazine cover titles catch your eye at the checkout' },
    { code: 'A3', frac: '6/19',  size: 23, weight: 500, age: '60',  text: 'Large-print titles you’d read in a marketing brochure' },
    { code: 'A4', frac: '6/15',  size: 19, weight: 500, age: '55',  text: 'Newspaper articles you used to hold a little further away' },
    { code: 'A5', frac: '6/12',  size: 16, weight: 500, age: '50',  text: 'The body text you find in most printed novels' },
    { code: 'A6', frac: '6/9.5', size: 13, weight: 500, age: '45',  text: 'Smaller magazine columns that demand steady, controlled focus' },
    { code: 'A7', frac: '6/7.5', size: 11, weight: 500, age: '40',  text: 'Detailed product descriptions printed on everyday packaging' },
    { code: 'A8', frac: '6/6',   size: 9,  weight: 500, age: '32',  text: 'Ingredient lists on the back of food labels' },
    { code: 'A9', frac: '6/4.8', size: 7.5, weight: 500, age: '25', text: 'Pharmacy dosage instructions on medication packs' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // In-page anchors (e.g. '#clinics') stay in the same tab so the funnel scrolls;
  // external links open in a new tab.
  function linkAttrs(href) {
    return /^#/.test(String(href)) ? '' : ' target="_blank" rel="noopener"';
  }

  function OryxWidget(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.clinicUrl = this.opts.clinicUrl || 'https://oryxneuro.com';
    this.learnUrl = this.opts.learnUrl || 'https://oryxneuro.com';
    this.state = 'intro';   // intro | test | capture | result
    this.selectedIndex = -1;
    this.lead = null;
    this.handheld = this.detectHandheld();
    // Test presentation: 'chart' shows all 9 lines at once (best on desktop);
    // 'steps' shows one line at a time with a yes/no (best on phones, no scrolling /
    // long-sentence wrapping); 'auto' picks steps on handhelds, chart otherwise.
    this.mode = this.opts.mode || 'auto';
    this.stepIndex = 0;     // line currently shown in steps mode
    this.lastYes = -1;      // smallest line answered "yes" so far
    this._viewport = this.captureViewport();
    this.root.classList.add('oryx-assess');
    this.render();
  }

  OryxWidget.prototype.useSteps = function () {
    return this.mode === 'steps' || (this.mode === 'auto' && this.handheld);
  };

  OryxWidget.prototype.resetTest = function () {
    this.stepIndex = 0;
    this.lastYes = -1;
  };

  // ----- mobile helpers -----
  OryxWidget.prototype.detectHandheld = function () {
    try { return window.matchMedia('(max-width: 600px), (pointer: coarse)').matches; }
    catch (e) { return false; }
  };

  // Distance guidance differs by device: a phone is held closer than a laptop.
  OryxWidget.prototype.distanceText = function () {
    return this.handheld
      ? 'about <b>30&ndash;35&nbsp;cm</b> (a relaxed reading distance)'
      : 'about <b>40&nbsp;cm (16&nbsp;in)</b>';
  };

  OryxWidget.prototype.captureViewport = function () {
    var m = document.querySelector('meta[name=viewport]');
    return { meta: m, created: false, prev: m ? m.getAttribute('content') : null };
  };

  // Lock pinch-zoom during the reading test so users can't zoom tiny text and skew
  // the result. NOTE: iOS Safari may ignore user-scalable=no for accessibility; this
  // still applies on Android/Chrome and signals intent. The page's original viewport
  // is always restored when we leave the test step.
  OryxWidget.prototype.setZoomLock = function (locked) {
    var vp = this._viewport;
    if (locked) {
      if (!vp.meta) {
        vp.meta = document.createElement('meta');
        vp.meta.setAttribute('name', 'viewport');
        document.head.appendChild(vp.meta);
        vp.created = true;
        vp.prev = null;
      }
      vp.meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    } else if (vp.meta) {
      vp.meta.setAttribute('content', vp.created ? 'width=device-width, initial-scale=1' : (vp.prev || 'width=device-width, initial-scale=1'));
    }
  };

  OryxWidget.prototype.go = function (state) {
    this.state = state;
    this.render();
    // keep the widget in view as the user advances
    try { this.root.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
  };

  OryxWidget.prototype.render = function () {
    this.setZoomLock(this.state === 'test');
    var html = '<div class="ox-shell">' + this.header();
    if (this.state === 'intro') html += this.viewIntro();
    else if (this.state === 'test') html += (this.useSteps() ? this.viewSteps() : this.viewTest());
    else if (this.state === 'capture') html += this.viewCapture();
    else if (this.state === 'result') html += this.viewResult();
    html += this.footer() + '</div>';
    this.root.innerHTML = html;
    this.bind();
  };

  OryxWidget.prototype.header = function () {
    var titles = { intro: 'Take the Oryx Test', test: 'Take the Oryx Test', capture: 'Almost there', result: 'Your result' };
    var step = { intro: 0, test: 1, capture: 2, result: 3 }[this.state];
    var dots = '';
    for (var i = 0; i < 4; i++) {
      dots += '<span class="ox-dot' + (i <= step ? ' is-on' : '') + '"></span>';
    }
    return (
      '<header class="ox-head">' +
        '<h2 class="ox-head-title">' + titles[this.state] + '</h2>' +
        '<div class="ox-steps" aria-hidden="true">' + dots + '</div>' +
      '</header>'
    );
  };

  OryxWidget.prototype.footer = function () {
    return (
      '<footer class="ox-foot">' +
        '<a href="mailto:support@oryxneuro.com">support@oryxneuro.com</a>' +
        '<a href="' + esc(this.learnUrl) + '" target="_blank" rel="noopener">oryxneuro.com</a>' +
        '<span class="ox-foot-note">Indicative · not a clinical test</span>' +
      '</footer>'
    );
  };

  OryxWidget.prototype.viewIntro = function () {
    return (
      '<section class="ox-body ox-intro">' +
        '<p class="ox-lede">A 30-second, indicative check of your near vision — find the smallest ' +
          'line you can read comfortably.</p>' +
        '<ul class="ox-howto">' +
          '<li><b>1.</b> Hold your ' + (this.handheld ? 'phone' : 'screen') + ' ' + this.distanceText() + ' from your face.</li>' +
          '<li><b>2.</b> Read <b>without</b> reading glasses, in normal light.</li>' +
          '<li><b>3.</b> Tap the smallest line you can read <b>without straining</b>.</li>' +
        '</ul>' +
        '<button class="ox-btn ox-btn-primary" data-act="start">Start the test</button>' +
        '<p class="ox-fine">Screens vary, so this is an <b>indicative</b> guide to your near vision, ' +
          'not a clinical measurement.</p>' +
      '</section>'
    );
  };

  OryxWidget.prototype.viewTest = function () {
    var rows = '';
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      var cls = 'ox-row';
      if (this.selectedIndex >= 0) {
        if (i < this.selectedIndex) cls += ' is-read';
        else if (i === this.selectedIndex) cls += ' is-sel';
        else cls += ' is-dim';
      }
      rows +=
        '<button type="button" class="' + cls + '" data-idx="' + i + '">' +
          '<span class="ox-code">' + L.code + '<em>' + L.frac + '</em></span>' +
          '<span class="ox-sample" style="font-size:' + (L.size / 16) + 'em;font-weight:' + L.weight + '">' +
            esc(L.text) +
          '</span>' +
          '<span class="ox-tick" aria-hidden="true"></span>' +
        '</button>';
    }
    var canContinue = this.selectedIndex >= 0;
    return (
      '<section class="ox-body ox-test">' +
        '<p class="ox-instr">Tap the <b>smallest line you can read comfortably</b> from ' + this.distanceText() + ' away.</p>' +
        '<div class="ox-chart">' + rows + '</div>' +
        '<button type="button" class="ox-cantread" data-act="cantread">I can’t comfortably read the top line</button>' +
        '<button class="ox-btn ox-btn-primary" data-act="tocapture"' + (canContinue ? '' : ' disabled') + '>' +
          (canContinue ? 'See my result' : 'Pick a line to continue') +
        '</button>' +
      '</section>'
    );
  };

  // One-line-at-a-time test (mobile default): show the lines large → small, ask whether
  // each is readable, and stop at the first "no". The smallest "yes" is the result.
  OryxWidget.prototype.viewSteps = function () {
    var L = LINES[this.stepIndex];
    var pct = Math.round(((this.stepIndex + 1) / LINES.length) * 100);
    return (
      '<section class="ox-body ox-stepv">' +
        '<div class="ox-step-top">' +
          '<span class="ox-step-count">Line ' + (this.stepIndex + 1) + ' of ' + LINES.length + '</span>' +
          '<div class="ox-progress"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
        '<div class="ox-step-card">' +
          '<span class="ox-step-code">' + esc(L.code) + ' · ' + esc(L.frac) + '</span>' +
          '<p class="ox-step-sample" style="font-size:' + (L.size / 16) + 'em;font-weight:' + L.weight + '">' +
            esc(L.text) +
          '</p>' +
        '</div>' +
        '<p class="ox-step-q">Can you read this <b>comfortably</b> from ' + this.distanceText() + ' away?</p>' +
        '<div class="ox-step-btns">' +
          '<button type="button" class="ox-btn ox-btn-ghost" data-step="no">Too small / blurry</button>' +
          '<button type="button" class="ox-btn ox-btn-primary" data-step="yes">Yes, clearly</button>' +
        '</div>' +
        (this.stepIndex > 0
          ? '<button type="button" class="ox-link" data-act="stepback">← Previous line</button>'
          : '') +
      '</section>'
    );
  };

  // canRead = answer to the line currently shown.
  OryxWidget.prototype.answerStep = function (canRead) {
    if (canRead) {
      this.lastYes = this.stepIndex;
      if (this.stepIndex >= LINES.length - 1) {
        this.selectedIndex = this.lastYes;     // read everything, even the smallest
        this.go('capture');
      } else {
        this.stepIndex++;
        this.render();
      }
    } else {
      // smallest comfortably-read line is the previous "yes"; floor at A1
      this.selectedIndex = this.lastYes >= 0 ? this.lastYes : 0;
      this.go('capture');
    }
  };

  OryxWidget.prototype.viewCapture = function () {
    var L = LINES[this.selectedIndex] || {};
    return (
      '<section class="ox-body ox-capture">' +
        '<div class="ox-teaser">' +
          '<div class="ox-teaser-lock">🔒</div>' +
          '<p class="ox-teaser-text">Your indicative result is ready.</p>' +
          '<p class="ox-teaser-sub">You read down to line <b>' + esc(L.code || '–') + '</b>. ' +
            'Enter your email to unlock your near-vision read-out and what it means.</p>' +
        '</div>' +
        '<form class="ox-form" novalidate>' +
          '<label class="ox-field">' +
            '<span>Email</span>' +
            '<input type="email" name="email" placeholder="you@example.com" autocomplete="email" required>' +
          '</label>' +
          '<p class="ox-err" hidden></p>' +
          '<button class="ox-btn ox-btn-primary" type="submit">Unlock my result</button>' +
          '<p class="ox-fine">We’ll send your result and tips for sharper near vision. No spam; unsubscribe anytime.</p>' +
        '</form>' +
        '<button type="button" class="ox-link" data-act="backtest">← Back to the test</button>' +
      '</section>'
    );
  };

  OryxWidget.prototype.viewResult = function () {
    var L = LINES[this.selectedIndex] || LINES[0];
    // "Vision Age" hook (indicative). Reading a smaller line => younger near-vision band.
    var gain = Math.min(LINES.length - 1, this.selectedIndex + 2); // ~2 lines of upside from training
    var gainL = LINES[gain];
    return (
      '<section class="ox-body ox-result">' +
        '<div class="ox-score">' +
          '<div class="ox-score-main">' +
            '<span class="ox-score-line">' + esc(L.code) + '</span>' +
            '<span class="ox-score-frac">' + esc(L.frac) + '</span>' +
          '</div>' +
          '<div class="ox-score-age">' +
            '<span class="ox-age-num">~' + esc(L.age) + '</span>' +
            '<span class="ox-age-cap">indicative vision age</span>' +
          '</div>' +
        '</div>' +
        '<p class="ox-result-text">You comfortably read down to line <b>' + esc(L.code) +
          '</b> (about <b>' + esc(L.frac) + '</b>). Your near vision performs in the range typical ' +
          'around <b>age ' + esc(L.age) + '</b>.</p>' +
        '<div class="ox-upside">' +
          '<p><b>The good news:</b> in perceptual training, people commonly sharpen their near vision ' +
            'by 2–3 lines — reaching toward line <b>' + esc(gainL.code) + '</b> (' + esc(gainL.frac) +
            ') without reading glasses.</p>' +
        '</div>' +
        '<div class="ox-cta-row">' +
          '<a class="ox-btn ox-btn-primary" href="' + esc(this.clinicUrl) + '"' + linkAttrs(this.clinicUrl) + '>Find a partner clinic</a>' +
          '<a class="ox-btn ox-btn-ghost" href="' + esc(this.learnUrl) + '"' + linkAttrs(this.learnUrl) + '>Learn more</a>' +
        '</div>' +
        '<p class="ox-fine">This is an <b>indicative</b> screening on an uncalibrated screen — not a ' +
          'clinical eye exam. A partner optometrist can measure you properly.</p>' +
        '<button type="button" class="ox-link" data-act="retake">Retake the test</button>' +
      '</section>'
    );
  };

  OryxWidget.prototype.bind = function () {
    var self = this;
    var r = this.root;

    var actions = r.querySelectorAll('[data-act]');
    Array.prototype.forEach.call(actions, function (el) {
      el.addEventListener('click', function (e) {
        var act = el.getAttribute('data-act');
        if (act === 'start') { self.resetTest(); self.go('test'); }
        else if (act === 'tocapture') { if (self.selectedIndex >= 0) self.go('capture'); }
        else if (act === 'cantread') { self.selectedIndex = 0; self.go('capture'); }
        else if (act === 'backtest') { self.resetTest(); self.go('test'); }
        else if (act === 'retake') { self.selectedIndex = -1; self.resetTest(); self.go('test'); }
        else if (act === 'stepback') {
          if (self.stepIndex > 0) { self.stepIndex--; self.lastYes = self.stepIndex - 1; self.render(); }
        }
      });
    });

    var rows = r.querySelectorAll('.ox-row');
    Array.prototype.forEach.call(rows, function (el) {
      el.addEventListener('click', function () {
        self.selectedIndex = parseInt(el.getAttribute('data-idx'), 10);
        self.render();
      });
    });

    var steps = r.querySelectorAll('[data-step]');
    Array.prototype.forEach.call(steps, function (el) {
      el.addEventListener('click', function () {
        self.answerStep(el.getAttribute('data-step') === 'yes');
      });
    });

    var form = r.querySelector('.ox-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[name=email]');
        var err = form.querySelector('.ox-err');
        var email = (input.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          err.textContent = 'Please enter a valid email address.';
          err.hidden = false;
          input.focus();
          return;
        }
        err.hidden = true;
        self.capture(email);
      });
    }
  };

  OryxWidget.prototype.capture = function (email) {
    var L = LINES[this.selectedIndex] || {};
    var lead = {
      email: email,
      line: L.code || null,
      fraction: L.frac || null,
      indicativeAge: L.age || null,
      ts: new Date().toISOString(),
      source: 'oryx-web-assessment'
    };
    this.lead = lead;

    // Beginning of the funnel: POST to backend if configured, otherwise persist locally (demo).
    if (this.opts.endpoint) {
      try {
        fetch(this.opts.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead)
        }).catch(function () {});
      } catch (e) {}
    } else {
      try {
        var key = 'oryx_leads';
        var all = JSON.parse(localStorage.getItem(key) || '[]');
        all.push(lead);
        localStorage.setItem(key, JSON.stringify(all));
      } catch (e) {}
    }

    if (typeof this.opts.onLead === 'function') {
      try { this.opts.onLead(lead); } catch (e) {}
    }

    this.go('result');
  };

  var OryxAssessment = {
    mount: function (target, opts) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) throw new Error('OryxAssessment.mount: target not found: ' + target);
      return new OryxWidget(el, opts);
    }
  };

  global.OryxAssessment = OryxAssessment;
})(typeof window !== 'undefined' ? window : this);
