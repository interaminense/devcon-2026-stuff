# DEVCON 2026 - LDP Headless Integrations

Code for the DEVCON 2026 deep dive *Bridging the Data Gap: Building Custom Analytics Dashboards with Liferay Data Platform Headless APIs* (3 November 2026, Track A).

Everything here reads LDP data from inside Liferay DXP through the DXP GraphQL proxy at `POST /o/analytics-rest/v1.0/graphql`. The proxy calls LDP server-side with the instance's analytics configuration, so the browser needs only the DXP session and `Liferay.authToken`. No LDP token ever reaches the page.

## Contents

| Folder | What it is |
|---|---|
| `scripts` | `curl` scripts that prove the proxy works before any page exists. |
| `html-fragment` | The first prototype: the widget pasted into the out-of-the-box HTML fragment of a content page. |
| `client-extension` | The same widget as a Web Component, registered as a Custom Element client extension without a Liferay workspace. |

## Prerequisites

- An LDP workspace with data, where you are an Owner or Administrator.
- A DXP that ships the GraphQL proxy (`analytics-rest-impl`, LPD-85945).
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
- The metric and period chosen on each widget instance are not persisted yet. Liferay Objects is the next step.
