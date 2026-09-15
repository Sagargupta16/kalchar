import type { NextConfig } from "next";
import {
	getRewrittenUrl,
	unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";

async function configForFixtures(enabled: boolean): Promise<NextConfig> {
	vi.resetModules();
	vi.stubEnv("KALCHAR_TEST_FIXTURES", enabled ? "1" : "");
	vi.stubEnv("NEXT_PUBLIC_IMAGE_BASE_URL", "https://images.example.invalid");
	const configPath = "../../next.config.mjs";
	const { default: config } = await import(configPath);
	return config;
}

afterEach(() => vi.unstubAllEnvs());

const publishedPaths = [
	"/media/artworks/radha-krishna-400.avif",
	"/media/artworks/radha-krishna.jpg",
	"/media/events/fixture-event/fixture-image-400.webp",
	"/media/profile/fixture-portrait-400.jpg",
];
const rejectedPaths = [
	"/media/staging/58dcd794-84dc-4b50-b27b-675b101e11ef",
	"/media/archive/original.jpg",
	"/media/artworks/malicious.html",
	"/media/artworks/malicious.svg",
	"/media/artworks/missing-extension-dotXjpg",
	"/media/artworks/nested/file.jpg",
	"/media/events/fixture-event/%2e%2e/staging.jpg",
	"/media/artworks/..%2fstaging%2ffile.jpg",
];

describe.each([false, true])("media boundary (fixtures: %s)", (fixtures) => {
	it.each(publishedPaths)("serves only a published image path: %s", async (path) => {
		const nextConfig = await configForFixtures(fixtures);
		const response = await unstable_getResponseFromNextConfig({
			url: `https://kalchar.example${path}`,
			nextConfig,
		});
		const destination = fixtures
			? "https://kalchar.example/logo.jpg"
			: `https://images.example.invalid${path.slice("/media".length)}`;
		expect(getRewrittenUrl(response)).toBe(destination);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.get("content-security-policy")).toContain("sandbox");
	});

	it.each(rejectedPaths)("does not proxy staging or arbitrary content: %s", async (path) => {
		const nextConfig = await configForFixtures(fixtures);
		const response = await unstable_getResponseFromNextConfig({
			url: `https://kalchar.example${path}`,
			nextConfig,
		});
		expect(getRewrittenUrl(response)).toBeNull();
	});
});

describe("local admin preview artwork", () => {
	it("uses the matching public painting without changing generic fixtures", async () => {
		vi.stubEnv("KALCHAR_ADMIN_PREVIEW", "1");
		vi.stubEnv("VERCEL", "");
		const nextConfig = await configForFixtures(true);
		const response = await unstable_getResponseFromNextConfig({
			url: "http://localhost:3010/media/artworks/radha-krishna-800.webp",
			nextConfig,
		});
		const rewritten = new URL(getRewrittenUrl(response) ?? "");
		expect(rewritten.pathname).toBe("/artworks/radha-krishna.jpg");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("never enables local artwork rewrites on Vercel", async () => {
		vi.stubEnv("KALCHAR_ADMIN_PREVIEW", "1");
		vi.stubEnv("VERCEL", "1");
		const nextConfig = await configForFixtures(true);
		const response = await unstable_getResponseFromNextConfig({
			url: "https://kalchar.example/media/artworks/radha-krishna-800.webp",
			nextConfig,
		});
		expect(getRewrittenUrl(response)).toBe("https://kalchar.example/logo.jpg");
	});
});
