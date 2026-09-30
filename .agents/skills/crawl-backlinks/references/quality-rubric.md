# Backlink opportunity quality rubric

Use this reference for both new opportunities and publication rechecks. Preserve raw observations separately from the judgment derived from them.

## Hard stops

Do not qualify a candidate when any of these is true:

- crawling or the intended use is disallowed by a clear robots restriction or site terms that the user has not authorized overriding for this task;
- the page or domain is malicious, hacked, deceptive, a link farm, an obvious PBN, or dominated by irrelevant paid links;
- the submission requires impersonation, hidden links, or misleading content;
- the source page is confirmed to be persistently blocked by `noindex`, returns a definitive `404`/`410`, or is canonicalized to an unrelated page;
- the only observed placement is `nofollow`, `ugc`, `sponsored`, hidden, sitewide boilerplate, JavaScript-only without a crawlable link, or an indirect redirect when a direct follow link is required;
- a required price, recurring charge, or material requirement is confirmed to violate the project's constraints.

Use `needs_review`, not `rejected`, when a material fact is merely unavailable. Transient timeouts, rate limits, DNS/TLS failures, browser failures, unresolved verification after available recovery methods, unknown price, and unknown requirements are review blockers rather than hard rejections. Login walls, paywalls, CAPTCHA, accounts, forms, publication paths, submission flows, payment UI, tokens, cookies, proxies, and identity changes are allowed recovery paths rather than automatic hard stops.

## Weighted score

Score each known factor from 1 to 5. Scores 2 and 4 cover values between the anchors. An unknown factor is `null`, contributes zero to `quality_score`, and lowers `confidence_score`.

| Factor | Weight | Score 5 | Score 3 | Score 1 |
| --- | ---: | --- | --- | --- |
| Domain authority | 25 | Established real authority; strong trusted references | Credible niche site | Thin, abandoned, inflated, or very weak site |
| Topical relevance | 25 | Same niche and directly relevant subtopic | Same broad field | Unrelated topic |
| Linking-page traffic | 15 | Strong, evidenced real traffic | Modest evidenced traffic | No meaningful evidenced traffic |
| Placement/context | 15 | Editorial body citation or strong resource context | Legitimate profile/about context | Footer, template, hidden, or link-list placement |
| Anchor flexibility | 10 | Natural descriptive or brand-appropriate control | Brand or naked URL only | Manipulative exact-match requirement or poor context |
| Follow evidence | 10 | Actual comparable direct follow links observed | Mixed or incomplete evidence | Nofollow/UGC/sponsored-only evidence |

Calculate:

`quality_score = sum(weight * score / 5)` with unknown factors contributing zero.

Set `confidence_score` from the share and reliability of evidence: direct page inspection and dated provider evidence are stronger than snippets, estimates, or unsourced claims. Never let confidence exceed the percentage of weighted factors supported by evidence.

## Status thresholds

- `qualified`: no hard stop, `quality_score >= 80`, `confidence_score >= 70`, fresh `indexed_observed` evidence, and observed follow capability.
- `needs_review`: no hard stop but a key fact is unknown, evidence is stale, `quality_score` is 60-79, or confidence is below 70.
- `rejected`: a hard stop applies or `quality_score < 60` with enough evidence to support the decision.
- `stale`: the prior decision depends on evidence that is no longer fresh or the page materially changed.

Project-specific rules may make these thresholds stricter but never silently weaken a global hard stop.

## Follow evidence

Record the exact observed element or HTML evidence when possible:

- `follow_observed`: a direct crawlable `<a href>` lacks `nofollow`, `ugc`, and `sponsored`; page-level meta robots and `X-Robots-Tag` do not specify `nofollow`; and the resolved target is not replaced by an indirect tracking redirect.
- `follow_capable_observed`: comparable links on the candidate site meet all of those conditions, but the project's future link does not yet exist.
- `nofollow_only`: inspected comparable links are qualified with blocking rel tokens.
- `indirect_or_js`: the apparent link uses a redirect service, script, button, or non-crawlable mechanism.
- `unknown`: evidence is insufficient.

Do not infer that Google will pass ranking value merely because a link is follow.

## Index evidence

- `indexed_observed`: a dated, positive observation identifies the exact `subject_url` in a Google-specific result, such as a compliant Google SERP provider or an authorized Search Console URL Inspection for a property the user can inspect.
- `not_observed`: the chosen method did not return the URL; this is not proof that the URL is absent from Google's index.
- `unknown`: no reliable check is available.
- `stale`: the last positive observation exceeds the freshness window or the page materially changed.

Store `subject_url`, `provider`, `method`, `checked_at`, query or property context, result, and evidence path. A generic Codex/web-search hit, a domain-level result, a similar URL, or a non-Google search result is not Google index evidence and must remain `unknown`. Default the freshness window to 14 days for qualification.

## Profile safety

Prefer a natural mix of brand, naked URL, generic, and descriptive anchors. Treat repeated exact-match anchors, extremely high dofollow ratios, abrupt acquisition bursts, and low topical diversity as project-level warnings even when an individual opportunity scores well.

Low authority alone is not proof of toxicity. Relevance, editorial context, real audience, and site behavior can outweigh a raw authority metric.
