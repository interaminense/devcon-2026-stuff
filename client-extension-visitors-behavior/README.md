# LDP Visitors Behavior

A full-width card with the site activity metrics of LDP (Unique Visitors, Sessions, Sessions/Visitor, Session Duration, Bounce Rate), each with its trend, and a smooth line of the selected metric below.

## How It Works

| Piece | Detail |
|---|---|
| Data | `site(channelId, interval, rangeKey)` on the DXP GraphQL proxy `/o/analytics-rest/v1.0/graphql`: the same site metrics as the Sites screen of LDP, where each visitor and session counts once |
| No page metrics | The dashboard shows site metrics only. Page metrics (views, time on page, entrances, exit rate) belong to the live page views card. Summing them without `canonicalUrl` also distorts the site picture: a visitor counts once per page seen and every session reads as a bounce |
| Checked | Against ldp-internal on 2026-10-10, last 24 hours: 6 visitors, 1 session per visitor, 19 s, 50% bounce rate in both |
| Units | Bounce rate is a 0–1 ratio; session duration is in milliseconds |
| Histogram | `interval` is `H` for the last 24 hours (one bucket per hour), `D` otherwise |
| Line | A Catmull-Rom spline drawn as cubic Bézier curves, so it passes through every value with a wave shape; hover shows a crosshair and the value |
| Persistence | The selected tab and the period go to the `LDPMetricCard` Object (`chart` holds the tab, `metric` is `visitorsBehavior`), keyed by the portlet instance id |
| Look | The same `--ldp-*` CSS custom properties as the metric card |

## Hosting

| Item | Value |
|---|---|
| Document | `ldp-visitors-behavior.js` in Guest Documents & Media |
| Client extension | *LDP Visitors Behavior*, Custom Element `ldp-visitors-behavior`, instanceable, URL `…/documents/d/guest/ldp-visitors-behavior-js?v=5` |
| Placement | First row of the Swell Lab dashboard, instance id `behavior` |

After uploading a new version, bump `?v=` in the client extension URL, or signed-in users keep the old script for up to 10 minutes.

## AI Insight

An *AI insight* checkbox next to the period, off by default and kept in the Object's `aiInsight` field, adds a footer with an AI Hub agent's reading of the selected metric (label, period, value, trend, and values over time). The AI Hub client is the same as in `../client-extension-metric-card` (see its README); the two scripts each carry a copy so that either works alone.
