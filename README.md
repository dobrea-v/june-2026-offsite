# June 2026 Offsite — Oryx near-vision funnel

A single-page, web-based funnel for Oryx, built for the June 2026 offsite. Pure HTML/CSS/vanilla
JS — no build step. Open `index.html` (via a local server) and scroll.

## The flow

`index.html` runs three sections in sequence:

1. **Scroll journey** — "Scroll yourself sharp." A scrollytelling brand story: each scroll is a
   training session; a blurry restaurant menu sharpens and the reading glasses slide away while a
   timeline tracks 40 sessions.
2. **Self-assessment** — a 30-second indicative near-vision test (the web adaptation of the printed
   A4 Oryx-Test). Picks the smallest comfortably-read line → email capture → indicative result and
   "vision age." Chart layout on desktop, one-line-at-a-time on mobile.
3. **Find your optometrist** — a map of partner clinics (Leaflet + OpenStreetMap). Selecting a
   clinic carries it through to checkout for commission attribution.

## Structure

```
index.html                     # the single-page funnel (mounts all three widgets)
assets/site.css                # shared tokens + connective section styles
widgets/
  scroll-journey/              # OryxJourney.mount() — scrollytelling intro/journey/outro
  oryx-assessment/             # OryxAssessment.mount() — near-vision test + lead capture
  clinic-finder/               # OryxClinics.mount() — partner-clinic map + selection
OFFSITE_PRODUCT_IDEAS.md       # product context / feature tiers
```

Each widget is self-contained and mountable into any container; see `widgets/*/README.md` where present.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Notes

- Results are **indicative**, not clinical — a browser is an uncalibrated environment. Lead capture
  is demo-mode (localStorage) unless an `endpoint` is configured.
- Clinic data and location are placeholders (London) — swap `DEFAULT_CLINICS` in
  `widgets/clinic-finder/clinic-finder.js` for real partners.
