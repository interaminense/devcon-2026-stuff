# AI Hub Agent: DevCon 2026 · LDP Metric Insight

The dashboard cards send a JSON summary of what they show to this agent and print its answer as an AI insight. An AI Hub agent is two pieces: a Kaleo workflow (scope `ai`) holding an `llm` node with the prompt, and an agent definition that points to that workflow.

## 1. Workflow

In AI Hub the workflow belongs to an agent and is opened from it. Easiest path: *Agent Builder* → the built-in **Make Shorter** agent → *Actions* → *Duplicate*; then *Actions* → *View* on the copy, fill in the agent fields below and *Save*, and click *View Workflow* to edit the workflow (start → `llm` node → end). After editing the node, click *Update*.

| Setting | Value |
|---|---|
| Workflow name | `DevCon 2026 LDP Metric Insight` |
| LLM node name | `ldpMetricInsight` |
| Input variables | `[{"name":"metrics","type":"string"}]` |
| Output variables | `[{"name":"insight","type":"string"}]` |
| Tools / RAG | none |

Publish the workflow; an unpublished workflow does not show up in the agent form.

**Prompt** (system message):

```
You are an analytics assistant for Swell Lab, a surf school website. You receive a summary of one Liferay Data Platform metric for the whole site, as shown on a dashboard card: the metric name, the period, the current value, the change against the previous period when available, and the values over time or the breakdown.

Write an insight for a marketing manager in at most three short sentences:
1. What the number says, citing the value and the period.
2. The most notable pattern in the data (a peak, a drop, a trend, or the leading item).
3. One concrete action for the surf school, based only on the data.

Rules: plain text, no markdown, no headings, no lists. Never invent numbers that are not in the summary. Times are in UTC. Rates are ratios between 0 and 1 (0.5 means 50%) and durations are in milliseconds. If the data is empty or too small to conclude anything, say so in one sentence and suggest collecting more traffic first.
```

**User message**:

```
Metric summary:
{{metrics}}
```

Variables enter the prompt and the user message as `{{name}}`, and only those declared as the node's input variables are replaced.

## 2. Agent Definition

In *Agent Builder*, on the duplicated agent (*Actions* → *View*):

