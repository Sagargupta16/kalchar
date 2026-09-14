import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { PaperGrain } from "@/components/decor/paper-grain";
import { ScrollProgress } from "@/components/decor/scroll-progress";
import { ArtworkLightbox } from "@/components/gallery/artwork-lightbox";
import { LightboxProvider } from "@/components/gallery/lightbox-context";
import { BackToTop } from "@/components/layout/back-to-top";
import { EnquireFab } from "@/components/layout/enquire-fab";
import { HideOnAdmin } from "@/components/layout/hide-on-admin";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { getSite } from "@/lib/data";
import { SERVER_BRAND_COLORS } from "@/lib/server-brand-colors";
import { siteConfig } from "@/lib/site-config";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";
import { fontBody, fontDevanagari, fontDisplay } from "./fonts";
import "./globals.css";

const site = getSite();
const whatsappPhone = extractPhoneFromWaUrl(site.contact.whatsapp.url);
/** FAB greeting; verbatim pair of WHATSAPP_GREETING in app/page.tsx (visual-direction 2.16). */
const FAB_WHATSAPP_MESSAGE = "Hi, I found you on kalchar.co.in.";
const fabWhatsappHref = buildWhatsAppLink({
	phoneE164NoPlus: whatsappPhone,
	message: FAB_WHATSAPP_MESSAGE,
});

export const metadata: Metadata = {
	metadataBase: new URL(siteConfig.url),
	title: {
		default: site.brand.title,
		template: `%s · ${site.brand.publicName}`,
	},
	description: site.brand.description,
	openGraph: {
		title: site.brand.title,
		description: site.brand.description,
		url: siteConfig.prodUrl,
		siteName: site.brand.publicName,
		locale: "en_IN",
		type: "website",
		images: [
			{
				url: "/opengraph-image/",
				width: 1200,
				height: 630,
				alt: `${site.brand.publicName}, traditional folk art`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: site.brand.title,
		description: site.brand.description,
		images: ["/opengraph-image/"],
	},
	icons: {
		icon: "/logo.jpg",
		apple: "/logo-180.png",
	},
};

export const viewport: Viewport = {
	themeColor: SERVER_BRAND_COLORS.paper,
	viewportFit: "cover",
};

/**
 * Pre-paint theme: runs before any module loads (can't import), so the "theme"
 * key is inlined here; keep it in sync with STORAGE_KEY in theme-toggle.tsx.
 * The dark theme-color is interpolated at build time from
 * SERVER_BRAND_COLORS.night so the address bar follows the class, not the OS.
 */
const PRE_PAINT_THEME = `(function(){try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','${SERVER_BRAND_COLORS.night}');}}catch(_){}})();`;

const jsonLd = {
	"@context": "https://schema.org",
	"@type": "Person",
	name: site.brand.publicName,
	url: siteConfig.prodUrl,
	jobTitle: "Folk Artist & Workshop Facilitator",
	description: site.brand.description,
	image: `${siteConfig.url}/logo.jpg`,
	sameAs: [site.contact.instagram.url, site.contact.youtube?.url].filter(Boolean),
	knowsAbout: ["Madhubani painting", "Pichwai painting", "Lippan art", "Gond art"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	const fontVars = `${fontBody.variable} ${fontDisplay.variable} ${fontDevanagari.variable}`;

	return (
		<html lang="en" suppressHydrationWarning className={fontVars}>
			<head>
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint theme
					dangerouslySetInnerHTML={{ __html: PRE_PAINT_THEME }}
				/>
				<noscript>
					<style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important;}`}</style>
				</noscript>
			</head>
			<body>
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-overlay focus:rounded-(--radius-sm) focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-bg"
				>
					Skip to content
				</a>
				<PaperGrain />
				<MotionProvider>
					<LightboxProvider whatsappPhone={whatsappPhone}>
						<HideOnAdmin>
							<SmoothScroll />
							<ScrollProgress />
							<SiteHeader />
						</HideOnAdmin>
						<div id="main" className="relative z-raised">
							{children}
						</div>
						<HideOnAdmin>
							<SiteFooter />
						</HideOnAdmin>
						<BackToTop />
						<EnquireFab whatsappHref={fabWhatsappHref} />
						<ArtworkLightbox />
					</LightboxProvider>
				</MotionProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
