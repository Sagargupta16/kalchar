import { getSite } from "@/lib/data";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";
import { SiteHeaderClient } from "./site-header-client";

/** Visitor's opening line for the drawer's WhatsApp row; the artist's number stays single-sourced in site.json. */
const DRAWER_WHATSAPP_MESSAGE =
	"Hi Megha, I found your work on kalchar.co.in and would like to get in touch.";

export function SiteHeader() {
	const { brand, contact } = getSite();
	const whatsappHref = buildWhatsAppLink({
		phoneE164NoPlus: extractPhoneFromWaUrl(contact.whatsapp.url),
		message: DRAWER_WHATSAPP_MESSAGE,
	});
	return (
		<SiteHeaderClient
			latinPrefix={brand.headline.latinPrefix}
			devanagariCore={brand.headline.devanagariCore}
			whatsappHref={whatsappHref}
		/>
	);
}
