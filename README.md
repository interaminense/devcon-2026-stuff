# DEVCON 2026 Stuff

Code for the DEVCON 2026 deep dive *Bridging the Data Gap: Building Custom Analytics Dashboards with Liferay Data Platform Headless APIs* (3 November 2026, Track A).

Everything here reads LDP data from inside Liferay DXP through the DXP GraphQL proxy at `POST /o/analytics-rest/v1.0/graphql`. The proxy calls LDP server-side with the instance's analytics configuration, so the browser needs only the DXP session and `Liferay.authToken`. No LDP token ever reaches the page.

## Contents

| Folder | What it is |
|---|---|
| `dxp` | How to run the frozen demo DXP in Docker, with the scripts that create, back up and restore it. |
| `scripts` | `curl` scripts that prove the proxy works before any page exists, and `probe-metrics.mjs`, which checks every metric of the metric card. |
| `html-fragment` | The first prototype: the widget pasted into the out-of-the-box HTML fragment of a content page. |
| `client-extension` | The same widget as a Web Component, registered as a Custom Element client extension without a Liferay workspace. Served on port 3333. |
| `client-extension-metric-card` | A card that renders any of 21 LDP metrics with a choice of charts, with a cog to pick the metric, the chart, the period, and the title. Served on port 3334. |

## Prerequisites

- An LDP workspace with data, where you are an Owner or Administrator.
- A DXP that ships the GraphQL proxy (`analytics-rest-impl`, LPD-85945). `dxp/README.md` sets one up.
- DXP connected to LDP, with the demo site assigned to an LDP property (channel).

## Scripts

```bash
export DXP_PASSWORD=<password>
export DXP_USER=<email>

scripts/get-channels.sh
scripts/get-site-histogram.sh <channelId> 30 visitorsMetric
```

`DXP_URL` defaults to `http://localhost:8080`.

## HTML Fragment

Create a blank content page, drag the *HTML* fragment onto it, double-click it, paste `html-fragment/ldp-widget.html`, and publish. The `<script>` runs both in the page editor and in view mode.

## Client Extension

See `client-extension/README.md`.

## Known Limits

- The LDP GraphQL schema behind the proxy is not a documented public API and may change.
- The "sum of daily values" KPI counts the same person once per day they visited.
- Anonymous requests to the proxy get 403. The permissions it requires are still to be confirmed.
- The configuration chosen on each card is not persisted yet: reloading the page resets it. Liferay Objects is the next step.
