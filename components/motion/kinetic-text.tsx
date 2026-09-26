import { type CSSProperties, Fragment } from "react";
import { cn } from "@/lib/utils";

interface KineticTextProps {
	/** Copy to split; "\n" starts a new line (each line renders as a block). */
	text: string;
	/** Set the final word in the accent italic (the hero's "life."). */
	accentLast?: boolean;
	/** Offset added to every word's --w, so a second run continues the stagger. */
	startIndex?: number;
}

interface Word {
	id: string;
	text: string;
	index: number;
	accent: boolean;
}

function splitLines(text: string, startIndex: number, accentLast: boolean): Word[][] {
	const lines: Word[][] = [];
	let index = startIndex;
	const rows = text.split("\n");
	for (let row = 0; row < rows.length; row++) {
		const words = (rows[row] ?? "").trim().split(/\s+/).filter(Boolean);
		lines.push(
			words.map((word, column) => ({
				id: `${row}:${column}`,
				text: word,
				index: index++,
				accent: false,
			})),
		);
	}
	const last = lines.at(-1)?.at(-1);
	if (accentLast && last) last.accent = true;
	return lines.filter((line) => line.length > 0);
}

/**
 * Kinetic headline copy: every word sits in its own overflow mask and rides
 * up with a per-word stagger (--w x --kinetic-step, components/motion/kinetic.css).
 * Pure markup: the real text is in the server HTML (SEO, no-JS, screen
 * readers read one normal sentence), and only transform animates. The parent
 * picks the trigger: `kinetic-eager` plays on paint, a useViewReveal host
 * (data-reveal) plays on scroll.
 */
export function KineticText({
	text,
	accentLast = false,
	startIndex = 0,
}: Readonly<KineticTextProps>) {
	const lines = splitLines(text, startIndex, accentLast);
	const multiline = lines.length > 1;
	return (
		<>
			{lines.map((line, row) => (
				<Fragment key={line[0]?.id}>
					{row > 0 ? " " : null}
					<span className={multiline ? "block" : undefined}>
						{line.map((word, column) => (
							<Fragment key={word.id}>
								{column > 0 ? " " : null}
								<span className="kinetic-mask">
									<span
										className={cn("kinetic-word", word.accent && "kinetic-accent")}
										style={{ "--w": word.index } as CSSProperties}
									>
										{word.text}
									</span>
								</span>
							</Fragment>
						))}
					</span>
				</Fragment>
			))}
		</>
	);
}
