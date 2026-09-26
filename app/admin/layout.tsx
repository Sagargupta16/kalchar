import { ExternalLink, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireAdminPage } from "@/lib/admin-auth";
import { getArtworkFieldSuggestions, getCategoryNames } from "@/lib/data";
import { serverEnv } from "@/lib/env";
import { cn } from "@/lib/utils";
import { AddSheetProvider } from "./_components/add-sheet";
import { AdminBrand } from "./_components/admin-brand";
import { AdminCrumb } from "./_components/admin-crumb";
import { AdminDraftProvider } from "./_components/admin-draft-guard";
import { AdminNavDesktop, AdminNavMobile, type NavCounts } from "./_components/admin-nav";
import { ConfirmProvider } from "./_components/confirm-dialog";
import { adminBtn, adminIconBtnGhost, adminInitialsDisc, ICON_MD } from "./_components/controls";
import { getNewEnquiryCount } from "./_new-enquiries";
import "./admin-theme.css";

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

/**
 * The admin shell (product-dashboard register, admin-theme.css): on desktop a
 * full-height white sidebar (brand, Add, grouped nav, account footer) beside a
 * sticky translucent top bar with the page crumb; on phones the top bar holds
 * the brand and the tab bar carries navigation. data-admin-shell sits on the
 * outermost element so the providers' dialogs render inside the themed tree.
 */
export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
	const email = await requireAdminPage();
	const [categoryNames, suggestions, newEnquiries] = await Promise.all([
		getCategoryNames(),
		getArtworkFieldSuggestions(),
		getNewEnquiryCount(),
	]);
	const counts: NavCounts = { "/admin/leads": newEnquiries };

	const sheetSignOut = (
		<form action={signOutAction}>
			<button type="submit" className={cn(adminBtn, "text-muted")}>
				<LogOut size={ICON_MD} aria-hidden="true" />
				Sign out
			</button>
		</form>
	);

	const avatar = (
		<span
			role="img"
			title={email}
			aria-label={`Signed in as ${email}`}
			className={cn(adminInitialsDisc, "size-9 text-xs")}
		>
			{initials(email)}
		</span>
	);

	return (
		<div data-admin-shell className="min-h-dvh bg-canvas text-ink">
			<ConfirmProvider>
				<AdminDraftProvider>
					<AddSheetProvider categories={categoryNames} suggestions={suggestions}>
						<a
							href="#admin-content"
							className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-overlay focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-ink"
						>
							Skip admin navigation
						</a>
						<div className="xl:grid xl:grid-cols-[16rem_minmax(0,1fr)]">
							<aside className="sticky top-0 z-nav hidden h-dvh min-h-0 flex-col border-r border-line bg-surface xl:flex">
								<div className="flex h-(--header-h-shrunk) shrink-0 items-center border-b border-line px-4">
									<AdminBrand />
								</div>
								<AdminNavDesktop counts={counts} />
								<div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
									{avatar}
									<span title={email} className="min-w-0 flex-1 truncate text-label text-muted">
										{email}
									</span>
									<ThemeToggle compact />
									<form action={signOutAction}>
										<button
											type="submit"
											aria-label="Sign out"
											title="Sign out"
											className={adminIconBtnGhost}
										>
											<LogOut size={ICON_MD} aria-hidden="true" />
										</button>
									</form>
								</div>
							</aside>

							<div className="min-w-0">
								<header className="sticky top-0 z-nav border-b border-line bg-canvas/85 backdrop-blur-md backdrop-saturate-150">
									<div className="mx-auto flex max-w-(--content-max) items-center justify-between gap-3 px-(--container-px) py-2">
										<AdminBrand className="xl:hidden" />
										<div className="hidden min-w-0 xl:block">
											<AdminCrumb />
										</div>
										<div className="flex shrink-0 items-center gap-2">
											{serverEnv.adminPreview ? (
												<span
													title="Preview mode: fixture data, nothing you change here is saved."
													className="hidden items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-label text-muted ring-1 ring-line sm:inline-flex"
												>
													<span aria-hidden="true" className="size-1.5 rounded-full bg-marigold" />
													Preview, nothing saves
												</span>
											) : null}
											<a
												href="/"
												target="_blank"
												rel="noreferrer"
												aria-label="View site (opens in a new tab)"
												className={cn(adminBtn, "min-w-control px-3 text-muted")}
											>
												<ExternalLink size={ICON_MD} aria-hidden="true" />
												<span className="hidden sm:inline">View site</span>
											</a>
											<span className="xl:hidden">{avatar}</span>
										</div>
									</div>
								</header>

								{serverEnv.adminPreview ? (
									<p className="border-b border-line bg-surface px-(--container-px) py-2 text-center text-label text-muted sm:hidden">
										Preview mode: fixture data, nothing saves.
									</p>
								) : null}

								<main
									id="admin-content"
									tabIndex={-1}
									className="mx-auto min-w-0 max-w-(--content-max) scroll-mt-[calc(var(--header-h-shrunk)+var(--space-group))] px-(--container-px) pt-(--space-group) pb-[calc(var(--tabbar-offset)+var(--space-page))] sm:pt-(--space-page) xl:pb-(--space-canyon)"
								>
									{children}
								</main>
							</div>
						</div>

						<AdminNavMobile email={email} counts={counts} signOut={sheetSignOut} />
					</AddSheetProvider>
				</AdminDraftProvider>
			</ConfirmProvider>
		</div>
	);
}
