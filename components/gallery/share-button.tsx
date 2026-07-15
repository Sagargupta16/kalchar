"use client";

import { Check, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const COPIED_CONFIRMATION_MS = 2000;

/**
 * Share control for an artwork. Uses the native share sheet
 * (navigator.share) when available -- the dominant mobile case, and the whole
 * point given WhatsApp/IG traffic -- and falls back to copying the link with a
 * transient "Link copied" confirmation. The shared URL is the trailing-slash
 * canonical, which unfurls with the piece's OG/Product tags in DMs.
 *
 * Progressive: renders as a normal button; the enhanced paths are feature-
 * detected at click time. The confirmation is a plain text swap (no motion), so
 * it's reduced-motion-safe by construction.
 */
export function ShareButton({
	title,
	url,
	className,
}: Readonly<{ title: string; url: string; className?: string }>) {
	const [copied, setCopied] = useState(false);

	const onShare = useCallback(async () => {
		const shareUrl = url;
		// Native share sheet first (mobile).
		if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
			try {
				await navigator.share({ title, url: shareUrl });
				return;
			} catch {
				// User dismissed the sheet, or share failed -- fall through to copy.
			}
		}
		// Clipboard fallback (needs a secure context; guard so it never throws).
		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				setCopied(true);
				setTimeout(() => setCopied(false), COPIED_CONFIRMATION_MS);
			} catch {
				// Clipboard blocked -- nothing more to do silently.
			}
		}
	}, [title, url]);

	return (
		<button
			type="button"
			onClick={onShare}
			aria-label={copied ? "Link copied" : `Share ${title}`}
			className={cn(
				"inline-flex min-h-11 items-center gap-2 rounded-(--radius-md) border border-line px-3 py-2 text-xs uppercase tracking-meta text-muted transition-colors duration-(--duration-fast) ease-(--ease-out) hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
				className,
			)}
		>
			{copied ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
			{copied ? "Link copied" : "Share"}
		</button>
	);
}
