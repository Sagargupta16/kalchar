"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
const NAV_INDICATOR_SPRING = { type: "spring", stiffness: 400, damping: 30 } as const;
const MOBILE_DRAWER_TRANSITION = {
	duration: 0.25,
	ease: [0.16, 1, 0.3, 1],
} as const;

interface Props {
	latinPrefix: string;
	devanagariCore: string;
}

export function SiteHeaderClient({ latinPrefix, devanagariCore }: Readonly<Props>) {
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
					"sticky top-0 z-40 border-b bg-bg/90 backdrop-blur-md transition-all duration-(--duration-base) ease-(--ease-out)",
					scrolled ? "border-line shadow-e3" : "border-transparent",
				)}
			>
				<div
					className={cn(
						"mx-auto flex max-w-6xl items-center justify-between gap-4 px-(--container-px) transition-[padding] duration-(--duration-base) ease-(--ease-out)",
						scrolled ? "py-2.5" : "py-3.5 md:py-4",
					)}
				>
					{/* Brand mark */}
					<Link
						href="/"
						className="group flex min-h-11 items-center gap-2.5 transition-colors hover:text-accent"
						aria-label="Home"
					>
						<Image
							src="/logo.jpg"
							alt=""
							width={36}
							height={36}
							priority
							className="h-8 w-8 rounded-full ring-1 ring-line transition-all duration-(--duration-base) ease-(--ease-out) group-hover:ring-accent md:h-9 md:w-9"
						/>
						<span className="t-display text-xl tracking-tight md:text-[1.4rem]">
							<span className="not-italic">{latinPrefix}</span>
							<span lang="hi" className="font-devanagari not-italic text-accent">
								{devanagariCore}
							</span>
						</span>
					</Link>

					{/* Desktop nav */}
					<div className="hidden items-center gap-6 lg:flex">
						<nav aria-label="Primary">
							<ul className="flex items-center gap-7">
								{NAV.map((item) => {
									const active = isActive(item.href);
									return (
										<li key={item.href} className="relative">
											<Link
												href={item.href}
												aria-current={active ? "page" : undefined}
												className={cn(
													"relative inline-flex min-h-11 items-center text-xs uppercase tracking-[var(--tracking-meta)] transition-colors",
													active ? "text-accent" : "text-muted hover:text-ink",
												)}
											>
												{item.label}
											</Link>
											{active ? (
												<motion.span
													aria-hidden="true"
													layoutId="nav-indicator"
													className="pointer-events-none absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-accent"
													transition={NAV_INDICATOR_SPRING}
												/>
											) : null}
										</li>
									);
								})}
							</ul>
						</nav>
						<Link
							href={CONTACT.href}
							className={cn(
								"inline-flex h-11 items-center rounded-full px-4 text-xs uppercase tracking-[var(--tracking-meta)] font-medium transition-all duration-(--duration-base) ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
								isActive(CONTACT.href)
									? "bg-accent text-bg"
									: "border border-accent/60 text-accent hover:bg-accent hover:text-bg",
							)}
						>
							{CONTACT.label}
						</Link>
						<ThemeToggle />
					</div>

					{/* Mobile controls */}
					<div className="flex items-center gap-1.5 lg:hidden">
						<ThemeToggle />
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							aria-expanded={open}
							aria-controls="mobile-menu"
							aria-label={open ? "Close menu" : "Open menu"}
							className="inline-flex h-11 w-11 items-center justify-center rounded-(--radius-sm) text-ink transition-colors hover:bg-bg-soft hover:text-accent"
						>
							{open ? <X size={20} /> : <Menu size={20} />}
						</button>
					</div>
				</div>

				{/* Mobile drawer */}
				<AnimatePresence>
					{open ? (
						<motion.div
							id="mobile-menu"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={MOBILE_DRAWER_TRANSITION}
							className="overflow-hidden lg:hidden"
						>
							<nav
								aria-label="Primary mobile"
								className="border-t border-line bg-bg px-(--container-px) py-2"
							>
								<ul className="flex flex-col">
									{[...NAV, CONTACT].map((item) => {
										const active = isActive(item.href);
										return (
											<li key={item.href}>
												<Link
													href={item.href}
													aria-current={active ? "page" : undefined}
													className={cn(
														"flex min-h-12 items-center justify-between border-b border-line-soft py-3 text-sm transition-colors last:border-b-0",
														active ? "text-accent font-medium" : "text-ink hover:text-accent",
													)}
												>
													<span>{item.label}</span>
													<ArrowRight size={14} className="text-muted" />
												</Link>
											</li>
										);
									})}
								</ul>
							</nav>
						</motion.div>
					) : null}
				</AnimatePresence>
			</header>
		</>
	);
}
