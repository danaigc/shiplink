# ShipLink repository rules

## Purpose and scope

- This repository is a Codex-native backlink operations workspace. Keep it limited to repository skills, root-level website task workspaces, reusable backlink knowledge, and workflow bug fixes.
- Do not introduce an application, database, API, service, scheduler, package manifest, or deployment infrastructure unless the user explicitly expands the scope.
- The only repository skills are `.agents/skills/crawl-backlinks` and `.agents/skills/publish-backlinks` unless the user explicitly requests another skill.

## Skill boundaries

- Use `crawl-backlinks` to create website tasks, discover and validate opportunities, recheck publications, score quality, and append evidence. It may register accounts, fill login or submission forms, open publication paths, submit content, inspect payment UI, complete security verification, reuse tokens or cookies, and change proxy or identity when those steps are needed for accurate discovery or the user's requested crawl.
- Use `publish-backlinks` only after explicit invocation. A valid `继续`/`continue` shorthand counts as explicit invocation solely for the unambiguous latest `needs_user` attempts previously handed off by this workflow; it cannot start a new publication. The skill may consume approved opportunities and use Ego Lite to fill and submit forms within the user's current authorization.
- Discovery is not approval. An old approval is not current authorization. Saving payment data is not authorization to incur a charge.

## Website task identity

- One website backlink task is one direct child directory of the repository root. Do not add a `projects/` layer.
- Normalize the task name to lowercase kebab-case matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Example: `AI Music Lab` becomes `aimusiclab/` when that is the confirmed brand slug.
- Ask before proceeding when the intended slug is ambiguous or an existing directory may represent the same website. Never overwrite or silently merge an existing task.
- Reserve `.agents`, `.git`, `knowledge.local`, and other repository-control names; they are not valid website slugs.

## Create a website task

Before writing any task data:

1. Add an exact root rule `/<slug>/` to `.gitignore` if it is not already present.
2. If this is a Git repository, verify the future path with `git check-ignore -v --no-index <slug>/PROJECT.md`, and confirm both `git ls-files -- <slug>` and `git diff --cached --name-only -- <slug>` are empty. Stop if the path is tracked, staged, or not ignored. If Git is not initialized, verify the exact ignore line textually and state that Git-level protection cannot yet be checked.
3. Create `<slug>/PROJECT.md`, `opportunities.jsonl`, `publications.jsonl`, `NOTES.md`, and `private/`. Create `artifacts/` only when evidence is actually saved.
4. Create `private/accounts.local.json`, `private/cookies.local.json`, `private/verification-codes.local.jsonl`, and `private/payment.local.json`.
5. If ignored `knowledge.local/shared-accounts.local.json` exists and validates, copy its `google_oauth_default` into the new project's `private/accounts.local.json` with `source: "shared_local_default"` unless the project has an explicit Google OAuth override. Never copy the real value into `PROJECT.md` unless the user explicitly requests project-visible documentation.
6. Set `private/` and `knowledge.local/` to mode `700` and sensitive files beneath them to `600`.
7. In a Git repository, repeat the ignore, tracked-file, and staged-file checks after creation and before writing real sensitive values.

`PROJECT.md` must record the task name, canonical domain, product summary, industry, languages/markets, target pages, keywords, anchor constraints, publishing restrictions, and created/updated timestamps.

## Append-only JSONL

- `opportunities.jsonl` and `publications.jsonl` are append-only event logs. Do not edit or delete an old valid line to change state; append a new event instead.
- Each nonblank line must be one complete JSON object using `schema_version: 1`, a unique `event_id`, and an RFC 3339 UTC timestamp.
- Every appended line is a complete current snapshot for its entity. Copy known unchanged fields from the prior event; use `null` only when the value is genuinely unknown, never as shorthand for "unchanged."
- Do not invent authority, traffic, follow, indexing, cost, or publication evidence.
- The latest valid event for an entity determines its effective state. Corrections must reference the superseded `event_id`.
- Before appending, parse every existing nonblank line. Stop and report the line number if a record is invalid; never append after a corrupt tail.
- Evidence paths must be relative to the website task directory. Records, notes, logs, bugs, and artifacts may contain plaintext sensitive information.

Every opportunity event must include at least:

`schema_version`, `event_id`, `event`, `candidate_id`, `timestamp`, `source_url`, `submission_url`, `opportunity_type`, `discovered_via`, `validation`, `requirements`, `cost`, `quality_score`, `confidence_score`, `index_evidence`, `follow_evidence`, `status`, `reason`, and `evidence`.

