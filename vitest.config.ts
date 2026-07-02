import { defineConfig } from "vitest/config";

/**
 * Vitest runs the pure-logic unit suite in lib/*.test.ts. These are string/
 * number functions (slug minting, price/status rules, WhatsApp message + link
 * builders, formatting) with no DOM and no DB, so the config stays minimal:
 * the node environment plus Vite's native tsconfig-paths resolution for the
 * `@/*` alias. Do NOT reach for jsdom or the async data seam here -- that's out
 * of scope for this suite by design.
 */
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: "node",
		include: ["lib/**/*.test.ts"],
	},
});
