# Live Demo

The LDP Fragment Card built live on stage, one topic at a time, in the *DEVCON Demo* site (`/web/devcon-demo`). Each topic is a full fragment: paste its tabs over the previous ones in the fragment editor.

## Topics

| Folder | Topic | What changes |
|---|---|---|
| `topics/topic-1` | Connect to LDP and fetch data | `fetchData` and `fetchLDPData` read one metric through the DXP GraphQL proxy; the card shows the value and the trend. |
| `topics/topic-2` | Two cards with different metrics from the same fragment | A metric select in each card, and the chart. |
| `topics/topic-3` | Configure each card with fragment configuration | The select moves to the fragment configuration (`index.json`): metric and time range per card. |
| `topics/topic-4` | Get data insights with AI Hub | The *AI insight* button asks the `DEVCON_2026_DEMO_LDP_METRIC_INSIGHT` agent about the card's numbers. |
| `topics/topic-5` | Taking actions with Objects and notifications | *Notify marketing team* saves the insight as an Insight Alert, which notifies the Marketing Team role. |

A topic folder has only the tabs that change; a missing tab keeps the previous topic's code.

## Set Up the Site

1. *Design → Fragments*: create the set *DEVCON Demo* and a basic fragment *LDP Fragment Card*, with the tabs of topic 1.
1. *Site Builder → Pages*: create a blank page, add a Grid with two modules, and drop the fragment into both.
1. For topic 4, create the agent: a copy of the *LDP Metric Insight* agent in `../swell-lab/ai-hub/README.md`, with the external reference code `DEVCON_2026_DEMO_LDP_METRIC_INSIGHT`.
1. For topic 5, create the notification setup below once.

## Notifications

`notifications` has what topic 5 needs, exported from the cloud DXP:

| File | Create it with |
|---|---|
| `insight-alert.object-definition.json` | `POST /o/object-admin/v1.0/object-definitions`, then `POST .../object-definitions/{id}/publish`. Its REST API is `/o/c/insightalerts`. |
| `insight-alert.notification-template.json` | `POST /o/notification/v1.0/notification-templates`, adding `objectDefinitionId`. Without `editorType` the call fails with a 500. |
| `notify-marketing-team.object-action.json` | `POST /o/object-admin/v1.0/object-definitions/{id}/object-actions`, adding the template's `notificationTemplateId` to `parameters`. |

Then create the regular role *Marketing Team* and assign the people to notify. In *Define Permissions*, give it *View* on Insight Alert entries (only people who can view an alert are notified) and *Access in Control Panel* on the Insight Alerts application, plus *View Control Panel Menu*, so the notification link opens the alert.

## Live Demo Pages

`live-demo` generates the pages used on stage: `live-demo.html` has the code of every topic in tabs, with copy buttons and the animated *Diagram Flow* and *Notification Flow*; `live-demo-offline.html` adds how to rehearse on a local DXP without internet.

```bash
python3 demo/live-demo/build.py
python3 demo/live-demo/build.py offline
```