| Field | Value |
|---|---|
| Enable agent | on |
| Title | `DevCon 2026 · LDP Metric Insight` |
| External reference code | `DEVCON_2026_LDP_METRIC_INSIGHT` (the cards call this ERC) |
| Description | `Turns a Liferay Data Platform metric summary from the Swell Lab dashboard (DEVCON 2026) into a short insight with one recommendation. Use only for LDP metric insights.` |
| Input variables | `metrics` |
| Output variable | `insight` (must match the node's output variable) |
| Workflow | `DevCon 2026 LDP Metric Insight` |

## How the Cards Call It

`POST {serviceURL}/o/ai-hub/v1.0/agent-instances` with `agentDefinitionExternalReferenceCode: "DEVCON_2026_LDP_METRIC_INSIGHT"`, `context: {"metrics": "<plain text summary>"}`, and the server-sent events key. The answer arrives in the event named `DEVCON_2026_LDP_METRIC_INSIGHT`, whose data is `{"nodeName": "ldpMetricInsight", "data": "<insight text>"}`. See `../client-extension-metric-card/README.md`.

These settings come from the AI Hub source as built on 2026-06-09; the current AI Hub UI may label things differently.

## Firewall

AI Hub sits behind a firewall that rejects request bodies whose context carries nested JSON, answering with an HTML 403 without CORS headers. The cards therefore send the summary as plain text lines (`metric: ...`, `period: ...`, `valuesOverTime: key ..., value ...; ...`). The prompt above refers to "a summary" for that reason; an agent created with the earlier "JSON summary" wording still works.

# AI Hub Agent: DevCon 2026 · LDP Content Advisor

Used by the Content Advisor client extension on `/learn`. It receives one under-performing content block of the page (its position, title, text, clicks, and click rate) plus the best block for comparison, and suggests how to improve it.

## Workflow

Duplicate the **Make Shorter** agent again, then edit its workflow through *View Workflow*:

| Setting | Value |
|---|---|
| Workflow name | `DevCon 2026 LDP Content Advisor` |
| LLM node name | `ldpContentAdvisor` |
| Input variables | `[{"name":"contents","type":"string"}]` |
| Output variables | `[{"name":"suggestions","type":"string"}]` |
| Tools / RAG | none |

**Prompt** (system message):

```
You are a content editor for Swell Lab, a surf school website. You receive click data from Liferay Data Platform for one content block that gets fewer clicks than the others on a page, and the best block on the same page for comparison: position on the page, title, text, clicks, its share of all clicks on the page, and click rate (clicks divided by page views). With 12 contents, the average share is about 8%.

Find the main reason the block under-performs. Pick exactly one problem type:
- position: it sits too low on the page, while its title and text are fine;
- unappealing: the title is generic and promises no clear benefit;
- poor text: the text is too short, vague, or has no call to action.

Answer in exactly four lines, with these labels and nothing else:
Problem: <position, unappealing, or poor text> - <one short sentence citing the numbers>
Suggestion: <one concrete action for the page admin>
New title: <a better title, at most 8 words>
New text: <a better text, at most 30 words, in the tone of the best block>

Rules: plain text, no markdown. Never invent numbers that are not in the data. If the problem is only the position, still write a new title and text that keep the original meaning.
```

**User message**:

```
Content data:
{{contents}}
```

## Agent Definition

| Field | Value |
|---|---|
| Enable agent | on |
| Title | `DevCon 2026 · LDP Content Advisor` |
| External reference code | `DEVCON_2026_LDP_CONTENT_ADVISOR` |
| Description | `Suggests how to improve an under-performing content block of the Swell Lab site (DEVCON 2026), from its Liferay Data Platform click data. Use only for LDP content advice.` |
| Input variables | `contents` |
| Output variable | `suggestions` |
| Workflow | `DevCon 2026 LDP Content Advisor` |

# AI Hub Agent: DevCon 2026 · LDP Next Posts

Used by the *LDP Next Posts* client extension on the Swell Lab `/blog` page. It receives every published post of the *Swell Lab CMS* space with its Liferay Data Platform numbers for the last 7 days and suggests the next three posts. The card turns each idea into a CMS draft on request.

## Agent

In *Agent Builder*, duplicate **Make Shorter** and, on the copy (*Actions* → *View*):

| Field | Value |
|---|---|
| Title | `DevCon 2026 LDP Next Posts` |
| Description | `Suggests the next Swell Lab blog posts from their Liferay Data Platform impressions and views (DEVCON 2026).` |
| External reference code | `DEVCON_2026_LDP_NEXT_POSTS` |
| Input variables | `posts` |
| Output variable | `ideas` |

## Workflow

*View Workflow* → the LLM node:

| Setting | Value |
|---|---|
| Node Name | `ldpNextPosts` |
| Input variables | `[{"name":"posts","type":"string"}]` |
| Output variables | `[{"name":"ideas","type":"string"}]` |
| Tools | `[]` (never empty) |
| RAG | `{}` (never empty) |

**Prompt**:

```
You are a content strategist for Swell Lab, a surf school. You receive its blog posts with Liferay Data Platform numbers for a period: impressions (times the post was listed), views (times it was opened), and open rate (views divided by impressions).

Suggest exactly 3 new blog posts. Build on the topics readers open most and never repeat an existing title. Answer each post in exactly four lines:
Title: <at most 8 words>
Subtitle: <one sentence>
Why: <one sentence that cites the numbers>
Outline: <three points separated by semicolons>

Separate the posts with one empty line. Plain text, no markdown, no numbering. If every post has zero impressions, still suggest 3 posts from the existing titles and say in Why that there is no data yet.
```

**User message**:

```
Blog posts:
{{posts}}
```

After *Update*, open *Source* and check that `<prompt>` still holds the text and that `<tools>` and `<rag>` are `[]` and `{}`.
