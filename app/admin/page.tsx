import { requireAdminPage } from "@/lib/admin-auth";
import { getAllArtworks, getCategoryNames } from "@/lib/data";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import { AdminPage } from "./_components/admin-page";
import { ArtworkGrid } from "./_components/artwork-grid";
import {
	type ArtworkListItem,
	countPieces,
	isPiecesFilter,
	type PiecesFilter,
} from "./_components/artwork-list-state";
import { PiecesStats } from "./_components/pieces-stats";
import { getNewEnquiryCount } from "./_new-enquiries";

/**
 * Server actions inherit this route's budget. Generating one artwork's variant
 * set is 13 sharp encodes (4 of them AVIF) plus 13 R2 uploads, which overruns
 * the platform default on a large master.
 */
export const maxDuration = 60;

/**
 * The Pieces dashboard: a compact title, the overview strip (inventory tiles
 * that link into the `?show=` lenses, plus new enquiries), then search, the
 * segmented filter and the thumbnail grid. The add form lives behind the Add
 * button as a sheet (D-A5); the `?show=` URL contract survives through
 * `initialFilter`.
 */
export default async function AdminDashboard({
	searchParams,
}: Readonly<{ searchParams: Promise<{ show?: string }> }>) {
	await requireAdminPage();
	const [{ show }, artworks, categoryNames, newEnquiries] = await Promise.all([
		searchParams,
		getAllArtworks(),
		getCategoryNames(),
		getNewEnquiryCount(),
	]);
	const filter: PiecesFilter = isPiecesFilter(show) ? show : "all";
	const items: ArtworkListItem[] = artworks.map((art) => ({
		art,
		thumb: artworkBrowserImageUrl(art.image, 400, "webp"),
	}));
	const counts = countPieces(items);

	return (
		<AdminPage
			title="Pieces"
			description="Manage your artwork, prices and availability. Open a piece to edit its details."
		>
			<PiecesStats
				total={counts.all}
				available={counts.available}
				sold={counts.sold}
				featured={counts.featured}
				newEnquiries={newEnquiries}
			/>
			{/* Toolbar and tiles sit straight on the canvas: white cards read as the
			    content, no panel-in-panel. No title: the page h1 is already "Pieces". */}
			<section id="pieces" className="scroll-mt-[calc(var(--header-h-shrunk)+1rem)]">
				<ArtworkGrid items={items} categories={categoryNames} initialFilter={filter} />
			</section>
		</AdminPage>
	);
}