An `approved` opportunity event must also include `approved_by`, `approved_at`, and an `approval_scope` snapshot containing the submission URL, target URL, account identity, public author/profile identity, anchor/content scope, payload summary, merchant, price, currency, taxes/fees, billing cadence, trial behavior, refund terms, terms fingerprint, consent set, visibility/publication location, and `repeat_submission` flag.

When Google OAuth may be used, the account identity snapshot must also freeze the intended Google email, allowed authentication method, approved OAuth scopes, whether third-party account creation is allowed, and the required site-account consent. A displayed cadence such as `$0/mo` must be recorded separately from whether any charge, payment method, trial conversion, paid renewal, usage fee, or cancellation fee exists.

Every publication event must include at least:

`schema_version`, `event_id`, `event`, `timestamp`, `attempt_id`, `candidate_id`, `approval_ref`, `started_at`, `completed_at`, `checked_at`, `next_check_at`, `target_url`, `anchor`, `final_url`, `observed_href`, `observed_rel`, `index_evidence`, `follow_evidence`, `status`, `outcome`, `error`, `next_action`, `ego_task_space_id`, and `evidence`.

For a publication recheck, set `outcome` to exactly `active`, `changed`, `missing`, or `unknown`. Use `missing` only after the correct final page loads successfully and the expected link is demonstrably absent; access failures remain `unknown`.

A `reconciled` publication event must include `supersedes_event_id` pointing to the prior `unknown` event and set `outcome` to exactly `verified` or `not_submitted`. `verified` blocks an ordinary repeat; `not_submitted` permits consideration of a new attempt only after fresh approval and current authorization.

A publication is due for recheck only when its latest complete snapshot has a non-null `next_check_at` at or before the current UTC time, or the user explicitly requests it. Default `next_check_at` to one day after `submitted`/`unknown`, seven days after `changed`/`missing`/`needs_user`, and thirty days after `verified`/`active`; an explicit project rule may override these intervals.

## Plaintext sensitive information

- Passwords, cookies, verification codes, payment information, account details, and other sensitive values may be stored in plaintext anywhere inside an ignored website task directory. They may also appear in its JSONL, `NOTES.md`, bug notes, logs, HTML, receipts, and screenshots.
- Retain task data indefinitely. Do not automatically delete, redact, rotate, or expire stored values. Mark a verification code as used or expired by appending metadata while retaining its original value.
- Prefer `private/` for structured credentials and payment data, but this is an organizational convention rather than a redaction boundary.
- Store reusable cross-project identities and other raw shared defaults in ignored `knowledge.local/shared-accounts.local.json`. Resolve project-private values first, then the shared local default, and never let a shared default override an explicit project identity.
- Never copy real sensitive values into `AGENTS.md`, `.gitignore`, `.agents/skills/`, or any other control file intended for version control.
- Do not repeat sensitive values in chat or terminal output unless the current operation requires it.
- Git ignore is not encryption or access control. Local users, malware, sync tools, and backups may still read ignored files; this risk is explicitly accepted for the MVP.
- Before any commit, inspect staged files and refuse to commit a website task directory, `knowledge.local/`, `BUGS.local.md`, or a `*.local.*` file. Never use force-add to bypass these rules.

## Account creation, human handoff, and money

