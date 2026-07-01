# czypadalo

Angular app — see `PLAN.md` for the full project plan.

## Language

- Project documentation (`PLAN.md`, `CLAUDE.md`, and any other markdown docs added to this repo), code, comments, and commit messages must be in English, even if the conversation with the user is in another language.
- All user-facing UI text (labels, verdicts, error messages, button copy) must be in Polish — this is a Polish-audience app.

## Commit message convention

- Format: `<type>: <lowercase summary>` — e.g. `feat: add rain verdict component`.
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`.
- Summary is lowercase, in English, imperative mood, no trailing period.

## Working through the plan

- `PLAN.md`'s implementation steps are checklist items. Each step must be presented to the user for acceptance *before* implementing it, and checked off (`- [x]`) in `PLAN.md` only after the user has accepted the finished result.
- Keep steps small: prefer more steps with a narrow, single-purpose scope over fewer large ones. If a step turns out to be too broad while working on it, split it into smaller checklist items instead of doing it all at once.
- Never batch multiple unaccepted steps together — one step in flight at a time.
- After the user confirms a step is good, create a git commit for that step (including checking off the box in `PLAN.md`) before moving to the next step. Never commit before confirmation.

## Learning documentation

Maintain a short `LEARNING.md` alongside the code, capturing which Angular patterns were used and where (e.g. "signals for X in `foo.service.ts`", "resource() for fetching Y"). Keep entries brief — a few lines per pattern, not tutorials. Update it as steps are completed, not as a separate pass at the end.

## Skills

This project has Angular skills installed (`.claude/skills/`, from https://github.com/angular/skills):

- `angular-new-app` — use when initializing a new Angular project (`ng new` and initial setup).
- `angular-developer` — use when writing or reviewing Angular code (components, services, signals, routing) to follow current, idiomatic framework patterns.

Always reach for these skills when working with Angular code in this repo, instead of relying solely on general knowledge.
