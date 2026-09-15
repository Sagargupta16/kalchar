import { useSyncExternalStore } from "react";

type Outcome = "success" | "failure" | "throw" | "pending";

export const actionState = {
	outcome: "failure" as Outcome,
	calls: [] as Array<{ name: string; args: unknown[] }>,
	refreshes: 0,
	formSubmissions: [] as Array<Record<string, FormDataEntryValue>>,
	stageOutcome: "success" as "success" | "failure" | "pending",
	stageCalls: [] as string[],
	stageRequests: [] as Array<{
		complete: (key: string) => void;
		fail: () => void;
		progress: (fraction: number) => void;
	}>,
	release: undefined as (() => void) | undefined,
	pathname: "/admin",
	/** UndoBar hold used by the bars fixture (the real default is 6000). */
	undoDuration: 300,
};

const listeners = new Set<() => void>();

/** Stands in for a route change: updates the mocked pathname and re-renders every usePathname reader. */
export function navigate(path: string) {
	actionState.pathname = path;
	for (const notify of listeners) notify();
}

export function usePathname() {
	return useSyncExternalStore(
		(notify) => {
			listeners.add(notify);
			return () => listeners.delete(notify);
		},
		() => actionState.pathname,
		() => actionState.pathname,
	);
}

/** Read through a call so TypeScript does not keep the pre-await narrowing of `outcome`. */
function currentOutcome(): Outcome {
	return actionState.outcome;
}

function action(name: string) {
	return async (...args: unknown[]) => {
		actionState.calls.push({ name, args });
		if (args[0] instanceof FormData) {
			actionState.formSubmissions.push(Object.fromEntries(args[0].entries()));
		}
		if (actionState.outcome === "throw") throw new Error("Connection interrupted.");
		if (actionState.outcome === "failure") {
			return { ok: false as const, message: "Change was rejected." };
		}
		if (actionState.outcome === "pending") {
			await new Promise<void>((resolve) => {
				actionState.release = resolve;
			});
			// A spec may flip the outcome while the call is held; honour it on release.
			const released = currentOutcome();
			if (released === "throw") throw new Error("Connection interrupted.");
			if (released === "failure") {
				return { ok: false as const, message: "Change was rejected." };
			}
		}
		// Return the identifiers the real actions do: artwork slug, event id, photo key-base.
		return {
			ok: true as const,
			slug: "created-piece",
			id: "created-event",
			keyBase: "events/created-event/photo-fixture",
		};
	};
}

const router = {
	refresh() {
		actionState.refreshes += 1;
	},
	push: navigate,
};

export function useRouter() {
	return router;
}

export const deleteArtwork = action("deleteArtwork");
export const reorderArtworks = action("reorderArtworks");
export const updateArtwork = action("updateArtwork");
export const createArtwork = action("createArtwork");
export const regeneratePalette = action("regeneratePalette");
export const replaceArtworkImage = action("replaceArtworkImage");
export const setArtworkFeatured = action("setArtworkFeatured");
export const setArtworkStatus = action("setArtworkStatus");
export const createCategory = action("createCategory");
export const deleteCategory = action("deleteCategory");
export const renameCategory = action("renameCategory");
export const reorderCategories = action("reorderCategories");
export const createWorkshop = action("createWorkshop");
export const deleteWorkshop = action("deleteWorkshop");
export const updateWorkshop = action("updateWorkshop");
export const reorderWorkshops = action("reorderWorkshops");
export const createOrderPreset = action("createOrderPreset");
export const deleteOrderPreset = action("deleteOrderPreset");
export const updateOrderPreset = action("updateOrderPreset");
export const reorderOrderPresets = action("reorderOrderPresets");
export const createEvent = action("createEvent");
export const deleteEvent = action("deleteEvent");
export const setEventFeatured = action("setEventFeatured");
export const updateEventMeta = action("updateEventMeta");
export const reserveEventId = action("reserveEventId");
export const processEventPhoto = action("processEventPhoto");
export const attachEventPhotos = action("attachEventPhotos");
export const removeEventImage = action("removeEventImage");
export const reorderEventImages = action("reorderEventImages");
export const setProfileImage = action("setProfileImage");
export const clearProfileImage = action("clearProfileImage");
export const setShowHomeIntro = action("setShowHomeIntro");
export const deleteLead = action("deleteLead");
export const setLeadStatus = action("setLeadStatus");
export const createTestimonial = action("createTestimonial");
export const deleteTestimonial = action("deleteTestimonial");
export const setTestimonialFeatured = action("setTestimonialFeatured");
export const updateTestimonial = action("updateTestimonial");
export const inviteMaintainer = action("inviteMaintainer");
export const revokeMaintainer = action("revokeMaintainer");

export async function stageImage(file: File, onProgress?: (fraction: number) => void) {
	actionState.stageCalls.push(file.name);
	if (actionState.stageOutcome === "failure") throw new Error("Photo upload interrupted.");
	if (actionState.stageOutcome === "pending") {
		return new Promise<string>((resolve, reject) => {
			actionState.stageRequests.push({
				complete: resolve,
				fail: () => reject(new Error("Photo upload interrupted.")),
				progress: (fraction) => onProgress?.(fraction),
			});
		});
	}
	onProgress?.(1);
	return "staging/fixture";
}

export async function stageFormImages(formData: FormData): Promise<number> {
	// Model the upload contract without requesting tickets or contacting storage.
	const files = formData
		.getAll("images")
		.filter((value): value is File => value instanceof File && value.size > 0);
	formData.delete("images");
	files.forEach((_, index) => {
		formData.append("imageKeys", `staging/fixture-${index}`);
	});
	return files.length;
}
