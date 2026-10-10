# LDP Live Views

A floating card with the live page views of the current page, shown only to signed-in users on every page of the Swell Lab site. It reads LDP through the DXP GraphQL proxy, the same way as the metric card.

## How It Works

| Piece | Detail |
|---|---|
| Data | `page(canonicalUrl, channelId, rangeKey: 0)` on `POST /o/analytics-rest/v1.0/graphql`: views and visitors of the last 24 hours, with one histogram bucket per hour |
| Refresh | Every 30 seconds, paused while the tab is hidden |
| Latency | A visit shows up in about 40 seconds (measured on 2026-10-10) |
| Last minutes | The API has no unit below one hour, so the card keeps the difference between consecutive polls and draws the new views of the last 10 minutes itself |
| Home page | LDP keys the Home page by the site root, so `/home` is queried as the root URL |
| Visibility | The element renders only when `Liferay.ThemeDisplay.isSignedIn()` is true; the proxy also refuses guests |
| Channel | `CHANNEL_ID` constant: the *SWELL LAB DevCon 2026* property |

The script defines the `<ldp-live-views>` Custom Element and appends one to the page by itself, so it works as a JavaScript client extension without placing a widget. Registered as a Custom Element client extension instead, the widget renders it.

## Hosting

The script lives in the DXP itself, in Documents & Media of the Guest site, so no server has to run during the demo:

| Item | Value |
|---|---|
| Document | `ldp-live-views.js`, viewable by anyone (guests load it but render nothing; otherwise every guest page logs a 404) |
| URL | `https://webserver-lctacdemodevcon-prd.lfr.cloud/documents/d/guest/ldp-live-views-js` |
| Client extension | *LDP Live Views*, type JavaScript, pointing to that URL |
| Applied in | *Site Builder → Pages → Configuration → Design → Customization → JavaScript*, *In Page Bottom*, for the public pages |

Documents & Media serves `.js` files as `application/javascript`, which the browser accepts even with `X-Content-Type-Options: nosniff`.

## Update

Upload the new file as a new version of the document. The URL stays the same, so the client extension needs no change:

```bash
curl \
	--form "file=@client-extension-live-views/ldp-live-views.js;type=application/javascript" \
	--request PUT \
	--url "${DXP_URL}/o/headless-delivery/v1.0/documents/<document id>" \
	--user "${DXP_USER}:${DXP_PASSWORD}"
```

`viewableBy` only applies when a document is created; a `PUT` keeps the permissions it already has.

Signed-in users keep getting the previous version for up to 10 minutes (`max-age=600`) unless the URL changes. After each upload, bump the `?v=` parameter in the client extension's JavaScript URL (it is `?v=2` now). The same applies to the metric card.

## Navigation

Liferay moves between pages without reloading the document (SPA navigation), so the card listens to Liferay's `endNavigate` event: it clears the counts of the previous page, starts minimized again if the new page holds metric cards, and polls right away. The script also mounts the card again after a navigation if the body content was replaced. The client extension URL is `?v=3` since this change.
