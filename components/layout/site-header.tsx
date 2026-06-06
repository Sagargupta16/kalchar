import { getSite } from "@/lib/data";
import { SiteHeaderClient } from "./site-header-client";

export function SiteHeader() {
	const { brand } = getSite();
	return (
		<SiteHeaderClient
			latinPrefix={brand.headline.latinPrefix}
			devanagariCore={brand.headline.devanagariCore}
		/>
	);
}
