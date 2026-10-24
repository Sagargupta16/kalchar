import { defineConfig, devices } from "@playwright/test";

// The admin fixtures replace server actions and run without Next, credentials,
// or a database. The same specs also run in the normal browser suite.
export default defineConfig({
	testDir: "../e2e",
	testMatch:
		/admin-(components|shell|catalog|catalog-add|catalog-editor|catalog-usability|catalog-layout|content-layout|content-mobile|settings|leads|add-navigation|.*-usability)\.spec\.ts/,
	outputDir: "../../.cache/admin-components",
	fullyParallel: true,
	workers: 2,
	// One retry absorbs the suite's known load-timing flake (one test per full
	// run, the same rate on every branch); a real failure still fails twice.
	retries: 1,
	reporter: "line",
	use: {
		...devices["Desktop Chrome"],
		channel: process.env.PLAYWRIGHT_CHANNEL === "chrome" ? "chrome" : undefined,
	},
});
