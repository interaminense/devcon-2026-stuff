# Swell Lab

The surf school site the talk uses as its customer: real pages that LDP tracks, a blog that the content advisor scores, and two dashboards built from the same metric card. It runs in the Guest site of the team's cloud DXP (`https://webserver-lctacdemodevcon-prd.lfr.cloud`).

`DESIGN.md` describes the brand, the pages, and how to rebuild the site from scratch.

## Contents

| Folder | What it is |
|---|---|
| `site` | The site itself: `src` holds the fragments, master page, page templates, display page template, utility page and style book; `scripts` regenerates them and zips them for import; `images` has the photos and the logo. |
| `client-extensions` | The client extensions the site runs, each hosted in Guest Documents & Media. |
| `objects` | The Object definitions the site and the metric card store data in, with the script that creates them. |
| `ai-hub` | The AI Hub agents the client extensions call: their workflow, prompt and external reference code. |

## Client Extensions

| Folder | Where it runs | What it does |
|---|---|---|
| `content-advisor` | `/blog` and `/learn`, signed-in users | Scores every post card by its share of clicks (the `surfBlogPostClicked` custom event), outlines the best and the weakest, and asks AI Hub how to improve the weakest; *Accept and open in CMS* saves the rewrite as a draft. |
| `next-posts` | `/blog`, signed-in users | Ranks the posts by click rate and asks AI Hub for the next three posts to write, which can be saved as CMS drafts. |
| `live-views` | Every page, signed-in users | A floating card with the live page views of the current page. |
| `metric-card` | `/dashboard` | A card for any of 21 LDP metrics, with a cog to pick the metric, the chart and the period, kept in the `LDPMetricCard` Object. |
| `visitors-behavior` | `/dashboard` | The tabbed visitors behavior card: unique visitors, sessions, sessions per visitor, session duration and bounce rate. |

## Dashboards

`/dashboard` places the `metric-card` and `visitors-behavior` client extensions as widgets. `/dashboard-2`, the one the header links to, uses the same cards as fragments: `site/scripts/build-dashboard-fragments.py` wraps both client extensions into the *Swell Lab Dashboard* fragment set (`site/src/fragments/swell-lab-dashboard`), where the fragment configuration picks each card's metric, chart, period and title. Run it after changing either client extension:

```bash
python3 swell-lab/site/scripts/build-dashboard-fragments.py
```
