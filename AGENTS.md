# Agent Instructions

## Code Style
- Write dense, compact code. Do not add a newline for every new expression, argument, or chained call.
- Combine related logic onto single lines where it remains readable — prefer horizontal density over vertical sprawl.
- Never sacrifice clarity for compactness, but never sacrifice compactness for the sake of "airiness."
- No unnecessary blank lines between closely related statements.
- Avoid over-commenting. Code should speak for itself; comments only where the why is non-obvious.

## Command Execution
- Do not run a chain of commands speculatively hoping the output will satisfy. Know what you're running and why before you run it.
- Approval to proceed is not a blank check to burn through commands. Treat each command as a cost.
- If a sequence of commands could produce an undesirable intermediate state, pause and confirm before executing.
- Prefer one deliberate command over three exploratory ones.

## Output
- When asked to produce a file, produce the complete file. Never output fragments, partials, or placeholders like "rest unchanged."
- Do not summarize what you did after completing a task unless asked.
- Do not explain what you didn't change.

## Autonomy
- Make decisions. Do not stall mid-task asking for clarification on things you can reasonably infer.
- If genuinely blocked on something ambiguous, ask once, specifically, before doing anything — not after running five commands.
- When told to stop, stop. No summary, no explanation, no "I've halted."