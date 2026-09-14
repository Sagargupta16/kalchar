"use client";

import { Check, Share2 } from "lucide-react";
import { useCallback, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
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
	iconOnly = false,
}: Readonly<{ title: string; url: string; className?: string; iconOnly?: boolean }>) {
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
				iconOnly
					? "grid size-control shrink-0 place-items-center rounded-full border border-line/40 bg-surface-raised/80 text-ink transition-ui pressable hover:text-accent-text"
					: buttonVariants({ variant: "ghost" }),
				className,
			)}
		>
			{copied ? (
				<Check size={iconOnly ? 18 : 14} aria-hidden="true" />
			) : (
				<Share2 size={iconOnly ? 18 : 14} aria-hidden="true" />
			)}
			{iconOnly ? null : copied ? "Link copied" : "Share"}
		</button>
	);
}
