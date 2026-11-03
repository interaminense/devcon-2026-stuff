# LDP Metric Card for Liferay Marketplace

The demo card as a self-contained fragment, ready to publish on Liferay Marketplace as a *Low-Code Configuration* app. Unlike the stage version, nothing is hard-coded: the LDP channel ID and the AI Hub agent come from the fragment configuration.

| Setting | What it does |
|---|---|
| LDP channel ID | The LDP property (channel) to read. The card checks that it exists. |
| Metric, Time range | Unique visitors, sessions or sessions per visitor, over 24 hours to 90 days. |
| Show AI insight | Asks the AI Hub agent about the numbers when the card renders. |
| AI Hub agent ERC | The agent to ask. It receives the numbers in a `metrics` input variable. |

When LDP or AI Hub is not connected, the card says so and what to fix instead of failing silently. Guests get no LDP data, so the card is for signed-in users.

`ldp-metrics` is the fragment set to import or zip for the Marketplace package. `build.py` regenerates `ldp-metric-card.html`, a page with the fragment's tabs to copy:

```bash
python3 marketplace/build.py
cd marketplace && zip -r ldp-metrics.zip ldp-metrics
```
