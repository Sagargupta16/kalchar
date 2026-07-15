import { getAllLeads } from "@/lib/data";
import { AdminPageHeader } from "../_components/admin-page-header";
import { LeadsManager } from "../_components/leads-manager";

// Admin queue: always render fresh, never prerender/cache. (Also keeps the
// build from querying the leads table before its migration is applied.)
export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
	const leads = await getAllLeads();

	return (
		<div className="max-w-3xl space-y-6">
			<AdminPageHeader
				title="Leads"
				description="Custom-order enquiries submitted from the site, newest first. The brief is saved before the visitor is handed to WhatsApp, so nothing is lost if their app blocks the popup. Mark each as contacted or closed, and delete once you no longer need it."
			/>
			<LeadsManager leads={[...leads]} />
		</div>
	);
}
