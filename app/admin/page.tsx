import { requireAdminPage } from "@/lib/admin-auth";
import { getAllArtworks, getCategoryNames } from "@/lib/data";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import { AdminPage } from "./_components/admin-page";
import { AdminPanel } from "./_components/admin-panel";
import { ArtworkGrid } from "./_components/artwork-grid";
import { isPiecesFilter, type PiecesFilter } from "./_components/artwork-list-state";

/**
 * Server actions inherit this route's budget. Generating one artwork's variant
 * set is 13 sharp encodes (4 of them AVIF) plus 13 R2 uploads, which overruns
 * the platform default on a large master.
 */
export const maxDuration = 60;

/**
 * The paintings ARE the dashboard (Tier 1a): header, search, count chips (the
 * stats, now tappable filters), then the thumbnail grid. The 2x2 stat tiles
 * are gone (their numbers live in the chips) and the add form left the page
 * (it lives behind the raised Add as a sheet, D-A5). The `?show=` URL contract
 * survives through `initialFilter`.
 */
export default async function AdminDashboard({
	searchParams,
}: Readonly<{ searchParams: Promise<{ show?: string }> }>) {
	await requireAdminPage();
	const [{ show }, artworks, categoryNames] = await Promise.all([
		searchParams,
		getAllArtworks(),
		getCategoryNames(),
	]);
	const filter: PiecesFilter = isPiecesFilter(show) ? show : "all";

	return (
		<AdminPage
			title="Pieces"
			description="Manage your artwork, prices and availability. Open a piece to edit its details."
		>
			{/* No panel title: the page h1 is already "Pieces" (one-name rule). */}
			<AdminPanel
				id="pieces"
				className="scroll-mt-[calc(var(--header-h-shrunk)+1rem)] xl:scroll-mt-[calc(var(--header-h-shrunk)+4.5rem)]"
			>
				<ArtworkGrid
					items={artworks.map((art) => ({
						art,
						thumb: artworkBrowserImageUrl(art.image, 400, "webp"),
					}))}
					categories={categoryNames}
					initialFilter={filter}
				/>
			</AdminPanel>
		</AdminPage>
	);
}