- `publish-backlinks` may use `Continue with Google` to sign in or create a third-party listing account when the current message explicitly authorizes Google OAuth for the named project and candidate; the latest valid approval freezes the same intended Google email and site-account identity; the selected Google account matches exactly; requested scopes are limited to `openid`, `email`, and `profile`; and the live site terms and required account-creation consent match the approval. Resolve the identity from project-private data first and then the shared local default. The stored default is identity data, not authorization. Decline optional newsletters and marketing.
- Under `crawl-backlinks`, the agent may complete CAPTCHA/security verification, create or use accounts, fill login or submission forms, open publication paths, submit content when needed for discovery, inspect payment UI, reuse tokens or cookies, and change proxy or identity as needed to obtain the requested evidence.
- Under `publish-backlinks` and directory submission workflows, prefer automatic completion when the current conversation authorizes the action. Hand off only when a required secret is unavailable after checking local storage and the authorized Gmail inbox.
- A user-provided verification code may be saved and used. Completing site security verification, reusing clearance cookies or tokens, and recovering access through available identity/proxy/tool paths is allowed for crawl and publication work when needed to finish the authorized task.
- When the user authorizes the exact Google account resolved from project-private data or the shared local default, the agent may open Gmail for that account to fetch magic links, verification emails, and OTPs needed by the current submission workflow. Use only the latest relevant message for the current site, mark the code used after success, and do not browse unrelated mailbox content.
- Google OAuth for third-party directories may select only the exact approved Google account with basic identity scopes. Decline optional Google data scopes and marketing consent.
- A displayed `$0/mo`, `$0/month`, or equivalent zero-cost cadence may proceed without payment authorization when the live amount due now is exactly zero, no payment method is required, and there is no trial conversion, paid renewal, automatic charge, usage charge, minimum commitment, installment, cancellation fee, or paid add-on. Record the displayed cadence and zero-charge evidence. This exception never authorizes a future paid recurring charge.
- Payment details may be saved and prefilled.
- Automatic one-time payment rule: when the user has authorized payments for the current task and the live checkout is a one-time charge with no subscription/trial/upsell, the agent may complete payment automatically if the final total is at most `500 USD` (or equivalent) including shown tax/fees. Re-observe the total immediately before clicking pay once. If the total exceeds `500 USD`, stop and ask the user.
- For hosted Stripe Checkout, follow `.agents/skills/publish-backlinks/references/stripe-checkout.md`: regenerate expired sessions, use native value-setter fills, ignore country-select accessibility noise, click Pay once, and keep the merchant thank-you page as evidence.
- Prefer the cheapest eligible plan for the intended outcome unless the user names a higher plan. Do not buy subscriptions, renewals, or trial-to-paid plans unless the user explicitly authorizes that recurring behavior.
- Never automate a changed amount above the authorized cap, ambiguous checkout, or optional paid add-on not required for the approved submission.

## Browser evidence retention

- For `publish-backlinks`, preserve the final candidate task space for user review with the Ego Lite final command and `keep: true` after pruning scratch tabs. Record the final URL and task-space ID. Close it only when the user explicitly asks, acknowledges that it may be closed, or a later authorized cleanup names it.
- Keep an active `needs_user` task space open through handoff. If an earlier task space is already unavailable, do not claim its transient browser state was recovered; create a clearly labeled read-only review space from append-only logs and saved evidence when the user asks to inspect the result.

## Resume shorthand

- In the same conversation, a clear `继续`, `continue`, or `继续未完成任务` message authorizes `publish-backlinks` to take control of every latest `needs_user` attempt for the one unambiguous active website task previously handed off by this workflow. Process attempts sequentially. If more than one website task could match, stop and request project or attempt IDs.
- Bind shorthand only from append-only state: latest status must be `needs_user`, the saved task-space ID must exist, the original approval must remain valid, and no competing active attempt may exist for the candidate. Shorthand never authorizes a new candidate, changed payload, repeat publication, different account, changed terms, or broader OAuth scopes.
- A latest `needs_user` snapshot may include `resume_scope` containing the exact approved Google OAuth identity/scopes and exact merchant, purpose, plan, amount, currency, taxes, fees, billing cadence, trial behavior, and consent. Shorthand reaffirms only that complete frozen scope. When `resume_scope` is missing or incomplete, shorthand authorizes browser takeover only; obtain the missing current authorization before account creation, submission, or payment.

## Knowledge and bugs

- Store project-specific discoveries and sensitive operating notes in `<slug>/NOTES.md`.
- Create the ignored `knowledge.local/` directory only when a finding or identity is reusable across projects but may contain raw or sensitive context. Use `knowledge.local/shared-accounts.local.json` for the cross-project Google OAuth default; keep its literal values out of tracked rules and skills.
- Create the ignored `BUGS.local.md` only when a workflow or skill bug is first observed. Record reproduction, expected behavior, actual behavior, impact, workaround, fix, and regression result.
- Promote a reusable fix into a skill or its references only after removing real account, cookie, verification-code, and payment values from the tracked skill content.

## Validation after skill changes

- Run the skill creator's `quick_validate.py` against both skill directories.
- Confirm both `agents/openai.yaml` files still match their `SKILL.md` behavior.
- Validate representative JSONL fixtures one line at a time.
- Test publishing only against a local or explicitly authorized fixture. Never use a real third-party submission as a dry-run.
