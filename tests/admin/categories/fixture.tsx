import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CategoryManager } from "../../../app/admin/_components/category-manager";
import { ConfirmProvider } from "../../../app/admin/_components/confirm-dialog";
import type { Category } from "../../../lib/types";
import { actionState, navigate } from "../mock-actions";

const initial = ["Alpha", "Bravo", "Charlie"].map((name, order) => ({
	id: name,
	name,
	order,
}));

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		mountCategories: (categories?: Category[], usage?: Record<string, number>) => void;
	}
}

window.adminTest = Object.assign(actionState, { navigate });
const root = createRoot(document.getElementById("fixture")!);
window.mountCategories = (categories = initial, usage = {}) => {
	root.render(
		<StrictMode>
			<ConfirmProvider>
				<CategoryManager categories={categories} usage={usage} />
			</ConfirmProvider>
		</StrictMode>,
	);
};
