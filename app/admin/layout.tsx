import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { isMaintainer } from "@/lib/maintainers";
import { AdminNavDesktop, AdminNavMobile } from "./_components/admin-nav";
import { ConfirmProvider } from "./_components/confirm-dialog";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Up to two initials from an email's local part (e.g. "sg85207" -> "SG"). */
function initials(email: string): string {
	const local = email.split("@")[0] ?? email;
	const letters = local.replace(/[^a-zA-Z]/g, "");
	return (letters.slice(0, 2) || local.slice(0, 2)).toUpperCase();
}

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
	const session = await auth();
	const email = session?.user?.email;
	if (!email || !(await isMaintainer(email))) redirect("/login?callbackUrl=/admin");

	return (
		<ConfirmProvider>
			<div className="min-h-dvh bg-bg-soft">
				{/* Top bar */}
				<header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
					<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-(--container-px) py-3">
						<div className="flex items-center gap-6">
							<Link href="/admin" className="flex items-center gap-2">
								<div className="grid h-8 w-8 place-items-center rounded-(--radius-sm) bg-accent text-bg">
									<Settings size={14} />
								</div>
								<span className="text-sm font-semibold">Admin</span>
							</Link>
							<AdminNavDesktop />
						</div>
						<div className="flex items-center gap-2.5">
							<span
								role="img"
								title={email}
								aria-label={`Signed in as ${email}`}
								className="grid h-8 w-8 place-items-center rounded-full bg-bg-muted text-[0.65rem] font-semibold uppercase tracking-wide text-ink ring-1 ring-line"
							>
								{initials(email)}
							</span>
							<form
								action={async () => {
									"use server";
									await signOut({ redirectTo: "/" });
								}}
							>
								<button
									type="submit"
									className="inline-flex h-8 items-center gap-1.5 rounded-(--radius-sm) border border-line bg-bg px-3 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
								>
									<LogOut size={12} />
									<span>Sign out</span>
								</button>
							</form>
						</div>
					</div>
				</header>

				{/* Content. Extra bottom padding on mobile so the fixed tab bar
			    never covers the last row of content. */}
				<main className="mx-auto max-w-6xl px-(--container-px) pt-8 pb-24 md:pb-8">{children}</main>

				{/* Mobile bottom tab bar */}
				<AdminNavMobile />
			</div>
		</ConfirmProvider>
	);
}
