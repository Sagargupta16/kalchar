import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Mirrors the page order: WhatsApp, catalogue, Email, Follow along (QR grid, YouTube), personal, closing. */
export default function ContactLoading() {
	return (
		<main>
			<Section padded size="narrow">
				<SkeletonHeader />
				<Skeleton className="mt-(--space-block) h-28 rounded-(--radius-md)" />
				<Skeleton className="mt-4 h-11 w-full sm:w-72" />
				<Skeleton className="mt-4 h-20 rounded-(--radius-md)" />
				<Skeleton className="mt-(--space-block) h-3 w-24" />
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<Skeleton className="h-36 rounded-(--radius-md)" />
					<Skeleton className="h-36 rounded-(--radius-md)" />
				</div>
				<Skeleton className="mt-4 h-20 rounded-(--radius-md)" />
				<Skeleton className="mx-auto mt-6 h-4 w-48" />
				<Skeleton className="mt-(--space-block) h-28 rounded-(--radius-md)" />
			</Section>
		</main>
	);
}
