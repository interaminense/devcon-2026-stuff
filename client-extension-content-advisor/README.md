# LDP Content Advisor

A JavaScript client extension that, for signed-in users, outlines the content blocks of a page that get the fewest clicks and asks an AI Hub agent how to improve them. It runs on any page with `data-content-id` blocks; today that is `/learn` (Surf Academy).

## How It Works

1. **Clicks.** Each block of the `sl-academy` fragment sends `Analytics.track('surfContentClicked', {contentId, contentTitle, position})` when its link is clicked.
1. **Counting.** The advisor finds the event definition with `eventDefinitions(eventType: CUSTOM, keyword: "surfContentClicked")` and counts clicks per block with `eventAnalysisResult`, broken down by the `contentId` attribute. LDP creates the definition on the first click, so no definition means no clicks yet.
1. **Rate.** Click rate = clicks ÷ page views of the current page (`page(canonicalUrl, rangeKey)`), over the last 24 hours (`RANGE_KEY`).
1. **Outline.** Blocks below the average rate are outlined, at most two: red for the weakest, orange for the next. A badge shows clicks, rate, and position.
1. **Suggestion.** Clicking the badge sends the block's position, title, text, clicks, and rate, plus the best block for comparison, to the `DEVCON_2026_LDP_CONTENT_ADVISOR` agent (see `../ai-hub/README.md`) as plain text, and shows the answer (problem, suggestion, new title, new text) in a popover. Answers are cached until the data changes.
1. **Toggle.** A floating *Content advisor: on/off* button hides the outlines.

The title and text are read from the page itself, so after the admin edits a block in the page editor, the next analysis uses the new copy.

## Hosting

| Item | Value |
|---|---|
| Document | `ldp-content-advisor.js` in Guest Documents & Media, viewable by anyone (guests load it but it does nothing for them) |
| Client extension | *LDP Content Advisor*, type JavaScript, URL `…/documents/d/guest/ldp-content-advisor-js?v=2` |
| Applied in | *Site Builder → Pages → Configuration → Design → JavaScript*, *In Page Bottom* |

## Gotchas

- **LDP drops repeated events for 5 seconds.** The key includes the user, the page, and the event name, but not the custom properties, so two clicks on different blocks by the same visitor within 5 seconds count once. Real visitors rarely do that; a traffic bot must space its clicks.
- **Plain text to AI Hub.** Its firewall rejects a context that carries nested JSON.
