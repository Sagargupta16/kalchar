import { getAllArtworks } from "@/lib/data";
import { ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { ArtworkGrid } from "./_components/artwork-grid";
import { UploadForm } from "./_components/upload-form";

export default async function AdminDashboard() {
	const artworks = await getAllArtworks();
	const available = artworks.filter((a) => a.status === "available").length;
	const sold = artworks.filter((a) => a.status === "sold").length;

	return (
		<div className="space-y-10">
			<section>
				<h1 className="t-display text-2xl">Catalog</h1>
				<p className="mt-1 text-sm text-muted">
					{artworks.length} pieces, {available} available, {sold} sold
				</p>
			</section>

			<section className="rounded-(--radius-md) border border-line bg-bg-soft p-5">
				<h2 className="t-display text-lg">Add a new piece</h2>
				<UploadForm />
			</section>

			<section>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="t-eyebrow">All pieces (drag to reorder)</h2>
				</div>
				<ArtworkGrid
					artworks={artworks.map((a) => ({
						slug: a.slug,
						title: a.title,
						style: a.style,
						status: a.status ?? "archive",
						featured: a.featured,
						priceInr: a.priceInr,
						thumb: `${ARTWORK_IMAGE_BASE}/${a.slug}-400.webp`,
					}))}
				/>
			</section>
		</div>
	);
}
