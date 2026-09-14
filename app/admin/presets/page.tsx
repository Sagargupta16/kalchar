import { requireAdminPage } from "@/lib/admin-auth";
import { getAllOrderPresets } from "@/lib/data";
import { AdminPage } from "../_components/admin-page";
import { PresetManager } from "../_components/preset-manager";

export default async function AdminPresetsPage() {
	await requireAdminPage();
	const presets = await getAllOrderPresets();

	return (
		<AdminPage
			title="Custom-order presets"
			description="The dropdown options on the custom-order form. Add, rename, reorder or delete them; drag a row, or use its arrows, to reorder within a group."
		>
			<PresetManager presets={[...presets]} />
		</AdminPage>
	);
}
