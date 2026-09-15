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
import { AdminDraftProvider } from "./_components/admin-draft-guard";
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
			<AdminDraftProvider>
				<AddSheetProvider categories={categoryNames} suggestions={suggestions}>
					<div data-admin-shell className="min-h-dvh bg-canvas">
						<a
							href="#admin-content"
							className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-overlay focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-ink"
						>
							Skip admin navigation
						</a>
						<header className="sticky top-0 z-nav border-b border-line bg-surface">
							<Container className="flex max-w-[90rem] items-center justify-between gap-2 py-2 sm:gap-4">
								<Link
									href="/admin"
									className="flex min-h-control min-w-0 items-center gap-2 rounded-md sm:gap-3"
								>
									<span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent text-bg">
										<Settings size={ICON_MD} aria-hidden="true" />
									</span>
									<span className="text-sm font-semibold">
										Kalchar <span className="hidden min-[360px]:inline">Admin</span>
									</span>
								</Link>
								<div className="flex shrink-0 items-center gap-2 sm:gap-3">
									<a
										href="/"
										target="_blank"
										rel="noreferrer"
										aria-label="View site (opens in a new tab)"
										className={cn(adminBtn, "rounded-md text-muted")}
									>
										<ExternalLink size={ICON_MD} aria-hidden="true" />
										View site
									</a>
									<ThemeToggle compact className="hidden xl:grid" />
									<span
										title={email}
										className="hidden max-w-48 truncate text-label text-muted xl:inline"
									>
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
						</header>

						{serverEnv.adminPreview ? (
							<p className="border-b border-line bg-surface px-(--container-px) py-2 text-center text-label text-muted">
								Preview mode: fixture data, nothing you change here is saved.
							</p>
						) : null}

						<Container className="max-w-[90rem] xl:grid xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-start xl:gap-8">
							<aside className="sticky top-[calc(var(--header-h-shrunk)+var(--space-group))] my-(--space-group) hidden max-h-[calc(100dvh-var(--header-h-shrunk)-var(--space-group)*2)] min-h-0 flex-col border-r border-line pr-4 xl:flex">
								<AdminNavDesktop />
							</aside>
							<main
								id="admin-content"
								tabIndex={-1}
								className="min-w-0 scroll-mt-[calc(var(--header-h-shrunk)+var(--space-group))] pt-(--space-group) pb-[calc(var(--tabbar-offset)+var(--space-page))] sm:pt-(--space-page) xl:pb-(--space-page)"
							>
								{children}
							</main>
						</Container>

						<AdminNavMobile email={email} signOut={sheetSignOut} />
					</div>
				</AddSheetProvider>
			</AdminDraftProvider>
		</ConfirmProvider>
	);
}
