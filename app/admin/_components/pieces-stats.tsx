"use client";

import { Inbox, Layers, type LucideIcon, Star } from "lucide-react";
import { animate } from "motion/react";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { DUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { adminStatusDot, ICON_SM } from "./controls";

export interface PiecesStatsProps {
	total: number;
	available: number;
	sold: number;
	featured: number;
	/** New enquiries on the newest leads page. */
	newEnquiries: number;
}

interface Tile {
	key: string;
	label: string;
	value: number;
	href: string;
	icon: LucideIcon | null;
	/** Status dot instead of an icon (the 1.15 status tokens). */
	dot?: string;
	/** Tile width on phones (6-column grid): two wide on row one, three on row two; lg is one row of five. */
	span: string;
	/** Tint the icon chip with the accent: something is waiting. */
	attention?: boolean;
}

/**
 * Count-up on mount: 0 to the value in DUR.base on EASE_OUT (well under the
 * 600ms budget). The digits are aria-hidden; the tile's accessible name
 * carries the settled number, so a screen reader never hears the ramp.
 */
function CountUp({ value }: Readonly<{ value: number }>) {
	const ref = useRef<HTMLSpanElement>(null);
	useLayoutEffect(() => {
		const node = ref.current;
		if (!node || value === 0) return;
		node.textContent = "0";
		const controls = animate(0, value, {
			duration: DUR.base,
			ease: EASE_OUT,
			onUpdate: (latest) => {
				node.textContent = String(Math.round(latest));
			},
		});
		return () => controls.stop();
	}, [value]);
	return (
		<span ref={ref} aria-hidden="true">
			{value}
		</span>
	);
}

/**
 * Dashboard overview above the Pieces grid: four inventory tiles (each a link
 * into the matching ?show= lens) plus new enquiries. Tabular numerals so the
 * count-up never jitters the tile width; tiles arrive on the admin stagger.
 */
export function PiecesStats({
	total,
	available,
	sold,
	featured,
	newEnquiries,
}: Readonly<PiecesStatsProps>) {
	const tiles: Tile[] = [
		{
			key: "all",
			label: "Total pieces",
			value: total,
			href: "/admin",
			icon: Layers,
			span: "col-span-3",
		},
		{
			key: "enquiries",
			label: "New enquiries",
			value: newEnquiries,
			href: "/admin/leads",
			icon: Inbox,
			// Second on phones (row one pairs the two headline numbers); last from lg.
			span: "col-span-3 lg:order-last",
			attention: newEnquiries > 0,
		},
		{
			key: "available",
			label: "Available",
			value: available,
			href: "/admin?show=available",
			icon: null,
			dot: "bg-status-available",
			span: "col-span-2",
		},
		{
			key: "sold",
			label: "Sold",
			value: sold,
			href: "/admin?show=sold",
			icon: null,
			dot: "bg-status-sold",
			span: "col-span-2",
		},
		{
			key: "featured",
			label: "Featured",
			value: featured,
			href: "/admin?show=featured",
			icon: Star,
			span: "col-span-2",
		},
	];

	return (
		<section aria-label="Overview">
			<ul className="admin-stagger grid grid-cols-6 gap-2 sm:gap-3 lg:grid-cols-5 lg:gap-4">
				{tiles.map((tile) => (
					<li key={tile.key} className={cn("min-w-0 lg:col-span-1", tile.span)}>
						<Link
							href={tile.href}
							scroll={false}
							aria-label={`${tile.label}: ${tile.value}`}
							className="group flex h-full min-h-control flex-col justify-between gap-3 rounded-(--radius-md) border border-line bg-surface p-3 shadow-e1 transition-ui hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 sm:p-4"
						>
							<span className="text-label font-medium text-muted">{tile.label}</span>
							<span className="flex items-end justify-between gap-2">
								<span className="text-2xl leading-none font-semibold tracking-tight text-ink tabular-nums sm:text-3xl">
									<CountUp value={tile.value} />
								</span>
								<span
									aria-hidden="true"
									className={cn(
										"grid size-7 shrink-0 place-items-center rounded-(--radius-sm) bg-canvas ring-1 ring-line transition-colors",
										tile.attention ? "text-accent-text" : "text-muted group-hover:text-ink",
									)}
								>
									{tile.icon ? (
										<tile.icon
											size={ICON_SM}
											className={
												tile.key === "featured" ? "fill-current text-gold-leaf" : undefined
											}
										/>
									) : (
										<span className={cn(adminStatusDot, "size-2", tile.dot)} />
									)}
								</span>
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
