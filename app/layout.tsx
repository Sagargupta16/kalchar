import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { PaperGrain } from "@/components/decor/paper-grain";
import { ScrollProgress } from "@/components/decor/scroll-progress";
import { ArtworkLightbox } from "@/components/gallery/artwork-lightbox";
import { LightboxProvider } from "@/components/gallery/lightbox-context";
import { BackToTop } from "@/components/layout/back-to-top";
import { HideOnAdmin } from "@/components/layout/hide-on-admin";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { getSite } from "@/lib/data";
import { siteConfig } from "@/lib/site-config";
import { extractPhoneFromWaUrl } from "@/lib/whatsapp";
import { fontBody, fontDevanagari, fontDisplay } from "./fonts";
import "./globals.css";

const site = getSite();
const whatsappPhone = extractPhoneFromWaUrl(site.contact.whatsapp.url);

const imageOrigin = (() => {
	const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? process.env.R2_PUBLIC_BASE_URL ?? "";
	try {
		return base ? new URL(base).origin : "";
	} catch {
		return "";
	}
})();

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
	},
	twitter: {
		card: "summary_large_image",
		title: site.brand.title,
		description: site.brand.description,
	},
	icons: {
		icon: "/logo.jpg",
		apple: "/logo-180.png",
	},
};

// Browser-chrome theme colors. These mirror --color-bg (light) and the dark
// ground; keep them in sync with globals.css. They live as literals because
// viewport metadata is emitted before any stylesheet loads, so CSS custom
// properties can't resolve here.
const THEME_COLOR_LIGHT = "#faf8f3";
const THEME_COLOR_DARK = "#1a1510";

export const viewport: Viewport = {
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: THEME_COLOR_LIGHT },
		{ media: "(prefers-color-scheme: dark)", color: THEME_COLOR_DARK },
	],
	viewportFit: "cover",
};

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
				{imageOrigin ? <link rel="preconnect" href={imageOrigin} crossOrigin="anonymous" /> : null}
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				{/* Pre-paint theme: runs before any module loads (can't import), so the
				    "theme" key is inlined here -- keep it in sync with STORAGE_KEY in
				    theme-toggle.tsx. */}
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint theme
					dangerouslySetInnerHTML={{
						__html: `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(_){}})();`,
					}}
				/>
				<noscript>
					<style>{`[style*="opacity:0"],[style*="opacity: 0"]{opacity:1!important;transform:none!important;}`}</style>
				</noscript>
			</head>
			<body className="font-sans">
				<a
					href="#main"
					className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-(--radius-sm) focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:text-bg"
				>
					Skip to content
				</a>
				<PaperGrain />
				<MotionProvider>
					<LightboxProvider whatsappPhone={whatsappPhone}>
						<SmoothScroll />
						<ScrollProgress />
						<SiteHeader />
						<div id="main" className="relative z-10">
							{children}
						</div>
						<HideOnAdmin>
							<SiteFooter />
						</HideOnAdmin>
						<BackToTop />
						<ArtworkLightbox />
					</LightboxProvider>
				</MotionProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
