import type { ReactNode } from "react";
import { BinduMark } from "@/components/decor/bindu-mark";
import { Reveal } from "@/components/motion/reveal";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * WallLabel -- the museum wall text under every plate (visual-direction 1.9).
 * Line 1: "No. 07 of 21" counter in tracked meta caps with tabular numerals
 * (optionally prefixed by a BinduMark and/or a caller slot like the hero's
 * kept "Featured" glyph line). Line 2: the work's title in the italic display
 * voice (the one titled-work register). Line 3: meta facts joined with a
 * middle dot. Line 4: the price in the numeral voice and the section pigment
 * (text-title on the full variant, steering 2026-09-14: one rung under the
 * old text-h2 so the caption stops shouting past the title), or the status
 * line ("Sold", "Not listed for sale") when `status` is given.
 * `tone="scrim"` swaps ink/muted for text-bg / text-bg-70 (lightbox caption);
 * `stagger` rises the lines on the eager Reveal rhythm; `headingLevel` lets
 * the detail page render line 2 as the document h1 (everywhere else it is a
 * paragraph inside a labelled card).
 */

type WallLabelLineTag = "p" | "h1" | "h2";

interface WallLabelLine {
	key: string;
	tag: WallLabelLineTag;
	className: string;
	content: ReactNode;
}

interface WallLabelProps {
	/** 1-based catalogue position; zero-padded to two digits ("No. 07"). */
	index?: number;
	/** Catalogue size; renders "of {total}" after the counter. */
	total?: number;
	title: string;
	/** Meta facts (style, medium, year, dimensions); empty entries are dropped. */
	meta: string[];
	/** Formatted price (formatInr); ignored when `status` is present. */
	price?: string;
	/** Status line replacing the price slot ("Sold", "Not listed for sale"). */
	status?: string;
	/** compact = grid captions; full = detail page and lightbox sidebar. */
	variant?: "full" | "compact";
	/** scrim = light-on-dark caption inside the lightbox room. */
	tone?: "paper" | "scrim";
	as?: "figcaption" | "div";
	/** Rise the lines with Reveal eager at staggerDelay(i + 1). */
	stagger?: boolean;
	/** Render a BinduMark before line 1 (detail page, lightbox, event captions). */
	mark?: boolean;
	/** Rendered before the counter on line 1 (the hero passes its kept Featured glyph). */
	prefix?: ReactNode;
	/** Line 2's element: the detail page passes "h1"; default is a paragraph. */
	headingLevel?: "h1" | "h2" | "none";
	/** Optional id on line 2 (the lightbox labels its dialog by the title). */
	titleId?: string;
	/** Extra classes on line 2 (the detail page adds md:text-h1). */
	titleClassName?: string;
	className?: string;
}

function formatCounter(index?: number, total?: number): string | null {
	if (typeof index !== "number") return null;
	const counter = `No. ${String(index).padStart(2, "0")}`;
	if (typeof total === "number") return `${counter} of ${total}`;
	return counter;
}

export function WallLabel({
	index,
	total,
	title,
	meta,
	price,
	status,
	variant = "compact",
	tone = "paper",
	as: Tag = "div",
	stagger = false,
	mark = false,
	prefix,
	headingLevel = "none",
	titleId,
	titleClassName,
	className,
}: Readonly<WallLabelProps>) {
	const full = variant === "full";
	const scrim = tone === "scrim";
	// Scrim text follows the house convention (globals.css SURFACES): the scrim
	// stays dark in both modes, so light mode reads text-bg (cream) and dark
	// mode reads text-ink (the near-white dark-mode ink).
	const mutedClass = scrim ? "text-bg/70 dark:text-ink/70" : undefined;

	const counter = formatCounter(index, total);
	const metaLine = meta.filter((item) => item.length > 0).join(" · ");
	const headingTag: WallLabelLineTag = headingLevel === "none" ? "p" : headingLevel;

	const lines: WallLabelLine[] = [];
	if (counter !== null || prefix != null || mark) {
		lines.push({
			key: "counter",
			tag: "p",
			className: cn("t-meta flex flex-wrap items-center gap-1.5 tabular-nums", mutedClass),
			content: (
				<>
					{mark ? <BinduMark /> : null}
					{prefix}
					{counter}
				</>
			),
		});
	}
	lines.push({
		key: "title",
		tag: headingTag,
		className: cn(
			"t-display",
			full ? "text-title" : "text-h3",
			scrim && "text-bg dark:text-ink",
			titleClassName,
		),
		// The id rides on an inner span so the stagger path (Reveal owns the line
		// element) can still be referenced by aria-labelledby.
		content: titleId ? <span id={titleId}>{title}</span> : title,
	});
	if (metaLine) {
		lines.push({ key: "meta", tag: "p", className: cn("t-meta", mutedClass), content: metaLine });
	}
	if (status) {
		lines.push({ key: "status", tag: "p", className: cn("t-meta", mutedClass), content: status });
	} else if (price) {
		lines.push({
			key: "price",
			tag: "p",
			className: cn(
				"t-numeral",
				full ? "text-title" : "text-base",
				scrim ? "text-bg dark:text-ink" : "text-(--section-accent)",
			),
			content: price,
		});
	}

	return (
		<Tag className={cn("grid gap-1", className)}>
			{lines.map((line, position) => {
				if (stagger) {
					return (
						<Reveal
							key={line.key}
							eager
							as={line.tag}
							delayMs={staggerDelay(position + 1)}
							className={line.className}
						>
							{line.content}
						</Reveal>
					);
				}
				const LineTag = line.tag;
				return (
					<LineTag key={line.key} className={line.className}>
						{line.content}
					</LineTag>
				);
			})}
		</Tag>
	);
}
