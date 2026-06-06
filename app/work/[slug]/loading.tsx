import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArtworkDetailLoading() {
	return (
		<main>
			<Container className="py-(--section-py)">
				<Skeleton className="h-3 w-28" />
				<div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14">
					{/* Image */}
					<Skeleton className="aspect-3/4 w-full rounded-(--radius-lg)" />
					{/* Info */}
					<div className="space-y-5">
						<Skeleton className="h-10 w-3/4" />
						<Skeleton className="h-4 w-24" />
						<div className="space-y-3 border-t border-line pt-5">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="mt-4 h-12 w-full max-w-xs rounded-(--radius-sm)" />
					</div>
				</div>
			</Container>
		</main>
	);
}
