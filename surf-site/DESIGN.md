# Swell Lab: Surf School Demo Site

A surf school with lessons and trips, built on the team's Liferay Cloud DXP (`https://webserver-lctacdemodevcon-prd.lfr.cloud`, DXP 2026.Q3.6) in the Guest site. It gives the DEVCON 2026 demo real pages to track in LDP and a believable brand around the dashboard. Approved on 2026-10-09.

## Visual Identity

| Element | Value |
|---|---|
| Brand | Swell Lab (`images/logo.svg`) |
| Primary | `#0B4F6C` (deep teal) |
| Accent | `#20C9C3` (turquoise) |
| Background | `#F7F3EA` (sand) |
| Text | `#1D2B36` |
| Fonts | Poppins for headings, Inter for body text (Google Fonts) |
| Shape | Rounded corners and generous spacing |
| Photos | Unsplash, listed in `images/CREDITS.md` |

The theme is not rebuilt. A Style Book carries the colors, fonts, and radius as frontend tokens, and site CSS loads the fonts.

## Structure

- **Master page:** header with logo, navigation (Lessons, Trips, Spots), and a *Book a lesson* button; footer with contact and social links (fictional).
- **Home:** hero ("Ride your first wave"), three highlights (Lessons, Trips, Spots), testimonials, and a call to book.
- **Lessons:** Beginner, Intermediate, and Advanced, each with a price and a booking button.
- **Trips:** Bali, Portugal, and Costa Rica.
- **Spots:** four beaches with level, best tide, and a photo.
- **Book:** a booking form stored in a `SurfBooking` Object, which gives LDP a real conversion.

The journey Home → Lessons or Trips → Book feeds the metrics shown in the demo (top pages, visitors, sessions).

## Dashboard

`/dashboard` (built on 2026-10-10) is a regular page, hidden from the navigation, whose *View* permission is removed from Guest and given to User and Site Member, so only signed-in users reach it; guests get a 404. Private pages are not used: on 2026.Q3 they depend on the deprecation feature flag LPD-38869, which is off.

| Piece | Detail |
|---|---|
| LDP Headless API | Every card queries the DXP GraphQL proxy `/o/analytics-rest/v1.0/graphql` |
| Client extension | *LDP Metric Card*, a Custom Element, instanceable, whose script is `ldp-metric-card.js` in Guest Documents & Media |
| Liferay Objects | `LDPMetricCard` (`/o/c/ldpmetriccards`), one entry per card, keyed by the card's portlet instance id |
| Fragments | The *Swell Lab Dashboard* page template: the `sl-dashboard-header` fragment, then layout fragments (a container and rows of columns) holding seven card instances with fixed instance ids (`visitors`, `sessions`, `bouncerate`, `toppages`, `acquisition`, `heatmap`, `devices`) |
| Visitors Behavior | A full-width first row with the *LDP Visitors Behavior* client extension (instance id `behavior`): the LDP site activity metrics as tabs, with a smooth line chart |
| Site metrics only | Every dashboard card reads site-level LDP data; page-level metrics are used only by the live page views card. On 2026-10-10 each card was checked against the ldp-internal Sites screen (last 24 hours) and matched; the heatmap is shifted from UTC to the viewer's time zone, as LDP does |
| Swell Lab look | `sl-dashboard-header` sets the card's `--ldp-*` CSS custom properties (colors, fonts, radius, shadow, and a validated categorical palette), which reach into the card's shadow root |

Fixed instance ids make the Object keys predictable, so each card's starting configuration was written to the Object before anyone opened the page. It also means the page can be deleted and created again from the template without losing any card setup, which is how template changes reach it (a page created from a template is a copy).

All cards start on the last 24 hours. Page metrics show up in about 40 seconds; site metrics (visitors, sessions, acquisition, devices, heatmap) come from LDP batch processing and appeared within a few hours of connecting the property.

Layout rows (`.lfr-layout-structure-item-row`) have `overflow: hidden`, which clipped the card's settings popover at the bottom of each row. `sl-dashboard-header` sets them back to `overflow: visible` inside `.sl-dashboard`.

## Learn Page and Content Advisor

`/learn` (Surf Academy, added on 2026-10-10, in the main navigation) holds the `sl-academy` fragment: six content blocks with a fixed `data-content-id`, editable title and text, and a link that sends the `surfContentClicked` custom event (`contentId`, `contentTitle`, `position`). One block, *Information* at position 5, is weak on purpose (generic title, one-line text) so the advisor has something to point at in the demo. The *LDP Content Advisor* client extension (`../client-extension-content-advisor`) outlines the blocks with the lowest click rate for signed-in users and asks an AI Hub agent how to improve them.

## Out of Scope

A coded theme, real Commerce, multilingual content, and a blog.

## How It Is Built

Feature flag LPD-35443 is off on the cloud instance, so the `headless-admin-site` write endpoints (pages, site initializer) are unavailable. The site is built from hand-authored ZIPs imported through the admin UIs, plus page creation from the templates. Every source file lives in this folder so the site can be rebuilt.

| Path | Purpose |
|---|---|
| `scripts/author-fragments.py` | Writes the fragment collection under `src/fragments` |
| `scripts/author-layouts.py` | Writes the Style Book, the master page, and the page templates under `src` |
| `scripts/build-zips.sh` | Packs `src` into the three ZIPs under `dist` |
| `objects/surf-booking.object-definition.json` | The `SurfBooking` Object behind the booking form |

To rebuild:

1. Run both author scripts with the `surf-site` folder as the argument, then `scripts/build-zips.sh`.
1. *Design → Style Books → Import* `dist/swell-lab-style-book.zip`, then mark *Swell Lab* as the default for the Classic theme.
1. *Design → Fragments → Import* `dist/swell-lab-fragments.zip`. The photos and the logo travel as fragment resources.
1. *Design → Page Templates → Masters → Import* `dist/swell-lab-pages.zip`. The Fragments import does not pick up master pages or page templates on this version, even though the code suggests it should.
1. Add each page from the *Swell Lab* page template set (Home, Lessons, Trips, Spots, Book) with **no page selected**, or the pages become children of the selected one, then publish each.
1. Create the Object: `DXP_URL=... DXP_USER=... DXP_PASSWORD=... objects/create-object-definition.sh surf-site/objects/surf-booking.object-definition.json` from the repo root.
1. Give the Guest role the *Add Object Entry* permission on Surf Bookings, so anonymous visitors can book.

### Gotchas

- **No FreeMarker in fragments** on this instance. `<#if>` blocks render verbatim, so every branch shows. The page banner takes its photo from the image editable, which each page template sets to `/documents/d/guest/<photo>-jpg?download=true` (the document that the fragment resource import creates).
- **Re-importing a fragment does not update pages that use it.** After an overwrite import, open *View Usages* on each changed fragment, select all, and *Propagate*.
- **The Home page.** The Guest site already had a *Home* page at `/home`. It is now *Old Home* at `/old-home`, hidden. Its `/home` entry was removed from the friendly URL history so the new Home could take `/home`, and the new Home has priority 0 so the site root opens it.
