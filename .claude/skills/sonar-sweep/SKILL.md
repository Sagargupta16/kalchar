---
name: sonar-sweep
description: Use to clear SonarCloud findings end-to-end for this repo (kalchar / project key Sagargupta16_folk-art-portfolio). Fetches all open issues + security hotspots via the Sonar CLI, triages real-vs-intentional, fixes the safe ones behavior-preservingly, re-verifies the build green, and reports what was deliberately left. The "fix Sonar a to z" loop.
when_to_use: |
  Trigger on: "sonar failed", "fix sonar", "sonarcloud findings", "fix the sonar issues", "quality gate red", "fix a to z findings", "security hotspot", or when a PR's SonarCloud check reports new issues even if the gate passes. Also after a large change, as a pre-merge quality pass.
---

# sonar-sweep

Clears SonarCloud findings the way Sagar wants: comprehensive ("a to z"), but with judgment -- fix real smells, leave documented-intentional ones, never break behavior to satisfy a linter.

## Setup (this repo)

- **CLI:** `~/AppData/Local/sonarqube-cli/bin/sonar` (add to PATH for the session: `export PATH="$HOME/AppData/Local/sonarqube-cli/bin:$PATH"`).
- **Project key:** `Sagargupta16_folk-art-portfolio` (name "kalchar"). Org `sagargupta16`, SonarCloud.
- **Agentic Analysis is NOT enabled** (403). Do NOT rely on `sonar analyze agentic` / `sonar verify` -- use the stored-analysis APIs below.
- CLI JSON to a Windows temp path (`c:\tmp\...`) and parse with `python` using the Windows path (the MINGW `/c/tmp` form fails in Windows Python).

## Steps

1. **Fetch the findings** (stored standard analysis):
   - Issues: `sonar list issues --project Sagargupta16_folk-art-portfolio --statuses OPEN --format json`
   - Hotspots: `sonar api GET "/api/hotspots/search?projectKey=Sagargupta16_folk-art-portfolio&status=TO_REVIEW&ps=100"`
   - Gate: `sonar api GET "/api/qualitygates/project_status?projectKey=Sagargupta16_folk-art-portfolio"` (add `&pullRequest=<n>` for a PR, `&branch=main` for a branch).
   - For a PR specifically, the new-code issues: `sonar api GET "/api/issues/search?componentKeys=Sagargupta16_folk-art-portfolio&pullRequest=<n>&resolved=false"`.
   - Endpoints MUST start with `/`.

2. **Map to current code.** Reported line numbers come from the last scan and may have shifted -- locate each finding in the *current* file before editing. Never edit by stale line number.

3. **Triage each finding -- fix vs leave:**
   - **FIX** (safe, behavior-preserving): native a11y over ARIA roles (`role="list"/"listitem"` -> `<ul>/<li>`), `globalThis.window === undefined` SSR guards, redundant type assertions (`as X` that tsc confirms unneeded), nested ternaries -> helper, ReDoS regexes simplified at the source, GitHub Actions least-privilege (`permissions: contents: read`).
   - **LEAVE** (intentional design -- report with reason, don't silently skip): the documented `ArtStyle = string` alias and its sentinel unions (S6564/S6571), `setStatusInput`-style names that avoid colliding with imported server actions (S6754), the custom modal `role="dialog"` (native `<dialog>` needs `showModal()` = behavior change), idiomatic guard-clause negations (S7735).
   - Rule of thumb: if "fixing" a finding would change runtime behavior, it's NOT a clean-code fix -- leave it and say why. Watch for whack-a-mole (one rule's fix triggering another, e.g. S7764 -> S7741); aim for the form that satisfies both.

4. **Apply fixes** surgically, one logical batch. Pair with the `clean-code` skill for the actual edits.

5. **Re-verify green:** `pnpm typecheck` + `pnpm lint` (`pnpm exec biome check app components lib` to scope past untracked files) + `pnpm build`. Empirically test removals (e.g. drop an `as X`, run tsc, revert if it breaks).

6. **Report:** what was fixed (rule + file), what was left intentional (rule + reason), and the gate/new-issue status. If on a PR, after pushing, wait for SonarCloud re-analysis and confirm new issues = 0.

## Notes

- Hotspots on `main` auto-resolve to FIXED after a merge removes the flagged line -- fixing the source beats manually marking "safe."
- A green GitHub status check can still coexist with "N new issues" in the dashboard (gate threshold not breached). Check the issues API, not just the badge.
- `pnpm audit` for dependency CVEs; GitHub `code-scanning/alerts` for Actions/workflow findings (these are separate from SonarCloud issues -- check both when the user says "security findings").
