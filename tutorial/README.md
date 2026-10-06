# Build an LDP Metric Card from Scratch

Reference solutions for the from-scratch tutorial in Confluence ("DEVCON 2026 - Building an LDP Metric Card from Scratch", in the DEVCON 2026 folder). Each folder holds the whole `ldp-card.js` as it stands at the end of that step:

| Folder | Step |
|---|---|
| `step-2-hello-world` | A Custom Element that prints "Hello, World!" |
| `step-5-chart` | The LDP query through the DXP GraphQL proxy, a line chart, and a metric and period configuration |
| `step-6-objects` | The same card, with the configuration stored in the `LDPCard` Liferay Object |

Serve the folder of the step you want on port 3335 and register it as a Custom Element named `ldp-card`:

```bash
cd tutorial/step-6-objects

python3 -m http.server 3335 --bind 127.0.0.1
```
