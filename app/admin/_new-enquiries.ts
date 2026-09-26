import { cache } from "react";
import { getLeadsPage } from "@/lib/data";

/**
 * New enquiries among the newest page (at most LEADS_PAGE_SIZE rows): one
 * bounded, authorized read through the data seam, shared per request by the
 * nav badge (layout) and the Pieces stats strip.
 */
export const getNewEnquiryCount = cache(async (): Promise<number> => {
	const { leads } = await getLeadsPage(1);
	return leads.filter((lead) => lead.status === "new").length;
});
