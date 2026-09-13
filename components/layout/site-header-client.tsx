"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DUR, EASE_OUT, SPRING_INDICATOR } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface NavItem {
	label: string;
	href: string;
}

const NAV: NavItem[] = [
	{ label: "Artwork", href: "/work" },
	{ label: "Events", href: "/events" },
	{ label: "About", href: "/about" },
	{ label: "Workshops", href: "/workshops" },
	{ label: "Custom Orders", href: "/custom-orders" },
];

const CONTACT: NavItem = { label: "Contact", href: "/contact" };
const DRAWER_ROW =
	"-mx-2 flex min-h-12 items-center justify-between rounded-(--radius-sm) border-b border-line-soft px-2 py-3 text-sm transition-colors last:border-b-0 active:bg-canvas";

interface Props {
	latinPrefix: string;
	devanagariCore: string;
	whatsappHref: string;
}

export function SiteHeaderClient({ latinPrefix, devanagariCore, whatsappHref }: Readonly<Props>) {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const scrollThresholdRef = useRef<HTMLSpanElement>(null);

	// Close on route change
	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger
	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	// Body scroll lock (iOS-safe)
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", onKey);
		const { body } = document;
		const scrollY = globalThis.scrollY;
		body.style.position = "fixed";
		body.style.top = `-${scrollY}px`;
		body.style.left = "0";
		body.style.right = "0";
		body.style.width = "100%";
		return () => {
			document.removeEventListener("keydown", onKey);
			body.style.position = "";
			body.style.top = "";
			body.style.left = "";
			body.style.right = "";
			body.style.width = "";
			globalThis.scrollTo(0, scrollY);
		};
	}, [open]);

	// Observe a fixed document threshold instead of doing work on every scroll frame.
	useEffect(() => {
		const threshold = scrollThresholdRef.current;
		if (!threshold) return;
		const observer = new IntersectionObserver(([entry]) => setScrolled(!entry?.isIntersecting));
		observer.observe(threshold);
		return () => observer.disconnect();
	}, []);

	const isActive = (href: string) => {
		if (href === "/") return pathname === "/";
		const path = pathname.replace(/\/$/, "");
		const base = href.replace(/\/$/, "");
		return path === base || path.startsWith(`${base}/`);
	};

	return (
		<>
			<span
				ref={scrollThresholdRef}
				aria-hidden="true"
				className="pointer-events-none absolute left-0 top-12 h-px w-px"
			/>
			<header
				className={cn(
					"sticky top-0 z-nav border-b bg-bg/90 backdrop-blur-md transition-[border-color,box-shadow] duration-(--duration-base) ease-(--ease-out)",
					scrolled ? "border-line shadow-e3" : "border-transparent",
				)}
			>
				<Container
					className={cn(
						"flex items-center justify-between gap-4 transition-[padding] duration-(--duration-base) ease-(--ease-out)",
						scrolled ? "py-2" : "py-3 md:py-4",
					)}
				>
					{/* Brand mark */}
					<Link
						href="/"
						className="group flex min-h-control items-center gap-3 transition-colors hover:text-accent-text"
						aria-label="Home"
					>
						<Image
							src="/logo.jpg"
							alt=""
							width={36}
							height={36}
							priority
							className="size-8 rounded-full ring-1 ring-line transition-ui group-hover:ring-accent md:size-9"
						/>
						<span className="t-display text-xl tracking-tight md:text-2xl">
							<span className="not-italic">{latinPrefix}</span>
							<span lang="hi" className="devanagari-display text-accent">
								{devanagariCore}
							</span>
						</span>
					</Link>

					{/* Desktop nav */}
					<div className="hidden items-center gap-6 lg:flex">
						<nav aria-label="Primary">
							<ul className="flex items-center gap-6">
								{NAV.map((item) => {
									const active = isActive(item.href);
									return (
										<li key={item.href}>
											<Link
												href={item.href}
												aria-current={active ? "page" : undefined}
												className={cn(
													"relative inline-flex min-h-control items-center text-xs uppercase tracking-meta transition-colors",
													active ? "text-accent-text" : "text-muted hover:text-ink",
												)}
											>
												{item.label}
												{active ? (
													<motion.span
														aria-hidden="true"
														layoutId="nav-indicator"
														className="pointer-events-none absolute inset-x-0 bottom-2 h-0.5 rounded-full bg-accent"
														transition={SPRING_INDICATOR}
													/>
												) : null}
											</Link>
										</li>
									);
								})}
							</ul>
						</nav>
						<Link
							href={CONTACT.href}
							className={cn(
								"inline-flex min-h-control items-center rounded-full px-4 text-xs font-medium uppercase tracking-meta transition-ui pressable",
								isActive(CONTACT.href)
									? "bg-accent text-bg"
									: "border border-accent/60 text-accent-text hover:bg-accent hover:text-bg",
							)}
						>
							{CONTACT.label}
						</Link>
						<ThemeToggle compact />
					</div>

					{/* Mobile controls */}
					<div className="flex items-center gap-2 lg:hidden">
						<ThemeToggle compact />
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							aria-expanded={open}
							aria-controls="mobile-menu"
							aria-label={open ? "Close menu" : "Open menu"}
							className="grid size-control place-items-center rounded-(--radius-sm) text-ink transition-ui pressable hover:bg-canvas hover:text-accent-text active:bg-canvas"
						>
							{open ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</Container>

				{/* Mobile drawer: floats over the page on opacity + transform (never height). */}
				<AnimatePresence>
					{open ? (
						<>
							<motion.div
								key="scrim"
								aria-hidden="true"
								onClick={() => setOpen(false)}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: DUR.base, ease: EASE_OUT }}
								className="absolute inset-x-0 top-full h-dvh bg-scrim/40 lg:hidden"
							/>
							<motion.div
								key="panel"
								id="mobile-menu"
								initial={{ opacity: 0, y: -8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: DUR.base, ease: EASE_OUT }}
								className="absolute inset-x-0 top-full lg:hidden"
							>
								<nav
									aria-label="Primary mobile"
									className="border-y border-line bg-surface-raised px-(--container-px) py-2 shadow-e3"
								>
									<ul className="flex flex-col">
										<li>
											<a
												href={whatsappHref}
												target="_blank"
												rel="noopener noreferrer"
												className={DRAWER_ROW}
											>
												<span className="flex items-center gap-3 font-medium">
													<WhatsAppIcon className="size-4 text-accent-text" aria-hidden="true" />
													Message on WhatsApp
												</span>
												<ArrowRight size={16} aria-hidden="true" className="text-muted" />
											</a>
										</li>
										{[...NAV, CONTACT].map((item) => {
											const active = isActive(item.href);
											return (
												<li key={item.href}>
													<Link
														href={item.href}
														aria-current={active ? "page" : undefined}
														className={cn(
															DRAWER_ROW,
															active ? "font-medium text-accent-text" : "text-ink",
														)}
													>
														<span>{item.label}</span>
														<ArrowRight size={16} aria-hidden="true" className="text-muted" />
													</Link>
												</li>
											);
										})}
									</ul>
								</nav>
							</motion.div>
						</>
					) : null}
				</AnimatePresence>
			</header>
		</>
	);
}
