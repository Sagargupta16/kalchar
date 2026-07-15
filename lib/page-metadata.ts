import type { Metadata } from "next";
import { getSite } from "./data";

interface PageMetadataInput {
	title: string;
	description: string;
	path: `/${string}` | "/";
}

const publicName = getSite().brand.publicName;
const socialImage = {
	url: "/opengraph-image/",
	width: 1200,
	height: 630,
	alt: `${publicName}, traditional folk art`,
};

/** Build route-specific canonical, Open Graph, and Twitter metadata. */
export function createPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
	const socialTitle = `${title} · ${publicName}`;

	return {
		title,
		description,
		alternates: { canonical: path },
		openGraph: {
			title: socialTitle,
			description,
			url: path,
			type: "website",
			images: [socialImage],
		},
		twitter: {
			card: "summary_large_image",
			title: socialTitle,
			description,
			images: [socialImage.url],
		},
	};
}
