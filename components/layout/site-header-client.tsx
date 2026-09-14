"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
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
					scrolled ? "border-(--color-gold-hairline) shadow-e3" : "border-transparent",
				)}
			>
				{/* One padding in both states: the bar is always --header-h-shrunk, so the
				    shrink never animates layout (motion addendum C5); the brand mark carries
				    the cue by scaling instead. z-10 keeps the bar above the open drawer sheet. */}
				<Container className="relative z-10 flex items-center justify-between gap-4 py-2">
					{/* Brand mark */}
					<Link
						href="/"
						className="group flex min-h-control items-center gap-3 transition-colors hover:text-accent-text"
						aria-label="Home"
					>
						<span
							className={cn(
								"inline-flex shrink-0 origin-left transition-ui",
								scrolled && "scale-90",
							)}
						>
							<Image
								src="/logo.jpg"
								alt=""
								width={36}
								height={36}
								priority
								className="size-8 rounded-full ring-1 ring-line transition-ui group-hover:ring-accent md:size-9"
							/>
						</span>
						<span className="t-headline text-xl md:text-2xl">
							<span>{latinPrefix}</span>
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
												{/* 1px gold hairline indicator; decorative-contrast, so the
												    accent text and aria-current carry the state (2.12). */}
												{active ? (
													<motion.span
														aria-hidden="true"
														layoutId="nav-indicator"
														className="pointer-events-none absolute inset-x-0 bottom-1 h-px bg-(--color-gold-hairline)"
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
							className="relative grid size-control place-items-center rounded-(--radius-sm) text-ink transition-ui pressable hover:bg-canvas hover:text-accent-text active:bg-canvas"
						>
							{/* Hamburger and X cross-fade with a quarter turn (motion addendum C6). */}
							<AnimatePresence mode="wait" initial={false}>
								<motion.span
									key={open ? "close" : "open"}
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: DUR.fast, ease: EASE_OUT }}
									className="absolute inset-0 grid place-items-center"
								>
									{open ? <X size={20} /> : <Menu size={20} />}
								</motion.span>
							</AnimatePresence>
						</button>
					</div>
				</Container>

				<MobileDrawer
					open={open}
					items={[...NAV, CONTACT]}
					isActive={isActive}
					whatsappHref={whatsappHref}
					onClose={() => setOpen(false)}
				/>
			</header>
		</>
	);
}
