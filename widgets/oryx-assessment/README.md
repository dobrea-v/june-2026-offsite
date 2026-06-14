# Oryx Near-Vision Assessment — funnel widget

A web adaptation of the printed A4 **Oryx-Test** reading chart, built as the top of a lead funnel:

```
intro → reading test (pick smallest comfortable line) → email gate → indicative result + clinic CTA
```

Vanilla JS + CSS, no build step, no dependencies. Drop it onto any page.

## Embed

```html
<link rel="stylesheet" href="oryx-assessment.css">
<div id="oryx"></div>
<script src="oryx-assessment.js"></script>
<script>
  OryxAssessment.mount('#oryx', {
    endpoint: '/api/leads',          // optional: POST captured leads here
    clinicUrl: 'https://oryxneuro.com/clinics',
    learnUrl:  'https://oryxneuro.com',
    onLead: function (lead) { /* push to dataLayer, etc. */ }
  });
</script>
```

`mount(target, opts)`

| option | default | purpose |
|---|---|---|
| `endpoint` | — | URL to `POST` the lead JSON to. If omitted, leads are stored in `localStorage` under `oryx_leads` (**demo mode**). |
| `clinicUrl` | `oryxneuro.com` | "Find a partner clinic" CTA target. |
| `learnUrl` | `oryxneuro.com` | "Learn more" CTA + footer link. |
| `mode` | `'auto'` | Test presentation. `'chart'` = all 9 lines at once (desktop). `'steps'` = one line at a time with a yes/no (mobile). `'auto'` = `steps` on handhelds, `chart` otherwise. |
| `onLead(lead)` | — | Callback fired after capture. |

### Test modes

- **`chart`** mirrors the printed sheet: all nine lines, tap the smallest you can read.
- **`steps`** shows one line at a time, large → small, asking "Can you read this comfortably?" — it stops at the first *no* and records the smallest *yes*. This avoids long-sentence wrapping and scrolling on phones. Pinch-zoom is locked during the test in both modes.

`auto` selects `steps` on handhelds (coarse pointer or ≤600px) and `chart` elsewhere.

### Lead payload

```json
{
  "email": "you@example.com",
  "line": "A6",
  "fraction": "6/9.5",
  "indicativeAge": "45",
  "ts": "2026-06-14T10:00:00.000Z",
  "source": "oryx-web-assessment"
}
```

## Why "indicative"

A browser can't know the screen's physical size, pixel density, or how far the user is sitting,
so absolute font sizes aren't calibrated. The widget therefore presents results as an **indicative**
near-vision guide and a fun "vision age" — never as a clinical measurement. This keeps the marketing
claim honest (see the offsite product doc's claims-discipline note) and routes serious users to a
partner optometrist for a real exam.

## Customising the test

The reading ladder, font sizes, copy, and the indicative age mapping all live in the `LINES` array
at the top of `oryx-assessment.js`. Sizes are roughly proportional to each line's Snellen denominator
so the visual step-down matches the printed sheet.
