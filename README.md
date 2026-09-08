# daily-findings

A public, opinionated log of notable AI findings and changing assessments.

This is not a comprehensive AI news feed. The value is in the filter: what is worth noticing, why it matters, what is not worth trying yet, and what would change that assessment.

## Principles

- Prefer meaningful deltas over release volume.
- Keep the observer's baseline and bias visible instead of pretending to be neutral.
- Separate facts, interpretation, and current assessment.
- Preserve changes of mind over time rather than rewriting history.
- Make the same underlying information useful to both humans and agents.
- Do not publish noise just to satisfy a daily cadence; some days may have no findings.

## Content model

The repository starts with three deliberately small concepts:

- **Topic** — a model, architecture, runtime, technique, tool, or other subject being tracked.
- **Finding** — new evidence or a meaningful change that is worth recording.
- **Assessment** — an evaluation of a topic at a particular point in time.

Assessments use a small status vocabulary:

- `TRY` — worth spending time to evaluate now.
- `WATCH` — important enough to track, but not worth acting on yet.
- `HOLD` — promising, but blocked by a concrete issue.
- `EXCLUDE` — not worth further attention unless something materially changes.

A **reevaluation trigger** records what would cause the current judgment to be revisited.

## Layout

```text
content/
  topics/
  findings/
  assessments/
schema/
  status.schema.json
  topic.schema.json
  finding.schema.json
  assessment.schema.json
```

The content files are intended to remain the source of truth. A website, feeds, JSON APIs, WebMCP tools, AEO experiments, analytics, and other projections can be built on top without redefining the underlying information model.

## Initial scope

Keep the first version intentionally small:

1. Track a handful of topics.
2. Record findings only when a meaningful delta appears.
3. Append assessments instead of overwriting historical judgment.
4. Expose the same information to humans and agents.

Framework, Cloudflare runtime details, storage, analytics, and automation are intentionally left open until the content model proves useful.
