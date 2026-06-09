/**
 * Brand glyphs for third-party services.
 *
 * Lucide doesn't ship official brand marks (Instagram, WhatsApp, Gmail,
 * Google). react-icons/si is the Simple Icons set -- the de-facto open-source
 * source for brand glyphs. We re-export the ones we use so consumers import
 * from one place; if we ever swap library, this is the only file that changes.
 *
 * Lucide stays the default for non-brand icons (ArrowRight, Menu, etc.).
 */
export {
	SiGmail as GmailIcon,
	SiGoogle as GoogleIcon,
	SiInstagram as InstagramIcon,
	SiWhatsapp as WhatsAppIcon,
	SiYoutube as YouTubeIcon,
} from "react-icons/si";
