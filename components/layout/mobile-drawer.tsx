"use client";

import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { DUR, EASE_IN, EASE_OUT, SPRING_SHEET } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface DrawerNavItem {
	label: string;
	href: string;
}

interface MobileDrawerProps {
	open: boolean;
	items: DrawerNavItem[];
	isActive: (href: string) => boolean;
	whatsappHref: string;
	onClose: () => void;
}

/**
 * Full-height mobile drawer (visual-direction 2.12): a table of contents under
 * the header bar. The panel spans h-svh (never resizes mid-open while the URL
 * bar collapses) with the six destinations as numbered index rows: "01".."06"
 * in tabular meta caps beside the label in the roman headline voice; the
 * active row carries accent text, a 24px gold rule and aria-current (never
 * gold alone). Steering 2026-09-14: rows sit on the calmer h3 rung (the
 * text-title register read shouty against the retuned page scale; the t-meta
 * numerals already match portfolio-react's 11px mono index and stay), and the
 * panel is the flagship iOS material (material-glass-strong: raised tint at
 * 90% fill, static 24px blur + saturate, hairline + e4 in one box-shadow
 * list; opaque readable fallback without backdrop-filter). "Message on
 * WhatsApp" keeps its content but moves from the first row to a pinned
 * full-width primary above the safe area. Rows cascade on the CSS stagger
 * utility; the panel settles in on SPRING_SHEET (the open answers the
 * visitor's tap, so a spring; the blurred material fades in with the panel's
 * opacity, never by animating the blur radius) and exits at DUR.fast EASE_IN
 * (motion addendum C6); reduced motion fades (MotionConfig strips the travel,
 * the reduced block zeroes the stagger).
 *
 * Positioning note: the host header's backdrop-filter makes it the containing
 * block for positioned descendants, so absolute + top-0 here means "from the
 * header's top edge", which equals the viewport top while the header is stuck
 * and the body scroll is locked.
 */
export function MobileDrawer({
	open,
	items,
	isActive,
	whatsappHref,
	onClose,
}: Readonly<MobileDrawerProps>) {
	return (
		<AnimatePresence>
			{open ? (
				<>
					<motion.div
						key="scrim"
						aria-hidden="true"
						onClick={onClose}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN } }}
						transition={{ duration: DUR.base, ease: EASE_OUT }}
						className="absolute inset-x-0 top-0 h-dvh bg-scrim/40 lg:hidden"
					/>
					<motion.div
						key="panel"
						id="mobile-menu"
						initial={{ opacity: 0, y: -12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8, transition: { duration: DUR.fast, ease: EASE_IN } }}
						transition={SPRING_SHEET}
						className="material-glass-strong absolute inset-x-0 top-0 flex h-svh flex-col pt-(--header-h-shrunk) lg:hidden"
					>
						<nav
							aria-label="Primary mobile"
							data-lenis-prevent
							className="min-h-0 flex-1 overflow-y-auto px-(--container-px)"
						>
							<ul className="stagger flex flex-col">
								{items.map((item, i) => {
									const active = isActive(item.href);
									return (
										<li key={item.href} style={{ "--i": i } as CSSProperties}>
											<Link
												href={item.href}
												aria-current={active ? "page" : undefined}
												className={cn(
													"group flex min-h-14 items-center gap-4 border-b border-line-soft py-4 transition-colors active:bg-canvas",
													active ? "text-accent-text" : "text-ink",
												)}
											>
												{/* Gold rule marks the active row; the slot is reserved so indices align. */}
												<span
													aria-hidden="true"
													className={cn(
														"h-px w-6 shrink-0 bg-(--color-gold-hairline)",
														active ? "opacity-100" : "opacity-0",
													)}
												/>
												<span aria-hidden="true" className="t-meta w-6 shrink-0 tabular-nums">
													{String(i + 1).padStart(2, "0")}
												</span>
												<span className="t-headline flex-1 text-h3">{item.label}</span>
												<ArrowRight
													size={16}
													aria-hidden="true"
													className="shrink-0 text-muted transition-[translate,color] group-hover:translate-x-0.5"
												/>
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>
						{/* Pinned utility action (navigation c1): content kept from the old first row, position moved. */}
						<div className="mt-auto px-(--container-px) pt-4 pb-[calc(var(--spacing-safe-bottom)+--spacing(4))]">
							<a
								href={whatsappHref}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
							>
								<WhatsAppIcon className="size-4" aria-hidden="true" />
								Message on WhatsApp
							</a>
						</div>
					</motion.div>
				</>
			) : null}
		</AnimatePresence>
	);
}
