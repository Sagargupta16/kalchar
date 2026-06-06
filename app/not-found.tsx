import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export default function NotFound() {
	return (
		<Section accent="peacock">
			<main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-(--container-px) py-(--section-py) text-center">
				<p className="t-eyebrow">404</p>
				<h1 className="t-display mt-3 text-4xl sm:text-5xl">This page wandered off</h1>
				<p className="t-lead mt-5">
					The page you were looking for has moved or never existed. The work is still here.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Link href="/work" className={cn(buttonVariants({ variant: "primary" }), "group")}>
						Browse the work
						<ArrowRight
							size={16}
							aria-hidden="true"
							className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1"
						/>
					</Link>
					<Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "group")}>
						<ArrowLeft
							size={16}
							aria-hidden="true"
							className="transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:-translate-x-1"
						/>
						Back to home
					</Link>
				</div>
			</main>
		</Section>
	);
}
