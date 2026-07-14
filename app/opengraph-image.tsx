import { ImageResponse } from "next/og";
import { getSite } from "@/lib/data";
import { siteConfig } from "@/lib/site-config";

export const alt = "Kalchar by Megha, traditional folk art";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse cannot resolve the site's CSS custom properties.
const PAPER = "#faf8f3";
const INK = "#2a221b";
const TERRACOTTA = "#a84f32";
const MARIGOLD = "#dfad55";

export default function OpenGraphImage() {
	const site = getSite();
	const logoUrl = `${siteConfig.url}/logo.jpg`;

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "72px 82px",
				background: PAPER,
				color: INK,
				borderTop: `14px solid ${TERRACOTTA}`,
			}}
		>
			<div style={{ display: "flex", flexDirection: "column", maxWidth: 720 }}>
				<div
					style={{
						fontSize: 22,
						letterSpacing: 5,
						textTransform: "uppercase",
						color: TERRACOTTA,
					}}
				>
					Traditional folk art
				</div>
				<div style={{ display: "flex", marginTop: 26, fontSize: 78, lineHeight: 1.05 }}>
					{site.brand.publicName}
				</div>
				<div style={{ display: "flex", marginTop: 28, fontSize: 30, color: INK }}>
					Original artwork, workshops, and custom pieces rooted in Indian traditions.
				</div>
				<div style={{ display: "flex", marginTop: 40, fontSize: 22, color: TERRACOTTA }}>
					kalchar.co.in
				</div>
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: 300,
					height: 300,
					border: `6px solid ${MARIGOLD}`,
					borderRadius: 24,
					transform: "rotate(3deg)",
					overflow: "hidden",
				}}
			>
				{/* biome-ignore lint/performance/noImgElement: ImageResponse requires a native image. */}
				<img src={logoUrl} alt="" width={300} height={300} style={{ objectFit: "cover" }} />
			</div>
		</div>,
		size,
	);
}
