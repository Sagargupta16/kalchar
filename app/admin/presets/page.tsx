import { getAllOrderPresets } from "@/lib/data";
import { PresetManager } from "../_components/preset-manager";

export default async function AdminPresetsPage() {
	const presets = await getAllOrderPresets();

	return (
		<div className="max-w-2xl space-y-6">
			<section>
				<h2 className="text-sm font-semibold">Custom-order presets</h2>
				<p className="mt-1 text-xs text-muted">
					The dropdown options on the custom-order form. Add, rename, reorder, or remove them. Drag
					to reorder within a group.
				</p>
			</section>
			<PresetManager presets={[...presets]} />
		</div>
	);
}
