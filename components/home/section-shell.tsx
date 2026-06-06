import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";

interface SectionShellProps {
	eyebrow: string;
	title: string;
	lead?: string;
	href: string;
	hrefLabel: string;
	children: React.ReactNode;
}

export function SectionShell({
	eyebrow,
	title,
	lead,
	href,
	hrefLabel,
	children,
}: Readonly<SectionShellProps>) {
	return (
		<div className="border-b border-line py-(--section-py)">
			<Container>
				<header className="max-w-2xl">
					<Reveal>
						<p className="t-eyebrow flex items-center gap-2">
							<span aria-hidden="true" className="inline-block h-px w-5 bg-(--section-accent)" />
							{eyebrow}
						</p>
					</Reveal>
					<Reveal delayMs={80} as="h2" className="t-display mt-3 text-3xl sm:text-4xl md:text-5xl">
						{title}
					</Reveal>
					{lead ? (
						<Reveal delayMs={140}>
							<p className="t-lead mt-4">{lead}</p>
						</Reveal>
					) : null}
				</header>

				<div className="mt-10 sm:mt-14">{children}</div>

				<Reveal>
					<div className="mt-10 sm:mt-14">
						<Link
							href={href}
							className="group inline-flex items-center gap-2 text-sm uppercase tracking-[var(--tracking-meta)] text-accent transition-colors hover:text-accent-hover"
						>
							{hrefLabel}
							<ArrowRight
								size={14}
								aria-hidden="true"
								className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
							/>
						</Link>
					</div>
				</Reveal>
			</Container>
		</div>
	);
}
