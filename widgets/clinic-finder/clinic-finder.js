/*
 * Clinic-finder widget — select a partner optometrist on a map.
 * Vanilla JS; loads Leaflet + OpenStreetMap from CDN on demand (no API key). The clinic
 * list is the primary selector and works even if map tiles fail to load.
 *
 * In the funnel this is the final step: the selected clinic carries through to checkout
 * for commission attribution (offsite doc #7). Selecting a clinic fires opts.onSelect and
 * enables the "Continue" CTA → opts.checkoutUrl (with ?clinic=<id> appended).
 *
 * Usage:
 *   <link rel="stylesheet" href="clinic-finder.css">
 *   <div id="clinics"></div>
 *   <script src="clinic-finder.js"></script>
 *   <script>OryxClinics.mount('#clinics', { onSelect: c => {}, checkoutUrl: '/checkout' });</script>
 */
(function (global) {
  'use strict';

  var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  var LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

  // Placeholder partner clinics (London). Swap for real data / a geo lookup in production.
  var DEFAULT_CLINICS = [
    { id: 'clearview',   name: 'Clearview Optometry',   addr: '12 Marylebone High St, W1U',     dist: '0.6 mi', rating: '4.9', next: 'Tomorrow', lat: 51.5205, lng: -0.1518 },
    { id: 'northlight',  name: 'North Light Eyecare',   addr: '88 Upper St, Islington, N1',     dist: '1.4 mi', rating: '4.8', next: 'Wed 18th', lat: 51.5380, lng: -0.1030 },
    { id: 'southbank',   name: 'Southbank Vision',      addr: '4 The Cut, SE1',                 dist: '1.9 mi', rating: '4.7', next: 'Thu 19th', lat: 51.5040, lng: -0.1100 },
    { id: 'kensington',  name: 'Kensington Eye Studio', addr: '201 Kensington High St, W8',     dist: '2.7 mi', rating: '5.0', next: 'Fri 20th', lat: 51.5010, lng: -0.1930 },
    { id: 'eastend',     name: 'East End Optical',      addr: '33 Brick Lane, E1',              dist: '3.1 mi', rating: '4.6', next: 'Sat 21st', lat: 51.5205, lng: -0.0720 }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function ensureLeaflet(cb) {
    if (global.L) { cb(); return; }
    if (!document.querySelector('link[data-leaflet]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS; link.setAttribute('data-leaflet', '1');
      document.head.appendChild(link);
    }
    var existing = document.querySelector('script[data-leaflet]');
    if (existing) { existing.addEventListener('load', function () { cb(); }); return; }
    var s = document.createElement('script');
    s.src = LEAFLET_JS; s.setAttribute('data-leaflet', '1');
    s.onload = function () { cb(); };
    s.onerror = function () { cb(new Error('leaflet-failed')); };
    document.head.appendChild(s);
  }

  function ClinicFinder(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.clinics = this.opts.clinics || DEFAULT_CLINICS;
    this.checkoutUrl = this.opts.checkoutUrl || 'https://oryxneuro.com';
    this.selectedId = null;
    this.map = null;
    this.markers = {};
    this.root.classList.add('oryx-clinics');
    this.render();
    this.initMap();
  }

  ClinicFinder.prototype.render = function () {
    var self = this;
    var cards = this.clinics.map(function (c) {
      var sel = c.id === self.selectedId ? ' is-sel' : '';
      return '<button type="button" class="ocf-clinic' + sel + '" data-id="' + esc(c.id) + '">' +
          '<span class="ocf-c-top"><span class="ocf-c-name">' + esc(c.name) + '</span>' +
            '<span class="ocf-c-dist">' + esc(c.dist) + '</span></span>' +
          '<span class="ocf-c-addr">' + esc(c.addr) + '</span>' +
          '<span class="ocf-c-meta"><span>★ <b>' + esc(c.rating) + '</b></span>' +
            '<span>Next: <b>' + esc(c.next) + '</b></span></span>' +
        '</button>';
    }).join('');

    this.root.innerHTML =
      '<div class="ocf-grid">' +
        '<div class="ocf-list">' +
          '<div class="ocf-list-head">' + this.clinics.length + ' partner clinics near you</div>' +
          cards +
        '</div>' +
        '<div class="ocf-map" id="ocfMap"><div class="ocf-map-fallback" hidden>Map unavailable offline — pick a clinic from the list.</div></div>' +
      '</div>' +
      this.barHtml();

    this.bind();
  };

  ClinicFinder.prototype.barHtml = function () {
    var c = this.selected();
    if (!c) {
      return '<div class="ocf-bar is-empty">' +
        '<span class="ocf-bar-text">Select a clinic to continue — your choice carries through to checkout.</span>' +
        '<button class="ocf-continue" disabled>Continue</button>' +
      '</div>';
    }
    var href = this.checkoutUrl + (this.checkoutUrl.indexOf('?') >= 0 ? '&' : '?') + 'clinic=' + encodeURIComponent(c.id);
    return '<div class="ocf-bar">' +
      '<span class="ocf-bar-text">Selected: <b>' + esc(c.name) + '</b> · ' + esc(c.addr) + '</span>' +
      '<a class="ocf-continue" href="' + esc(href) + '" target="_blank" rel="noopener">Continue with this clinic →</a>' +
    '</div>';
  };

  ClinicFinder.prototype.selected = function () {
    var id = this.selectedId, list = this.clinics;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };

  ClinicFinder.prototype.bind = function () {
    var self = this;
    var cards = this.root.querySelectorAll('.ocf-clinic');
    Array.prototype.forEach.call(cards, function (el) {
      el.addEventListener('click', function () { self.select(el.getAttribute('data-id'), true); });
    });
  };

  // updateBarOnly avoids tearing down the map on each selection.
  ClinicFinder.prototype.select = function (id, fly) {
    this.selectedId = id;
    var c = this.selected();

    // update card highlight
    var cards = this.root.querySelectorAll('.ocf-clinic');
    Array.prototype.forEach.call(cards, function (el) {
      el.classList.toggle('is-sel', el.getAttribute('data-id') === id);
    });
    // update markers
    for (var key in this.markers) {
      if (this.markers.hasOwnProperty(key)) {
        var icon = this.markers[key]._icon;
        if (icon) icon.querySelector('.ocf-pin').classList.toggle('is-sel', key === id);
      }
    }
    // update bar
    var oldBar = this.root.querySelector('.ocf-bar');
    if (oldBar) oldBar.outerHTML = this.barHtml();

    if (this.map && c && fly) { this.map.flyTo([c.lat, c.lng], 14, { duration: 0.6 }); }
    if (this.map && this.markers[id]) { this.markers[id].openPopup(); }

    if (typeof this.opts.onSelect === 'function') {
      try { this.opts.onSelect(c); } catch (e) {}
    }
  };

  ClinicFinder.prototype.initMap = function () {
    var self = this;
    var mapEl = this.root.querySelector('#ocfMap');
    ensureLeaflet(function (err) {
      if (err || !global.L) {
        var fb = mapEl.querySelector('.ocf-map-fallback');
        if (fb) fb.hidden = false;
        return;
      }
      var L = global.L;
      var center = self.opts.center || [51.515, -0.13];
      var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false }).setView(center, 12);
      self.map = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
      }).addTo(map);

      self.clinics.forEach(function (c) {
        var icon = L.divIcon({
          className: '', html: '<span class="ocf-pin"><span></span></span>',
          iconSize: [18, 18], iconAnchor: [9, 18], popupAnchor: [0, -16]
        });
        var m = L.marker([c.lat, c.lng], { icon: icon }).addTo(map);
        m.bindPopup('<b>' + esc(c.name) + '</b><br>' + esc(c.addr));
        m.on('click', function () { self.select(c.id, false); });
        self.markers[c.id] = m;
      });

      // fit all clinics in view
      try {
        var group = L.featureGroup(self.clinics.map(function (c) { return self.markers[c.id]; }));
        map.fitBounds(group.getBounds().pad(0.25));
      } catch (e) {}
    });
  };

  var OryxClinics = {
    mount: function (target, opts) {
      var el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) throw new Error('OryxClinics.mount: target not found: ' + target);
      return new ClinicFinder(el, opts);
    }
  };

  global.OryxClinics = OryxClinics;
})(typeof window !== 'undefined' ? window : this);
