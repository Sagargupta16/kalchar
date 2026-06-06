import { Container } from "@/components/ui/container";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function ContactLoading() {
	return (
		<main>
			<Container size="narrow" className="py-(--section-py)">
				<SkeletonHeader />
				{/* WhatsApp band */}
				<Skeleton className="mt-10 h-28 w-full rounded-(--radius-md)" />
				{/* Two IG cards */}
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<Skeleton className="h-32 w-full rounded-(--radius-md)" />
					<Skeleton className="h-32 w-full rounded-(--radius-md)" />
				</div>
				{/* Email */}
				<Skeleton className="mt-5 h-16 w-full rounded-(--radius-md)" />
			</Container>
		</main>
	);
}
