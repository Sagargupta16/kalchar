import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function AboutLoading() {
	return (
		<main>
			<Section padded>
				<SkeletonHeader />
				<div className="mt-(--space-block) grid gap-12 md:grid-cols-12 md:gap-14">
					<div className="flex max-w-(--header-max) flex-col gap-4 md:col-span-8">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
					{/* Mirrors the real aside: avatar, Based in, Open to (Commission shares the second slot). */}
					<aside className="flex flex-col gap-4 md:col-span-4">
						<Skeleton className="aspect-4/5 w-full rounded-(--radius-md)" />
						<Skeleton className="h-28 rounded-(--radius-md)" />
						<Skeleton className="h-28 rounded-(--radius-md)" />
					</aside>
				</div>
			</Section>
		</main>
	);
}
