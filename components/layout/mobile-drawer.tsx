"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { DUR, EASE_IN, EASE_OUT, KINETIC } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** The curtain wipes down from the header on open and folds back up on close. */
const CURTAIN_CLOSED = "inset(0% 0% 100% 0%)";
const CURTAIN_OPEN = "inset(0% 0% 0% 0%)";
/** Emphasised decelerate (--ease-emphatic): the curtain lands softly. */
const EASE_EMPHATIC = [0.05, 0.7, 0.1, 1] as const;
const CURTAIN_S = 0.6;
/** Each label rides up out of its own mask, one kinetic step apart, after the curtain starts. */
const LABEL_FROM = { y: "110%", rotate: 6 } as const;
const LABEL_TO = { y: "0%", rotate: 0 } as const;
const ROW_LEAD_MS = 160;

export interface DrawerNavItem {
	label: string;
	href: string;
}

interface MobileDrawerProps {
	open: boolean;
	items: DrawerNavItem[];
	isActive: (href: string) => boolean;
	whatsappHref: string;
	instagram?: { href: string; handle: string };
	tagline: string;
	onClose: () => void;
	onExitComplete: () => void;
}

/**
 * Full-screen mobile menu: a deep terracotta curtain (the pigment band
 * tokens, inherited from the dialog wrapper in site-header-client.tsx) that
 * wipes down from the header on a clip-path, then the six destinations ride
 * up out of their masks in the section headline voice, one kinetic step
 * apart, each numbered 01..06 in tabular meta caps. The active row carries
 * the gold accent and aria-current. The foot of the curtain holds the
 * tagline, the Instagram handle and the pinned WhatsApp primary (the last
 * control, so the focus loop in use-mobile-menu wraps to it). Close folds the
 * curtain back up at DUR.base on EASE_IN.
 *
 * Positioning note: the native dialog covers the viewport, so absolute +
 * top-0 starts at the same edge as the header while body scroll is locked.
 */
export function MobileDrawer({
	open,
	items,
	isActive,
	whatsappHref,
	instagram,
	tagline,
	onClose,
	onExitComplete,
}: Readonly<MobileDrawerProps>) {
	return (
		<AnimatePresence onExitComplete={onExitComplete}>
			{open ? (
				<motion.div
					key="panel"
					id="mobile-menu"
					initial={{ clipPath: CURTAIN_CLOSED }}
					animate={{ clipPath: CURTAIN_OPEN }}
					exit={{
						clipPath: CURTAIN_CLOSED,
						transition: { duration: DUR.base, ease: EASE_IN },
					}}
					transition={{ duration: CURTAIN_S, ease: EASE_EMPHATIC }}
					className="drawer-curtain absolute inset-x-0 top-0 flex h-svh flex-col bg-bg pt-(--header-h-shrunk) lg:hidden"
				>
					<span aria-hidden="true" lang="hi" className="drawer-glyph">
						चर
					</span>
					<nav
						aria-label="Primary mobile"
						data-lenis-prevent
						className="relative min-h-0 flex-1 overflow-y-auto px-(--container-px)"
					>
						<ul className="flex flex-col py-4">
							{items.map((item, i) => {
								const active = isActive(item.href);
								const delay = (ROW_LEAD_MS + i * KINETIC.stepMs) / 1000;
								return (
									<li key={item.href} className="border-b border-line">
										<Link
											href={item.href}
											onClick={onClose}
											aria-current={active ? "page" : undefined}
											className={cn(
												"group flex min-h-16 items-center gap-4 rounded-(--radius-sm) py-3 transition-colors active:text-accent-text",
												active ? "text-accent-text" : "text-ink",
											)}
										>
											<motion.span
												aria-hidden="true"
												className="t-meta w-7 shrink-0 tabular-nums"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												transition={{ duration: DUR.reveal, ease: EASE_OUT, delay }}
											>
												{String(i + 1).padStart(2, "0")}
											</motion.span>
											<span className="kinetic-mask flex-1">
												<motion.span
													className="inline-block origin-bottom-left"
													initial={LABEL_FROM}
													animate={LABEL_TO}
													transition={{
														duration: KINETIC.durationMs / 1000,
														ease: EASE_OUT,
														delay,
													}}
												>
													{/* Hover travel lives on its own node so it never fights the entrance. */}
													<span className="t-headline type-section inline-block transition-transform duration-300 group-hover:translate-x-2">
														{item.label}
													</span>
												</motion.span>
											</span>
											{active ? (
												<span
													aria-hidden="true"
													className="size-2 shrink-0 rounded-full bg-(--section-accent)"
												/>
											) : (
												<ArrowUpRight
													size={18}
													aria-hidden="true"
													className="shrink-0 text-muted transition-transform duration-300 group-hover:rotate-45"
												/>
											)}
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>
					{/* Foot of the curtain: who, where, and the pinned WhatsApp action (last focus stop). */}
					<motion.div
						className="relative px-(--container-px) pt-4 pb-[calc(var(--spacing-safe-bottom)+--spacing(4))]"
						initial={{ opacity: 0, y: 24 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: DUR.reveal,
							ease: EASE_OUT,
							delay: (ROW_LEAD_MS + items.length * KINETIC.stepMs) / 1000,
						}}
					>
						<div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-muted">
							<span>{tagline}</span>
							{instagram ? (
								<a
									href={instagram.href}
									target="_blank"
									rel="noopener noreferrer"
									onClick={onClose}
									className="inline-flex min-h-control items-center gap-2 text-ink transition-colors hover:text-accent-text"
								>
									<InstagramIcon className="size-4" aria-hidden="true" />
									{instagram.handle}
								</a>
							) : null}
						</div>
						<a
							href={whatsappHref}
							onClick={onClose}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
						>
							<WhatsAppIcon className="size-4" aria-hidden="true" />
							Message on WhatsApp
						</a>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}
