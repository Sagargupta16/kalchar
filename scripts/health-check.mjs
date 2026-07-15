const baseUrl = new URL(process.env.HEALTHCHECK_BASE_URL ?? "https://kalchar.co.in");

const checks = [
	{ path: "/", contentType: "text/html", includes: "Kalchar" },
	{ path: "/sitemap.xml", contentType: "xml", includes: "<urlset" },
	{ path: "/catalog.csv", contentType: "text/csv", includes: "image_link" },
	{ path: "/logo.jpg", contentType: "image/jpeg" },
];

for (const check of checks) {
	const url = new URL(check.path, baseUrl);
	const response = await fetch(url, {
		cache: "no-store",
		signal: AbortSignal.timeout(15_000),
	});
	if (!response.ok) {
		throw new Error(`${url} returned ${response.status}.`);
	}
	const actualType = response.headers.get("content-type") ?? "";
	if (!actualType.includes(check.contentType)) {
		throw new Error(`${url} returned unexpected content type "${actualType}".`);
	}
	if (check.includes) {
		const body = await response.text();
		if (!body.includes(check.includes)) {
			throw new Error(`${url} did not contain the expected marker.`);
		}
	}
	console.log(`OK ${url} (${response.status}, ${actualType})`);
}
