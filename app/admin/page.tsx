import { Image, Package, ShoppingBag, Star } from "lucide-react";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-auth";
import { getAllArtworks, getCategoryNames } from "@/lib/data";
import { artworkBrowserImageUrl } from "@/lib/image-base";
import { cn } from "@/lib/utils";
import { AdminPage } from "./_components/admin-page";
import { AdminPanel } from "./_components/admin-panel";
import { ArtworkGrid } from "./_components/artwork-grid";
import { isPiecesFilter, type PiecesFilter } from "./_components/artwork-list-state";
import { adminPanel, ICON_SM } from "./_components/controls";
import { UploadForm } from "./_components/upload-form";

/**
 * Server actions inherit this route's budget. Generating one artwork's variant
 * set is 13 sharp encodes (4 of them AVIF) plus 13 R2 uploads, which overruns
 * the platform default on a large master.
 */
export const maxDuration = 60;

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
	const counts: Record<PiecesFilter, number> = {
		all: artworks.length,
		available: artworks.filter((a) => a.status === "available").length,
		sold: artworks.filter((a) => a.status === "sold").length,
		archive: artworks.filter((a) => (a.status ?? "archive") === "archive").length,
		featured: artworks.filter((a) => a.featured).length,
	};

	return (
		<AdminPage
			title="Pieces"
			description="Your catalog at a glance, plus add, reorder, and manage each piece."
		>
			<div className="grid auto-rows-fr grid-cols-2 gap-4 sm:grid-cols-4">
				<StatCard
					icon={Image}
					label="Total pieces"
					value={counts.all}
					show="all"
					active={filter === "all"}
				/>
				<StatCard
					icon={ShoppingBag}
					label="Available"
					value={counts.available}
					show="available"
					active={filter === "available"}
				/>
				<StatCard
					icon={Package}
					label="Sold"
					value={counts.sold}
					show="sold"
					active={filter === "sold"}
				/>
				<StatCard
					icon={Star}
					label="Featured"
					value={counts.featured}
					show="featured"
					active={filter === "featured"}
				/>
			</div>
			{/* Ruling 42: the add form and the list are independent panels, side by side from lg. */}
			<div className="grid gap-(--space-group) lg:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] lg:items-start">
				<AdminPanel
					id="add-piece"
					title="Add a new piece"
					description="Photo first, then the details. Price is optional; a piece without a price is shown but not for sale."
					className="@container/add scroll-mt-[calc(var(--header-h-shrunk)+1rem)] xl:scroll-mt-[calc(var(--header-h-shrunk)+4.5rem)]"
				>
					<UploadForm categories={categoryNames} openByDefault={artworks.length === 0} />
				</AdminPanel>
				<AdminPanel
					id="pieces"
					title="Pieces"
					description="Drag a piece on desktop, or tap its grip and choose Move up or down, to change the order on the site. Tap a piece to edit it."
					className="scroll-mt-[calc(var(--header-h-shrunk)+1rem)] xl:scroll-mt-[calc(var(--header-h-shrunk)+4.5rem)]"
				>
					<ArtworkGrid
						items={artworks.map((art) => ({
							art,
							thumb: artworkBrowserImageUrl(art.image, 400, "webp"),
						}))}
						categories={categoryNames}
						counts={counts}
						initialFilter={filter}
					/>
				</AdminPanel>
			</div>
		</AdminPage>
	);
}

/** A stat tile that also filters the list: the count is the link, `aria-current` marks the active lens. */
function StatCard({
	icon: Icon,
	label,
	value,
	show,
	active,
}: Readonly<{
	icon: typeof Image;
	label: string;
	value: number;
	show: PiecesFilter;
	active: boolean;
}>) {
	return (
		<Link
			href={{ pathname: "/admin", query: show === "all" ? {} : { show }, hash: "pieces" }}
			aria-current={active ? "true" : undefined}
			className={cn(
				adminPanel,
				"block p-4 transition-ui pressable hover:border-accent aria-[current]:border-accent",
			)}
		>
			<span className="flex items-center gap-2 text-label text-muted">
				<Icon size={ICON_SM} aria-hidden="true" />
				{label}
			</span>
			<span className="mt-2 block text-2xl font-semibold tabular-nums text-ink">{value}</span>
			<span className="sr-only">. Show these pieces</span>
		</Link>
	);
}
