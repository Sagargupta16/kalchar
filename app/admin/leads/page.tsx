import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin-auth";
import { getLeadsPage, getSite } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { adminBtn } from "../_components/controls";
import { LeadsManager } from "../_components/leads-manager";

// Admin queue: always render fresh, never prerender/cache. (Also keeps the
// build from querying the leads table before its migration is applied.)
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage({
	searchParams,
}: Readonly<{ searchParams: Promise<{ page?: string; lead?: string }> }>) {
	await requireAdminPage();
	const params = await searchParams;
	const requestedPage = Number(params.page ?? 1);
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const { leads, hasNextPage } = await getLeadsPage(page);
	const newCount = leads.filter((lead) => lead.status === "new").length;

	return (
		<AdminPage
			title="Enquiries"
			description={`Custom-order enquiries, newest first. Open one to see the contact details and reply. Mark it Contacted after replying, or Closed when resolved. Filters apply to this page.${newCount > 0 ? ` ${newCount} new on this page.` : ""}`}
		>
			{leads.length === 0 && page > 1 ? (
				<EmptyState
					variant="compact"
					voice="tool"
					title="No enquiries on this page"
					body="Return to the newest enquiries to continue."
					action={
						<Link href="/admin/leads" className={adminBtn}>
							Newest enquiries
						</Link>
					}
				/>
			) : (
				<LeadsManager
					key={page}
					leads={[...leads]}
					siteName={getSite().brand.publicName}
					initialLeadId={params.lead ?? null}
				/>
			)}
			{leads.length > 0 && (page > 1 || hasNextPage) ? (
				<nav
					aria-label="Enquiry pages"
					className="grid grid-cols-2 items-center gap-3 sm:flex sm:justify-between sm:gap-4"
				>
					{page > 1 ? (
						<Link href={`/admin/leads?page=${page - 1}`} className={adminBtn}>
							Newer enquiries
						</Link>
					) : (
						<span />
					)}
					<span className="col-span-2 row-start-1 text-center text-sm text-muted tabular-nums">
						Page {page}
					</span>
					{hasNextPage ? (
						<Link href={`/admin/leads?page=${page + 1}`} className={adminBtn}>
							Older enquiries
						</Link>
					) : (
						<span />
					)}
				</nav>
			) : null}
		</AdminPage>
	);
}
