import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Mirrors the page order: wash header, WhatsApp plate, catalogue,
 *  email, Follow along (QR plate tiles), personal line, closing CTA. */
export default function ContactLoading() {
	return (
		<main>
			<output className="sr-only">Loading contact options</output>
			<Section
				accent="peacock"
				background="wash"
				padded
				size="narrow"
				containerClassName="py-(--space-block)"
			>
				<SkeletonHeader />
			</Section>
			<Section accent="peacock" padded size="narrow" containerClassName="pt-(--space-block)">
				<Skeleton className="h-32 rounded-(--radius-md)" />
				<Skeleton className="mt-4 h-11 w-full sm:w-72" />
				<Skeleton className="mt-4 h-20 rounded-(--radius-md)" />
				<Skeleton className="mt-(--space-block) h-3 w-24" />
				<div className="mt-5 grid grid-cols-2 gap-x-(--grid-gap) gap-y-8 lg:grid-cols-3">
					{[0, 1, 2].map((i) => (
						<div key={i}>
							<Skeleton className="aspect-square w-full rounded-(--radius-md)" />
							<Skeleton className="mt-4 h-5 w-3/4" />
							<Skeleton className="mt-2 h-3 w-1/2" />
						</div>
					))}
				</div>
				<Skeleton className="mx-auto mt-8 h-4 w-48" />
				<Skeleton className="mt-(--space-block) h-40 rounded-(--radius-md)" />
			</Section>
		</main>
	);
}
