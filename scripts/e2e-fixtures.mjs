/**
 * Build on the public fixtures and run the browser suite the way CI does
 * (.github/workflows/ci.yml): KALCHAR_TEST_FIXTURES=1, the placeholder image
 * origin and a throwaway AUTH_SECRET, so no Neon, R2 or Google values are
 * needed. The public specs assert fixture rows, so a build over real
 * .env.local data fails them. The fixture build replaces .next; rebuild before
 * serving real data again. See docs/DEVELOPMENT.md, "Browser tests".
 *
 *   pnpm test:e2e:fixtures                  build, then the full Playwright suite
 *   pnpm test:e2e:fixtures --shard=1/4      extra arguments go to Playwright
 *   pnpm test:preview                       the @preview admin geometry suites,
 *                                           against a running `pnpm dev:preview`
 *
 * Same pattern as admin-preview.mjs: the environment is set here so the script
 * works from PowerShell and cmd as well as POSIX shells, and every child runs
 * through the current Node binary, so no shell is involved on any platform.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const playwrightBin = require.resolve("@playwright/test/cli");

const preview = process.argv.includes("--preview");
const playwrightArgs = process.argv.slice(2).filter((arg) => arg !== "--preview" && arg !== "--");

/**
 * Run one Node entry point to completion; stop at the first failure.
 * @param {string} bin
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 */
function run(bin, args, env) {
	const { status, error } = spawnSync(process.execPath, [bin, ...args], { stdio: "inherit", env });
	if (error) throw error;
	if (status !== 0) process.exit(status ?? 1);
}

if (preview) {
	// The geometry suites skip unless this is set; they read the dev server on 3010.
	run(
		playwrightBin,
		[
			"test",
			"--config",
			"tests/admin/playwright.config.ts",
			"--grep",
			"@preview",
			...playwrightArgs,
		],
		{ ...process.env, KALCHAR_ADMIN_PREVIEW: "1" },
	);
} else {
	const env = {
		...process.env,
		KALCHAR_TEST_FIXTURES: "1",
		NEXT_PUBLIC_IMAGE_BASE_URL: "https://fixtures.invalid",
		AUTH_SECRET: process.env.AUTH_SECRET ?? randomBytes(32).toString("hex"),
	};
	run(nextBin, ["build"], env);
	// Playwright's webServer (next start) inherits this environment.
	run(playwrightBin, ["test", ...playwrightArgs], env);
}
