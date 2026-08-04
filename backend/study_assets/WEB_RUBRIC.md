# Labeling guide

Your task is to assign **one** label to the entire execution trace.

Base your decision only on the observable events. Do not infer the agent’s private thoughts or intentions.

Choose the label that best describes the **overall** behavior of the run — especially how it ends. Do not label only the first half or a single step.

If you are unsure between two labels, choose the best match near the **end of the run** and use the confidence rating to show uncertainty.

## Labels (pick one)

### Completed
The goal appears to have been successfully completed by the end of the trace.
Example: many different successful steps; the run looks finished.

### Recovering
The run encounters failures but later changes strategy and resumes meaningful progress.
Example: API fails twice, then a different API succeeds.

### Waiting
Progress is paused because the agent is waiting on an external system or event.
Example: “Poll CI status: pending”, “await”, “waiting for…”.

### Stalled
The run repeatedly performs nearly identical work without meaningful progress.
Example: the same search runs 8+ times in a row.

### Abandoned
Long idle periods suggest the run is no longer actively pursuing the goal.
Example: “Determine next action” repeated with long gaps.

### Executing
The agent is still doing productive work, but the goal is not clearly finished yet.

### Planning
Most of the trace is early decomposition or strategy before substantial work.

### Failed
The run keeps failing and never finds a successful recovery path.

## If two labels feel close

Waiting vs Stalled
• Waiting = paused on an external status (pending / poll / await)
• Stalled = repeating nearly the same work action without progress

Stalled vs Abandoned
• Stalled = fast repeats, short gaps
• Abandoned = long idle gaps; no longer actively pursuing the goal

Recovering vs Failed
• Recovering = fails, then later succeeds with a new strategy
• Failed = keeps failing with no successful recovery

Completed vs Executing
• Completed = goal looks done by the end
• Executing = still mid-way / not clearly finished

## Confidence

1 = Guessing
2 = Low
3 = Moderate
4 = High
5 = Very high

## On this website

1. Read events top to bottom
2. Pick one label
3. Set confidence
4. Optional note
5. Save & next

There are no right or wrong answers. Choose the label that best matches your interpretation of the observable behavior.
