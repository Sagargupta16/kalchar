"use client";

import { SERVER_BRAND_COLORS } from "@/lib/server-brand-colors";

/**
 * This replaces the root layout, so fonts, providers, shared UI and the global
 * stylesheet must not be dependencies of the recovery screen. It keeps the
 * site's closing-band look on its own: a night ground with a terracotta glow,
 * paper type, and a faint wordmark rising behind the copy.
 */
const FALLBACK_STYLES = `
	.kalchar-fatal-error {
		--fallback-paper: ${SERVER_BRAND_COLORS.paper};
		--fallback-night: ${SERVER_BRAND_COLORS.night};
		--fallback-accent: ${SERVER_BRAND_COLORS.terracotta};
		--fallback-gold: ${SERVER_BRAND_COLORS.marigold};
		--fallback-radius: 1rem;
		margin: 0;
		background:
			radial-gradient(120% 70% at 100% 0%, color-mix(in srgb, var(--fallback-accent) 55%, transparent), transparent 60%),
			var(--fallback-night);
		color: var(--fallback-paper);
		color-scheme: dark;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		line-height: 1.6;
		overflow-x: hidden;
	}

	.kalchar-fatal-error * {
		box-sizing: border-box;
	}

	.kalchar-fatal-error main {
		position: relative;
		display: flex;
		min-height: 100vh;
		min-height: 100svh;
		width: 100%;
		max-width: 44rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		flex-direction: column;
		justify-content: center;
	}

	.kalchar-fatal-error .mark {
		position: absolute;
		right: 0;
		bottom: 0;
		font-family: ui-serif, Georgia, "Times New Roman", serif;
		font-size: clamp(9rem, 44vw, 20rem);
		font-style: italic;
		line-height: 1;
		color: color-mix(in srgb, var(--fallback-paper) 7%, transparent);
		pointer-events: none;
		user-select: none;
		animation: fatal-mark 1.2s cubic-bezier(0.05, 0.7, 0.1, 1) both;
	}

	@keyframes fatal-mark {
		from {
			opacity: 0;
			transform: translateY(12%) rotate(-4deg);
		}
	}

	.kalchar-fatal-error p {
		position: relative;
		max-width: 38ch;
		margin: 0;
	}

	.kalchar-fatal-error .brand {
		color: var(--fallback-gold);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.kalchar-fatal-error h1 {
		position: relative;
		max-width: 14ch;
		margin: 1rem 0;
		font-family: ui-serif, Georgia, "Times New Roman", serif;
		font-size: clamp(2.25rem, 8vw, 3.5rem);
		font-weight: 600;
		letter-spacing: -0.03em;
		line-height: 1.02;
		text-wrap: balance;
	}

	.kalchar-fatal-error .actions {
		position: relative;
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
		border: 1px solid color-mix(in srgb, var(--fallback-paper) 45%, transparent);
		border-radius: var(--fallback-radius);
		background: transparent;
		color: var(--fallback-paper);
		font: inherit;
		font-weight: 500;
		line-height: 1.4;
		cursor: pointer;
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.15s ease-out;
	}

	.kalchar-fatal-error .retry {
		border-color: var(--fallback-paper);
		background: var(--fallback-paper);
		color: var(--fallback-night);
	}

	.kalchar-fatal-error button:hover {
		transform: translateY(-2px);
	}

	.kalchar-fatal-error button:active {
		transform: scale(0.97);
	}

	.kalchar-fatal-error a {
		position: relative;
		display: inline-flex;
		width: fit-content;
		min-height: 3rem;
		margin-top: 0.75rem;
		padding: 0.5rem 0;
		align-items: center;
		color: var(--fallback-gold);
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.kalchar-fatal-error a:hover {
		color: var(--fallback-paper);
	}

	.kalchar-fatal-error :is(button, a):focus-visible {
		outline: 3px solid var(--fallback-gold);
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
					<span className="mark" aria-hidden="true">
						Kal
					</span>
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
