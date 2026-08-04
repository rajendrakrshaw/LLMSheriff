# Annotation rubric — LLMSheriff behavioral states

You will see short **execution traces** from an autonomous AI agent (tool calls, LLM
steps, timings, success/failure). Your job is to choose **one** behavioral state that
best describes the overall run.

Do **not** try to infer the agent’s private thoughts. Judge only from visible events.

---

## Allowed labels (pick one)

| State | Meaning |
|---|---|
| **Completed** | The run looks successful end-to-end; diverse successful steps; goal appears done. |
| **Recovering** | Early failures, then a **new strategy** and forward progress. |
| **Waiting** | Agent is blocked on an **external dependency** (polling / pending / status checks). |
| **Stalled** | **Tight loop** of the same work action; little useful progress. |
| **Abandoned** | Long **idle gaps** / vague repeated “thinking” with weak goal progress (drift), not active polling. |
| **Executing** | Active productive work in progress, but not clearly finished. |
| **Planning** | Mostly early decomposition / strategy before substantial work. |
| **Failed** | Repeated hard failures with **no** successful recovery. |

For this study, most traces fall in the first five rows.

---

## Decision tips

1. **Waiting vs Stalled**
   - Waiting: actions like “Poll CI status: pending”, “await”, “waiting for…”
   - Stalled: repeating the same *work* action (e.g. same search) quickly

2. **Stalled vs Abandoned**
   - Stalled: short gaps, rapid repetition
   - Abandoned: large gaps between steps, slow/idle drift

3. **Recovering vs Failed**
   - Recovering: fails, then later successful alternate path
   - Failed: keeps failing without a successful turnaround

4. **Completed vs Executing**
   - Completed: strong successful continuity; looks finished
   - Executing: still mid-flight / not clearly done

---

## How to annotate

1. Open `TXXX.txt`
2. Read events top to bottom
3. Choose **one** state
4. Enter it in your CSV `state` column (exact spelling, Capitalized)
5. Optional: confidence 1–5 and a short note if unsure

Work independently. Do not discuss labels with other annotators until everyone finishes.

---

## Examples (illustrative)

- Many successful distinct steps, no failures → **Completed**
- API fails twice, then alternate API succeeds → **Recovering**
- Several “Poll CI status: pending” → **Waiting**
- Same search action 8+ times in a row → **Stalled**
- “Determine next action” repeated with long pauses → **Abandoned**
