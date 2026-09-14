import Link from "next/link";
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
			description={`Enquiries from the custom-order form, newest first. Open one to reply on WhatsApp, mark it Contacted or Closed, and delete it when the details are no longer needed.${newCount > 0 ? ` ${newCount} new.` : ""}`}
		>
			<LeadsManager
				leads={[...leads]}
				siteName={getSite().brand.publicName}
				initialLeadId={params.lead ?? null}
			/>
			{page > 1 || hasNextPage ? (
				<nav aria-label="Enquiry pages" className="flex items-center justify-between gap-4">
					{page > 1 ? (
						<Link href={`/admin/leads?page=${page - 1}`} className={adminBtn}>
							Newer enquiries
						</Link>
					) : (
						<span />
					)}
					<span className="text-sm text-muted tabular-nums">Page {page}</span>
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
