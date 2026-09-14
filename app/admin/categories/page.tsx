import { requireAdminPage } from "@/lib/admin-auth";
import { getAllArtworks, getAllCategories } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { CategoryManager } from "../_components/category-manager";

export default async function AdminCategoriesPage() {
	await requireAdminPage();
	const [cats, artworks] = await Promise.all([getAllCategories(), getAllArtworks()]);

	// Count how many artworks use each category name (delete guard + hint).
	const usage: Record<string, number> = {};
	for (const a of artworks) {
		usage[a.style] = (usage[a.style] ?? 0) + 1;
	}

	return (
		<AdminPage
			title="Categories"
			description="The art styles a piece can belong to; they power the gallery filter, the custom-order style picker and the chips under the home headline. Drag a row, or use its arrows, to reorder."
		>
			<CategoryManager categories={[...cats]} usage={usage} />
		</AdminPage>
	);
}
