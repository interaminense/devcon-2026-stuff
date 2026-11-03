# DEVCON 2026 Stuff

Code for the DEVCON 2026 deep dive *Bridging the Data Gap: Building Custom Analytics Dashboards with Liferay Data Platform Headless APIs* (3 November 2026, Track A).

Everything here reads LDP data from inside Liferay DXP through the DXP GraphQL proxy at `POST /o/analytics-rest/v1.0/graphql`. The proxy calls LDP server-side with the instance's analytics configuration, so the browser needs only the DXP session and `Liferay.authToken`. No LDP token ever reaches the page.

## Contents

| Folder | What it is |
|---|---|
| `swell-lab` | The Swell Lab surf school site: its fragments, page templates and style book, the client extensions on the blog and the dashboards, the Objects they use, and the AI Hub agents behind them. |
| `demo` | The live demo: the LDP Fragment Card built topic by topic, the Insight Alert notification setup, and the generator of the *Live Demo* helper pages. |
| `marketplace` | The LDP Metric Card fragment packaged for Liferay Marketplace, with LDP and AI Hub settings in its fragment configuration. |

## Prerequisites

- An LDP workspace with data, where you are an Owner or Administrator.
- A DXP that ships the GraphQL proxy (`analytics-rest-impl`, LPD-85945): 2026.Q3 or later.
- DXP connected to LDP, with the site assigned to an LDP property (channel).
- For the AI insights, DXP connected to AI Hub (*Instance Settings → AI Hub*) and the agents described in `swell-lab/ai-hub/README.md`.
