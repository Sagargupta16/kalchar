import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { isMaintainer } from "@/lib/maintainers";
import { adminBtn } from "./_components/controls";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
	const session = await auth();
	const email = session?.user?.email;
	if (!email || !(await isMaintainer(email))) redirect("/login?callbackUrl=/admin");

	return (
		<div className="mx-auto min-h-dvh max-w-6xl px-(--container-px) py-8">
			<header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
				<nav className="flex items-center gap-5 text-sm">
					<Link href="/admin" className="t-display text-lg text-accent">
						Admin
					</Link>
					<Link
						href="/admin"
						className="rounded-(--radius-sm) px-2.5 py-1 text-muted transition-colors hover:bg-bg-soft hover:text-ink"
					>
						Artworks
					</Link>
					<Link
						href="/admin/maintainers"
						className="rounded-(--radius-sm) px-2.5 py-1 text-muted transition-colors hover:bg-bg-soft hover:text-ink"
					>
						Maintainers
					</Link>
					<Link
						href="/"
						className="rounded-(--radius-sm) px-2.5 py-1 text-muted transition-colors hover:bg-bg-soft hover:text-ink"
					>
						View site
					</Link>
				</nav>
				<div className="flex items-center gap-3 text-sm text-muted">
					<span className="hidden sm:inline">{email}</span>
					<form
						action={async () => {
							"use server";
							await signOut({ redirectTo: "/" });
						}}
					>
						<button type="submit" className={`${adminBtn} px-3 py-1.5`}>
							Sign out
						</button>
					</form>
				</div>
			</header>
			{children}
		</div>
	);
}
