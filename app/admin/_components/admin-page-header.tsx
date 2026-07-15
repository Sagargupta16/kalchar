import type { ReactNode } from "react";

export function AdminPageHeader({
	title,
	description,
	children,
}: Readonly<{ title: string; description: ReactNode; children?: ReactNode }>) {
	return (
		<header className="max-w-3xl">
			<h1 className="text-xl font-semibold leading-tight text-ink sm:text-2xl">{title}</h1>
			<p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
			{children}
		</header>
	);
}
