import { ExternalLink, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireAdminPage } from "@/lib/admin-auth";
import { getArtworkFieldSuggestions, getCategoryNames } from "@/lib/data";
import { serverEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import { AddSheetProvider } from "./_components/add-sheet";
import { AdminNavDesktop, AdminNavMobile } from "./_components/admin-nav";
import { ConfirmProvider } from "./_components/confirm-dialog";
import { adminBtn, ICON_MD } from "./_components/controls";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/** Up to two initials from an email's local part (e.g. "sg85207" -> "SG"). */
function initials(email: string): string {
	const local = email.split("@")[0] ?? email;
	const letters = local.replace(/[^a-zA-Z]/g, "");
	return (letters.slice(0, 2) || local.slice(0, 2)).toUpperCase();
}

async function signOutAction() {
	"use server";
	await signOut({ redirectTo: "/" });
}

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
	const email = await requireAdminPage();
	const [categoryNames, suggestions] = await Promise.all([
		getCategoryNames(),
		getArtworkFieldSuggestions(),
	]);

	// The More sheet's foot row (1.4): sign out stays reachable on phones.
	const sheetSignOut = (
		<form action={signOutAction}>
			<button type="submit" className={cn(adminBtn, "text-muted")}>
				<LogOut size={ICON_MD} aria-hidden="true" />
				Sign out
			</button>
		</form>
	);

	return (
		<ConfirmProvider>
			<AddSheetProvider categories={categoryNames} suggestions={suggestions}>
				<div data-admin-shell className="min-h-dvh bg-canvas">
					<header className="sticky top-0 z-nav border-b border-line bg-surface">
						<Container className="flex items-center justify-between gap-4 py-2">
							<Link
								href="/admin"
								className="flex min-h-control items-center gap-3 rounded-(--radius-sm)"
							>
								<span className="grid size-9 place-items-center rounded-(--radius-sm) bg-accent text-bg">
									<Settings size={ICON_MD} aria-hidden="true" />
								</span>
								<span className="text-sm font-semibold">Kalchar Admin</span>
							</Link>
							<div className="flex items-center gap-3">
								{/* Phone header trim (1.4): View site + avatar below xl; theme,
								    email and sign out live in the More sheet there and return
								    to the header from xl. Nothing is removed. */}
								<a
									href="/"
									target="_blank"
									rel="noreferrer"
									className={cn(adminBtn, "text-muted xl:hidden")}
								>
									<ExternalLink size={ICON_MD} aria-hidden="true" />
									View site
								</a>
								<ThemeToggle compact className="hidden xl:grid" />
								<span className="hidden max-w-48 truncate text-label text-muted xl:inline">
									{email}
								</span>
								<span
									role="img"
									title={email}
									aria-label={`Signed in as ${email}`}
									className="grid size-control place-items-center rounded-full bg-bg-muted text-xs font-semibold uppercase text-ink ring-1 ring-line"
								>
									{initials(email)}
								</span>
								<form action={signOutAction} className="hidden xl:block">
									<button
										type="submit"
										aria-label="Sign out"
										title="Sign out"
										className={cn(adminBtn, "min-w-control text-muted")}
									>
										<LogOut size={ICON_MD} aria-hidden="true" />
										<span className="hidden sm:inline">Sign out</span>
									</button>
								</form>
							</div>
						</Container>
						<div className="hidden border-t border-line/70 xl:block">
							<Container>
								<AdminNavDesktop />
							</Container>
						</div>
					</header>

					{serverEnv.adminPreview ? (
						<p className="border-b border-line bg-surface px-(--container-px) py-2 text-center text-label text-muted">
							Preview mode: fixture data, nothing you change here is saved.
						</p>
					) : null}

					<Container
						as="main"
						className="pt-(--space-group) pb-[calc(var(--tabbar-offset)+var(--space-page))] sm:pt-(--space-page) xl:pb-(--space-page)"
					>
						{children}
					</Container>

					<AdminNavMobile email={email} signOut={sheetSignOut} />
				</div>
			</AddSheetProvider>
		</ConfirmProvider>
	);
}
