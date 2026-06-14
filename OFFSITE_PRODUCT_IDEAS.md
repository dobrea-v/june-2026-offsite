# Team Offsite — Product Ideas & Priorities

> Working doc for the product/MVP discussion slot. Comment freely.

## Context in three sentences

We sell a $1,000 perceptual-learning program through optometrists (commission on referral),
purchased on the web, with a measured-outcome guarantee. The science is inherited and strong,
but every predecessor in this category (GlassesOff, Akili, Pear) proved that **efficacy is the
entry ticket, not the business** — what gets valued is a repeatable sale and patients who finish.
Therefore the one metric everything below serves is **program completion rate**, followed by
**per-clinic sales rate**.

## The GlassesOff lessons we inherit

| What killed them | How our model answers it |
|---|---|
| $100–200 LTV minus Apple's 30% cut | $1,000 web-direct, no platform tax |
| Paid consumer CAC they couldn't afford | Optometrist commission = CAC paid only on a closed sale |
| 25–65 session burden, completion rate never disclosed | 30–40 × 10 min sessions — and Tier 1 below is the adherence stack |
| Company-affiliated science, never independently replicated | Open item: fund an independent active-controlled study |
| Penny-stock financing drove hype over retention | Don't repeat: retention work before narrative work |

---

## Feature list by tier

**Scope:** 🟢 days · 🟡 ~1 sprint · 🔴 multi-sprint

### Tier 1 — Completion rate (protects the $1,000 + guarantee model)

| # | Feature | What it is | Scope |
|---|---------|-----------|-------|
| 1 | **Session reminders** | Local notifications anchored to a user-chosen daily moment ("after morning coffee"). Nothing exists today — no notification packages in the app. | 🟢 |
| 2 | **Felt progress** | Threshold-over-time chart on dashboard + "time travel" catch trials rendered at week-1 difficulty ("this used to be hard for you"). Adaptive staircases keep users at ~75–80% correct forever, so improvement is invisible without this. | 🟡 |
| 3 | **Early win at day 10–14** | In-app re-measurement with a before/after payoff visual (e.g. a menu/night scene rendered at old vs. new threshold). Optometrist visits stay at baseline / mid / completion. | 🟡 |
| 4 | **Outcome report (PDF)** | Clinic-branded one-pager: before/after thresholds, reading-speed delta. Justifies the price, settles guarantee claims, powers sharing and clinic word-of-mouth. | 🟡 |
| 5 | **Streak insurance** | One repair token per month. Streak calendar already exists — small addition. (Duolingo lesson: a broken streak without recourse triggers abandonment.) | 🟢 |

### Tier 2 — Funnel & optometrist channel (brings the customers)

| # | Feature | What it is | Scope |
|---|---------|-----------|-------|
| 6 | **Web quick assessment** | Browser-based screening with age-group comparison. Browser = uncalibrated environment, so label as *indicative*, never clinical (claims discipline). Ends with → find a partner clinic. | 🔴 |
| 7 | **Optometrist map** | Partner clinic finder. Doubles as commission attribution — selected clinic carries through to checkout. One clinic data model for both. | 🟡 |
| 8 | **Purchase → activation** | Website buy → account auto-created → app activation, with clinic referral code captured. App is login-only today; accounts provisioned externally. | 🟡 |
| 9 | **Clinician roster view** | Minimal web page: their patients, adherence, threshold trend, "missed sessions" alert. Required for re-measurement follow-ups and any commission-on-completion design. | 🔴 |

### Tier 3 — Infrastructure & engagement (multipliers, not drivers)

| # | Feature | What it is | Scope |
|---|---------|-----------|-------|
| 10 | **PostHog analytics** | Self-hosted or EU cloud — don't build our own. Key deliverable is the event taxonomy around completion rate and the dropout cliff (find which week kills). | 🟡 |
| 11 | **Remote app texts** | Finish the existing `TranslationService` remote-override support. Pairs with LaunchDarkly for copy A/B tests without app releases. | 🟢 |
| 12 | **Vision Age** | One shareable number on the dashboard ("your eyes perform like a 38-year-old's"). The hook for marketing, sharing, and the longevity positioning. | 🟡 |
| 13 | **Share your progress** | Share button bound to the artifacts above (Vision Age, before/after, report) — not a standalone feature. 40+ users share results, not streaks. | 🟢 |

---

## Suggested sequencing

1. **Ship Tier 1 first** — every item attacks completion rate; items 1, 2, 5 together ≈ one sprint.
2. **Tier 2 decides revenue** — needs design + backend alignment; right *discussion* focus for the offsite.
3. **Tier 3 rides along** — #11 is nearly free; #10 should land before Tier 1 ships so we can measure it.

## Open questions for the offsite

- **Commission design:** flat on sale, or split (part on sale, part on patient completion)?
  Split turns the clinic into adherence infrastructure.
- **Re-measurement cadence:** which checkpoints are in-clinic (revenue + clinical weight)
  vs. in-app (zero friction)?
- **Refund/guarantee terms:** what exactly triggers the outcome guarantee, and how is it
  measured (in-app E-Test vs. clinic ETDRS)?
- **What's our answer to week-5 boredom?** Tier 1 is the current answer — is it enough?
- **Independent study:** when do we fund the arms-length replication the category has
  never had? (Biggest credibility unlock available; no fast-follower can copy it.)
- **Analytics hosting:** PostHog self-hosted (ops burden) vs. EU cloud (lighter, still GDPR-friendly)?

## Fun-slot candidates (build/play at the offsite)

- **Vision tournament** — arcade mode over existing tasks, live leaderboard, everyone plays.
  Doubles as dogfooding + future trade-show demo.
- **Chairside demo prototype** — 3-minute assessment + instant age-group comparison on an iPad.
  This is the optometrist's sales moment; arguably the highest-leverage sales feature we can build.
- **Threshold art** — render messages just below average contrast threshold (readable only by
  trained eyes). Cheap script, great swag/marketing artifact.
