import type { NextConfig } from "next";
import {
	getRewrittenUrl,
	unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isVersionedImageKey } from "./image-key";

async function configForFixtures(enabled: boolean): Promise<NextConfig> {
	vi.resetModules();
	vi.stubEnv("KALCHAR_TEST_FIXTURES", enabled ? "1" : "");
	vi.stubEnv("NEXT_PUBLIC_IMAGE_BASE_URL", "https://images.example.invalid");
	const configPath = "../../next.config.mjs";
	const { default: config } = await import(configPath);
	return config;
}

afterEach(() => vi.unstubAllEnvs());

const UUID = "3f8a1c2e-9b4d-4f7a-8e21-5c6d7b8a9f01";
const seedPaths = [
	"/media/artworks/radha-krishna-400.avif",
	"/media/artworks/radha-krishna.jpg",
	"/media/events/fixture-event/fixture-image-400.webp",
	"/media/profile/fixture-portrait-400.jpg",
];
const versionedPaths = [
	`/media/artworks/lotus-woman-${UUID}-400.avif`,
	`/media/artworks/piece-${UUID}.jpg`,
	`/media/events/${UUID}/photo-${UUID}-1600.webp`,
	`/media/events/${UUID}/${UUID}-800.jpg`,
	`/media/profile/artist-${UUID}-400.jpg`,
];
const publishedPaths = [...seedPaths, ...versionedPaths];
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

describe("media edge caching", () => {
	async function cdnCacheFor(path: string): Promise<string | null> {
		const nextConfig = await configForFixtures(false);
		const response = await unstable_getResponseFromNextConfig({
			url: `https://kalchar.example${path}`,
			nextConfig,
		});
		return response.headers.get("vercel-cdn-cache-control");
	}

	it.each(versionedPaths)("lets the CDN keep the versioned variant %s for a year", async (path) => {
		expect(await cdnCacheFor(path)).toBe("max-age=31536000");
	});

	it.each(seedPaths)("adds no edge override for the regenerable key %s", async (path) => {
		expect(await cdnCacheFor(path)).toBeNull();
	});

	it.each(publishedPaths)("agrees with the writer's immutable rule for %s", async (path) => {
		const immutableAtUpload = isVersionedImageKey(path.slice("/media/".length));
		expect((await cdnCacheFor(path)) !== null).toBe(immutableAtUpload);
	});

	it("never caches a path the rewrite rejects", async () => {
		expect(await cdnCacheFor(`/media/staging/${UUID}`)).toBeNull();
		expect(await cdnCacheFor(`/media/artworks/nested/piece-${UUID}.jpg`)).toBeNull();
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
