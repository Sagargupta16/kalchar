import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function CustomOrdersLoading() {
	return (
		<main>
			<Section padded>
				<SkeletonHeader />
				<div className="mt-(--space-block) grid gap-12 md:grid-cols-12 md:gap-14">
					{/* How it works: after the form on phones, beside it from md. */}
					<aside className="order-last flex flex-col gap-6 md:order-none md:col-span-5">
						<div>
							<Skeleton className="h-3 w-24" />
							<Skeleton className="mt-2 h-7 w-3/4" />
						</div>
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="size-9 shrink-0 rounded-full" />
								<div className="flex flex-1 flex-col gap-2">
									<Skeleton className="h-5 w-1/2" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						))}
					</aside>
					{/* Form: same surface and shadow as the real Card. */}
					<div className="md:col-span-7">
						<div className="flex flex-col gap-(--form-gap) rounded-(--radius-md) border border-line bg-surface p-(--card-pad-lg) shadow-e1">
							{[0, 1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-12 w-full sm:w-56" />
						</div>
					</div>
				</div>
			</Section>
		</main>
	);
}
