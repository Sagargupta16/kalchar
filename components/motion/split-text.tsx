"use client";

interface SplitTextProps {
	text: string;
	className?: string;
	startDelayMs?: number;
	charDelayMs?: number;
}

export function SplitText({
	text,
	className,
	startDelayMs = 0,
	charDelayMs = 12,
}: Readonly<SplitTextProps>) {
	const chars = Array.from(text);
	return (
		<span className={className} role="img" aria-label={text}>
			{chars.map((ch, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: stable position-based split
					key={`${i}-${ch}`}
					className="split-char inline-block"
					style={{ animationDelay: `${startDelayMs + i * charDelayMs}ms` }}
					aria-hidden="true"
				>
					{ch === " " ? " " : ch}
				</span>
			))}
		</span>
	);
}
