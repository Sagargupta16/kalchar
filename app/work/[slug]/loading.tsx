import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

/** Structural twin of the detail page: the painted wall band holding the
 *  breadcrumb, the plate (7 of 12) and the details column (wall label, price,
 *  full-width CTA). The wall takes the house terracotta until the piece loads. */
export default function ArtworkDetailLoading() {
	return (
		<main aria-busy="true">
			<output className="sr-only">Loading</output>
			<section className="band-pigment">
				<Container className="pt-5 pb-12 sm:pt-6 lg:pb-16">
					<Skeleton className="h-control w-44" />
					<div className="mt-4 grid gap-10 lg:mt-6 lg:grid-cols-12 lg:gap-14">
						<div className="min-w-0 lg:col-span-7">
							{/* A portrait placeholder until the artwork's own ratio is known. */}
							<Skeleton className="aspect-4/5 w-full rounded-(--radius-lg)" />
						</div>
						<div className="min-w-0 lg:col-span-5">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="mt-3 h-10 w-3/4" />
							<Skeleton className="mt-3 h-3 w-2/3" />
							<Skeleton className="mt-4 h-9 w-32" />
							<div className="mt-(--space-block) rounded-(--radius-md) border border-line bg-canvas p-(--card-pad)">
								<Skeleton className="h-12 w-full rounded-(--radius-sm)" />
								<Skeleton className="mt-3 h-3 w-2/3" />
							</div>
						</div>
					</div>
				</Container>
			</section>
		</main>
	);
}
