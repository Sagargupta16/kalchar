# Recommended public skills to install

Researched against Sagar's actual session patterns (1,334 prompts across his repos) and this project's stack. These are **real, public, MIT/Apache-licensed** skill collections worth adopting. Install commands below; nothing here is auto-installed -- pick what you want.

## Tier 1 -- install first (highest fit for your values: clean code, PR/CI discipline, a11y, perf)

| Source | Why it fits | Install |
| --- | --- | --- |
| **obra/superpowers** | Purpose-built for your engineering discipline: TDD, systematic-debugging, verification-before-completion, requesting/receiving-code-review, using-git-worktrees, finishing-a-development-branch, writing/executing-plans. (Some already show in your session as `superpowers:*`.) | `/plugin marketplace add obra/superpowers` |
| **addyosmani/agent-skills** | 23 production skills directly on your axes: performance-optimization (Core Web Vitals), frontend-ui-engineering (WCAG AA), code-review-and-quality, git-workflow-and-versioning, code-simplification, security-and-hardening (OWASP). | `/plugin marketplace add addyosmani/agent-skills` |
| **anthropics/skills** (official) | `webapp-testing` (Playwright -- you have it as a dep), `frontend-design`, `web-artifacts-builder` (React+Tailwind+shadcn), `mcp-builder`, `skill-creator`. | `/plugin marketplace add anthropics/skills` then `/plugin install document-skills` (already partly present) |

## Tier 2 -- domain-specific (install as the need comes up)

| Source | Use for | Install |
| --- | --- | --- |
| **Vercel Labs next-* skills** (via VoltAgent registry) | `next-best-practices`, `next-cache-components`, `next-upgrade` -- Next.js patterns + version migrations, straight from Vercel. | See https://github.com/VoltAgent/awesome-agent-skills (per-skill install links) |
| **rampstackco/claude-skills** | Mature SEO suite (7 + Ahrefs-powered audits), `accessibility-audit`, `performance-optimization`, `media-asset-management`. | `/plugin marketplace add rampstackco/claude-skills` |
| **neondatabase / supabase postgres skills** (registry) | Postgres best-practices + schema design (no Drizzle-specific skill exists publicly -- closest fit). | VoltAgent registry: `neondatabase/neon-postgres` |

## What NOT to install (you already have it or it doesn't fit)

- **Design/polish**: you already have 20+ (`frontend-design`, `polish`, `delight`, `adapt`, `critique`, `shadcn`, `make-interfaces-feel-better`, ...). Don't add more.
- **Python clean-code skills**: wrong language for this repo. The local `clean-code` skill replaces them here.
- **great_cto / 74-agent SDLC pipeline**: overkill for a solo maintainer.

## Gaps with NO good public skill -> we built local ones

| Gap | Our local skill |
| --- | --- |
| The verify->PR->CI->dev/main ship loop with your guardrails | `ship-it` |
| SonarCloud fix-a-to-z via your CLI + project key | `sonar-sweep` |
| a11y + perf + SEO pre-ship gate for this Next app | `frontend-quality` |
| Catalog/artwork edits through the data seam + R2 pipeline | `kalchar-content` |
| TS-adapted A-to-Z clean code + house rules | `clean-code` |

## Caveats

- Installing a marketplace adds skills **globally** (`~/.claude`), affecting all repos. That's why these are recommendations, not auto-installs.
- After install, run `/plugin` to enable specific skills; prune overlaps so triggering stays sharp.
- No public **Drizzle**, **Cloudflare R2**, or **Auth.js**-specific skill exists -- those stay encoded in this repo's CLAUDE.md + `kalchar-content`.
