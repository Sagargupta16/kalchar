import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProfileLoading() {
	return (
		<div className="max-w-2xl space-y-6">
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-40 w-full rounded-(--radius-md)" />
			<Skeleton className="h-24 w-full rounded-(--radius-md)" />
		</div>
	);
}
