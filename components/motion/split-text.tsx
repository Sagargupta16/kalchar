"use client";

import { Fragment } from "react";

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
	const words = text.split(" ");
	let charOffset = 0;

	return (
		<span className={className} role="img" aria-label={text}>
			{words.map((word, wordIndex) => {
				const wordStart = charOffset;
				charOffset += word.length + 1;
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: stable position-based split
					<Fragment key={`${wordIndex}-${word}`}>
						<span data-split-word className="inline-block whitespace-nowrap" aria-hidden="true">
							{Array.from(word).map((char, charIndex) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: stable position-based split
									key={`${charIndex}-${char}`}
									className="split-char inline-block"
									style={{
										animationDelay: `${startDelayMs + (wordStart + charIndex) * charDelayMs}ms`,
									}}
								>
									{char}
								</span>
							))}
						</span>
						{wordIndex < words.length - 1 ? " " : null}
					</Fragment>
				);
			})}
		</span>
	);
}
