---
name: ship-it
description: Use to take finished work from working tree to an open PR with green CI. Runs the full verify -> changelog/version -> commit -> branch -> push -> PR -> watch-CI loop for this repo, following the dev -> main flow and the never-push-without-approval guardrail.
when_to_use: |
  Trigger on: "ship it", "ship this", "commit and push", "open a PR", "push it", "raise a PR", "merge to dev", "release", "promote to main", or after finishing a logical chunk of work when the next step is getting it onto a branch + PR. Do NOT trigger for mid-work commits the user hasn't asked to push.
---

# ship-it

Takes finished work to an open, green PR -- the loop Sagar runs constantly. Encodes this repo's exact tooling and guardrails so it's consistent every time.

## Repo guardrails

- Pushing to remote needs explicit per-session approval. The user's "ship it" / "push it" / "open a PR" IS that approval for this run. A vague "looks good" is not -- confirm intent.
- Active work lands on `dev`; feature branches PR into `dev`. `main` is branch-protected. (Git safety basics -- force-push, hooks, staging by name -- per global always-on rules.)
- Merging to `main` deploys production (kalchar.co.in) -- it's outward-facing. Open the PR; do not merge to main without a separate explicit go.

## Steps

1. **Establish/refresh green.** Run in order, stop on first failure and report:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm build` (needs `.env.local`; reads Neon + R2 at build time -- the minimum gate; types+lint alone never qualify. For UI changes, load the page in `pnpm dev` or a preview deploy as the actual proof)

2. **Branch check.** `git branch --show-current`.
   - On `dev` or `main` (a deploy branch): create a feature branch off the latest `origin/dev` first (`git fetch origin && git checkout -b <type>/<topic> origin/dev`). Branch names: `feat/`, `fix/`, `chore/`, `refactor/`.
   - On a feature branch already: continue.

3. **CHANGELOG + version (repo rule -- every PR).** Add a new top entry in `CHANGELOG.md` under a chosen version (no `[Unreleased]`), bump `package.json` `version` to match. Pre-1.0-style semver: patch for typo/link/image/artwork, minor for new section/content-model/stack change, major reserved. Use absolute dates.

4. **Stage by name + commit.** Conventional commit, subject human, detail in the body (format per global always-on rules). Exclude untracked tooling files (`.claude/`, `.mcp.json`, `.sonar/`) and Next's auto-regenerated `next-env.d.ts` unless they're the actual change.

5. **Push** the feature branch (`git push -u origin <branch>`).

6. **One open PR per target.** Check `gh pr list --base dev --state open` first (bot PRs count). Open the PR into `dev` with a body in Sagar's voice: What / Why / Changes / Testing (the typecheck+lint+build results). Title = the lead commit.

7. **Watch CI to conclusion.** Poll `gh pr checks <n>` until no pending. Report each check (lint/typecheck/build, SonarCloud, GitGuardian, Vercel). If SonarCloud flags new issues even when the gate passes, surface them (consider `sonar-sweep`). Confirm `mergeable: CLEAN`.

8. **Stop and report.** Hand back the PR URL + check status. Do NOT merge unless told. If the ask was "promote to main", open `dev -> main` as a separate release PR (title `release: promote dev to main (X.Y.Z)`), watch its CI, and stop before merging.

## After a main merge (only when the user merges)

- Tag the merge commit `vX.Y.Z` and push the tag (repo convention; tags are markers only, nothing automated reads them -- skip is harmless if the user doesn't care).
- Confirm the production deploy actually landed: check the Vercel production deployment succeeded and load kalchar.co.in to see the change serving. Merged-with-green-CI is not "deployed".

## Notes
- Vercel "Canceled by Ignored Build Step" on a feature branch is expected (only main/dev deploy).
- If a check fails, diagnose and fix on the branch, re-verify, re-push -- don't merge around red.
