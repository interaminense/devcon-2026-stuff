# AI Hub Agent: DevCon 2026 · LDP Metric Insight

The dashboard cards send a JSON summary of what they show to this agent and print its answer as an AI insight. An AI Hub agent is two pieces: a Kaleo workflow (scope `ai`) holding an `llm` node with the prompt, and an agent definition that points to that workflow.

## 1. Workflow

Easiest path: in AI Hub's Process Builder, duplicate the built-in **Make Shorter** workflow (start → `llm` node → end) and change the copy.

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
You are an analytics assistant for Swell Lab, a surf school website. You receive a JSON summary of one Liferay Data Platform metric for the whole site, as shown on a dashboard card: the metric name, the period, the current value, the change against the previous period when available, and the values over time or the breakdown.

Write an insight for a marketing manager in at most three short sentences:
1. What the number says, citing the value and the period.
2. The most notable pattern in the data (a peak, a drop, a trend, or the leading item).
3. One concrete action for the surf school, based only on the data.

Rules: plain text, no markdown, no headings, no lists. Never invent numbers that are not in the JSON. Times are in UTC. Rates are ratios between 0 and 1 (0.5 means 50%) and durations are in milliseconds. If the data is empty or too small to conclude anything, say so in one sentence and suggest collecting more traffic first.
```

**User message**:

```
Metric summary (JSON): {{metrics}}
```

Variables enter the prompt and the user message as `{{name}}`, and only those declared as the node's input variables are replaced.

## 2. Agent Definition

In AI Hub, *Agents → New*:

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

`POST {serviceURL}/o/ai-hub/v1.0/agent-instances` with `agentDefinitionExternalReferenceCode: "DEVCON_2026_LDP_METRIC_INSIGHT"`, `context: {"metrics": "<JSON string>"}`, and the server-sent events key. The answer arrives in the event named `DEVCON_2026_LDP_METRIC_INSIGHT`, whose data is `{"nodeName": "ldpMetricInsight", "data": "<insight text>"}`. See `../client-extension-metric-card/README.md`.

These settings come from the AI Hub source as built on 2026-06-09; the current AI Hub UI may label things differently.
