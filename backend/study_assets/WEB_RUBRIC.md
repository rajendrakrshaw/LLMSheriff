# Judgment rules — how to label each trace

You will see short execution traces from an autonomous AI agent (tool calls, LLM steps, timings, success/failure). Choose **one** behavioral state that best describes the **overall** run.

Do **not** guess the agent’s private thoughts. Judge only from the events you can see.

## Allowed labels (pick one)

• **Completed** — The run looks successful end-to-end; diverse successful steps; the goal appears done.

• **Recovering** — Early failures, then a new strategy and clear forward progress.

• **Waiting** — Blocked on an external dependency (polling, pending, status checks).

• **Stalled** — Tight loop of the same work action; little useful progress.

• **Abandoned** — Long idle gaps or vague repeated “thinking” with weak goal progress (drift), not active polling.

• **Executing** — Active productive work in progress, but not clearly finished.

• **Planning** — Mostly early decomposition / strategy before substantial work.

• **Failed** — Repeated hard failures with no successful recovery.

Most traces in this study fall in the first five labels.

## Decision tips

1. Waiting vs Stalled
• Waiting: “Poll CI status: pending”, “await”, “waiting for…”
• Stalled: repeating the same work action (e.g. same search) quickly

2. Stalled vs Abandoned
• Stalled: short gaps, rapid repetition
• Abandoned: large gaps between steps, slow/idle drift

3. Recovering vs Failed
• Recovering: fails, then later a successful alternate path
• Failed: keeps failing with no successful turnaround

4. Completed vs Executing
• Completed: strong successful continuity; looks finished
• Executing: still mid-flight / not clearly done

## How to annotate on this site

1. Read the events top to bottom
2. Tap one state
3. Optionally add confidence (1–5) and a short note
4. Save & next

Work independently. Do not discuss labels with other annotators until everyone finishes.

## Quick examples

• Many successful distinct steps, no failures → Completed
• API fails twice, then alternate API succeeds → Recovering
• Several “Poll CI status: pending” → Waiting
• Same search action 8+ times in a row → Stalled
• “Determine next action” repeated with long pauses → Abandoned
