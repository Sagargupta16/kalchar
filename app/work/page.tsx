import type { Metadata } from "next";
import { WorkFilter } from "@/components/gallery/work-filter";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllArtworks, getCategoryNames, getSite } from "@/lib/data";

export const metadata: Metadata = {
	title: "Work",
	description:
		"Selected paintings across Madhubani, Pichwai, Lippan, Gond, Texture, and Mixed Media.",
};

export default async function WorkPage() {
	const [all, styles] = await Promise.all([getAllArtworks(), getCategoryNames()]);
	const { sections } = getSite();
	const work = sections.work;

	return (
		<main>
			<Section accent="ruby" background="soft" borderBottom>
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow={work?.eyebrow ?? "Work"}
						title={work?.title ?? "Selected work"}
						lead={work?.lead}
					>
						<Reveal delayMs={200}>
							<p className="t-meta mt-5">
								{all.length} {all.length === 1 ? "piece" : "pieces"}
							</p>
						</Reveal>
					</PageHeader>
				</Container>
			</Section>

			<Section accent="ruby">
				<Container className="py-(--section-py)">
					<WorkFilter
						styles={styles}
						items={all.map((a) => ({
							slug: a.slug,
							title: a.title,
							style: a.style,
							medium: a.medium,
							image: a.image,
							description: a.description,
							featured: a.featured,
							order: a.order,
							aspectRatio: a.aspectRatio,
							priceInr: a.priceInr,
							status: a.status,
							palette: a.palette,
						}))}
					/>
				</Container>
			</Section>
		</main>
	);
}
