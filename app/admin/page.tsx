/**
 * Admin dashboard. Lists every artwork with inline controls (price,
 * availability, featured, delete) and an upload form for new pieces. Server
 * component fetches the catalog through the same seam the public site uses, so
 * the admin always sees live DB state.
 */
import { getAllArtworks } from "@/lib/data";
import { ARTWORK_IMAGE_BASE } from "@/lib/image-base";
import { ArtworkRow } from "./_components/artwork-row";
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
					{artworks.length} pieces · {available} available · {sold} sold
				</p>
			</section>

			<section className="rounded-md border border-line p-5">
				<h2 className="t-display text-lg">Add a new piece</h2>
				<UploadForm />
			</section>

			<section className="space-y-3">
				{artworks.map((art) => (
					<ArtworkRow
						key={art.slug}
						art={art}
						thumb={`${ARTWORK_IMAGE_BASE}/${art.slug}-400.webp`}
					/>
				))}
			</section>
		</div>
	);
}
