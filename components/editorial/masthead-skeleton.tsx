import type { ComponentProps, ReactNode } from "react";
import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Loading twin of Masthead: the same pigment band, a header skeleton, an
 *  optional right column and the three-stat row on its hairline. */
export function MastheadSkeleton({
	accent,
	aside,
	children,
}: Readonly<{
	accent: ComponentProps<typeof Section>["accent"];
	aside?: ReactNode;
	children?: ReactNode;
}>) {
	return (
		<Section
			accent={accent}
			background="pigment"
			padded
			containerClassName="relative pt-10 pb-10 sm:pt-12 lg:pt-12 lg:pb-12"
		>
			<div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10">
				<div className={aside ? "lg:col-span-7" : "lg:col-span-9"}>
					<SkeletonHeader />
					{children}
				</div>
				{aside ? <div className="lg:col-span-5">{aside}</div> : null}
			</div>
			<div className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:mt-10 sm:gap-8 lg:max-w-3xl">
				{[0, 1, 2].map((slot) => (
					<div key={slot}>
						<Skeleton className="h-9 w-14" />
						<Skeleton className="mt-2 h-3 w-20" />
					</div>
				))}
			</div>
		</Section>
	);
}
