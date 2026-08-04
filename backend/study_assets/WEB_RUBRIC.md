# Judgment rules (simple)

Your job: read the event log, then pick **one** label for the whole run.

**Only use what you can see.** Do not guess what the agent was “thinking.”

Most answers in this study are: Completed, Recovering, Waiting, Stalled, or Abandoned.

## What each label means

### Completed
The run looks finished and successful.
Example: many different successful steps, goal looks done.

### Recovering
It failed at first, then tried something else and made progress.
Example: API fails twice, then a different API works.

### Waiting
It is stuck waiting on something outside itself.
Example: “Poll CI status: pending”, “await”, “waiting for…”.

### Stalled
It keeps doing the **same work** again and again, fast, with little progress.
Example: the same search action 8+ times in a row.

### Abandoned
It drifted / idled — long pauses, weak progress, not actively polling.
Example: “Determine next action” with long gaps between steps.

### Executing
Still working usefully, but not clearly finished yet.

### Planning
Mostly early planning / breaking down the task, before real work.

### Failed
Keeps failing and never finds a successful path.

## Easy ways to choose between similar labels

**Waiting or Stalled?**
- Waiting = checking an outside status (pending / poll / await)
- Stalled = repeating the same work action quickly

**Stalled or Abandoned?**
- Stalled = fast repeats, short gaps
- Abandoned = long gaps, slow / idle

**Recovering or Failed?**
- Recovering = fails, then later succeeds another way
- Failed = fails and never recovers

**Completed or Executing?**
- Completed = looks done
- Executing = still mid-way

## On this website

1. Read the events from top to bottom
2. Tap one label
3. Optional: confidence + short note
4. Save & next

Please work alone. Do not discuss labels with other annotators until everyone finishes.
