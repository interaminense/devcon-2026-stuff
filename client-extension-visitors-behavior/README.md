# LDP Visitors Behavior

A full-width card with the six behavior metrics that LDP shows for a page (Unique Visitors, Views, Bounce Rate, Time On Page, Entrances, Exit Rate), here for the whole site, with each metric's trend and a smooth line of the selected metric below.

## How It Works

| Piece | Detail |
|---|---|
| Data | One request to the DXP GraphQL proxy `/o/analytics-rest/v1.0/graphql` with two root fields: `site(channelId, interval, rangeKey)` for Unique Visitors and Bounce Rate, and `page(channelId, rangeKey)` without `canonicalUrl` for Views, Time On Page, Entrances, and Exit Rate |
| Why two sources | The page query without `canonicalUrl` adds up every page: right for views and entrances, but it counts a visitor once per page seen and rates every session as a bounce. The site query counts each visitor and session once, which is what the LDP Sites screen shows (checked against ldp-internal on 2026-10-10: 6 visitors and 50% bounce rate in both) |
| Exit Rate | Across the whole site it is always 100%, because every session leaves from some page; it is only meaningful per page |
| Fields | `visitorsMetric`, `viewsMetric`, `bounceRateMetric`, `avgTimeOnPageMetric`, `entrancesMetric`, `exitRateMetric`, each with `value`, `trend { percentage trendClassification }`, and `histogram` |
| Units | Bounce and exit rates are 0–1 ratios; time on page is in milliseconds |
| Histogram | One bucket per hour for the last 24 hours, one per day otherwise |
| Line | A Catmull-Rom spline drawn as cubic Bézier curves, so it passes through every value with a wave shape; hover shows a crosshair and the value |
| Persistence | The selected tab and the period go to the `LDPMetricCard` Object (`chart` holds the tab, `metric` is `visitorsBehavior`), keyed by the portlet instance id |
| Look | The same `--ldp-*` CSS custom properties as the metric card |

## Hosting

| Item | Value |
|---|---|
| Document | `ldp-visitors-behavior.js` in Guest Documents & Media |
| Client extension | *LDP Visitors Behavior*, Custom Element `ldp-visitors-behavior`, instanceable, URL `…/documents/d/guest/ldp-visitors-behavior-js?v=2` |
| Placement | First row of the Swell Lab dashboard, instance id `behavior` |

After uploading a new version, bump `?v=` in the client extension URL, or signed-in users keep the old script for up to 10 minutes.
