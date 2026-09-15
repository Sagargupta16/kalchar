"use client";

import { SERVER_BRAND_COLORS } from "@/lib/server-brand-colors";

/**
 * This replaces the root layout, so fonts, providers, shared UI and the global
 * stylesheet must not be dependencies of the recovery screen.
 */
const FALLBACK_STYLES = `
	.kalchar-fatal-error {
		--fallback-paper: ${SERVER_BRAND_COLORS.paper};
		--fallback-ink: ${SERVER_BRAND_COLORS.ink};
		--fallback-accent: ${SERVER_BRAND_COLORS.terracotta};
		--fallback-radius: 1rem;
		margin: 0;
		background: var(--fallback-paper);
		color: var(--fallback-ink);
		color-scheme: light;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		line-height: 1.6;
	}

	.kalchar-fatal-error * {
		box-sizing: border-box;
	}

	.kalchar-fatal-error main {
		display: flex;
		min-height: 100vh;
		min-height: 100svh;
		width: 100%;
		max-width: 42rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.kalchar-fatal-error p {
		max-width: 38ch;
		margin: 0;
	}

	.kalchar-fatal-error .brand {
		color: var(--fallback-accent);
		font-size: 0.875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
	}

	.kalchar-fatal-error h1 {
		max-width: 15ch;
		margin: 1rem 0;
		font-family: ui-serif, Georgia, "Times New Roman", serif;
		font-size: clamp(2rem, 7vw, 3.5rem);
		font-weight: 400;
		line-height: 1.15;
		text-wrap: balance;
	}

	.kalchar-fatal-error .actions {
		display: flex;
		width: 100%;
		max-width: 26rem;
		margin-top: 1.75rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.kalchar-fatal-error button {
		display: inline-flex;
		min-height: 3rem;
		padding: 0.75rem 1.25rem;
		flex: 1 1 10rem;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--fallback-ink);
		border-radius: var(--fallback-radius);
		background: var(--fallback-paper);
		color: var(--fallback-ink);
		font: inherit;
		line-height: 1.4;
		cursor: pointer;
	}

	.kalchar-fatal-error .retry {
		border-color: var(--fallback-accent);
		background: var(--fallback-accent);
		color: var(--fallback-paper);
	}

	.kalchar-fatal-error button:hover {
		border-color: var(--fallback-ink);
		background: var(--fallback-ink);
		color: var(--fallback-paper);
	}

	.kalchar-fatal-error a {
		display: inline-flex;
		min-height: 3rem;
		margin-top: 0.75rem;
		padding: 0.5rem 0.75rem;
		align-items: center;
		border-radius: var(--fallback-radius);
		color: var(--fallback-accent);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.kalchar-fatal-error a:hover {
		color: var(--fallback-ink);
	}

	.kalchar-fatal-error :is(button, a):focus-visible {
		outline: 3px solid var(--fallback-ink);
		outline-offset: 4px;
	}
`;

export default function GlobalError({
	retry,
}: Readonly<{ error: Error & { digest?: string }; retry: () => void }>) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<title>Unable to load the site | Kalchar</title>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="robots" content="noindex" />
				<style>{FALLBACK_STYLES}</style>
			</head>
			<body className="kalchar-fatal-error">
				<main aria-labelledby="global-error-title">
					<p className="brand">Kalchar by Megha</p>
					<h1 id="global-error-title">We couldn’t load the site</h1>
					<p>
						Please try again. If the problem continues, reload the page or come back in a few
						minutes.
					</p>
					<div className="actions">
						<button type="button" onClick={retry} className="retry">
							Try again
						</button>
						<button type="button" onClick={() => window.location.reload()}>
							Reload page
						</button>
					</div>
					<a href="/">Return home</a>
				</main>
			</body>
		</html>
	);
}
