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
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
	await requireAdminPage();
	const requestedPage = Number((await searchParams).page ?? 1);
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const { leads, hasNextPage } = await getLeadsPage(page);

	return (
		<AdminPage
			title="Enquiries"
			description="Enquiries from the custom-order form, newest first. Reply from the card, mark each one Contacted or Closed, and delete it when the details are no longer needed."
		>
			<LeadsManager leads={[...leads]} siteName={getSite().brand.publicName} />
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
