import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AdminNavMobile, type NavCounts } from "../../app/admin/_components/admin-nav";
import { ArtworkGrid } from "../../app/admin/_components/artwork-grid";
import { CategoryManager } from "../../app/admin/_components/category-manager";
import {
	ConfirmPanel,
	ConfirmProvider,
	useConfirm,
} from "../../app/admin/_components/confirm-dialog";
import { EventImageManager } from "../../app/admin/_components/event-image-manager";
import { EventsManager } from "../../app/admin/_components/events-manager";
import { LeadsManager } from "../../app/admin/_components/leads-manager";
import { Modal, ModalBody, ModalFooter } from "../../app/admin/_components/modal";
import { PresetManager } from "../../app/admin/_components/preset-manager";
import { ProfileManager } from "../../app/admin/_components/profile-manager";
import { InlineReorderControls, ReorderBar } from "../../app/admin/_components/reorder-bar";
import { TestimonialsManager } from "../../app/admin/_components/testimonials-manager";
import { UndoBar, useUndo } from "../../app/admin/_components/undo-bar";
import { UploadForm } from "../../app/admin/_components/upload-form";
import {
	useAdminAction,
	useOptimisticAction,
} from "../../app/admin/_components/use-admin-action";
import { WorkshopManager } from "../../app/admin/_components/workshop-manager";
import type { Artwork, Event } from "../../lib/types";
import {
	actionState,
	deleteArtwork,
	navigate,
	setArtworkFeatured,
	setArtworkStatus,
} from "./mock-actions";

const names = ["Alpha", "Bravo", "Charlie"];
const thumbnail =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'/%3E";
/** Alpha: not for sale, unpriced; Bravo: available, priced, featured; Charlie: sold, priced. */
const artworkStates: Array<Pick<Artwork, "status" | "featured" | "priceInr">> = [
	{ status: "archive", featured: false },
	{ status: "available", featured: true, priceInr: 12000 },
	{ status: "sold", featured: false, priceInr: 8000 },
];
const artworks: Artwork[] = names.map((title, order) => ({
	title,
	slug: title.toLowerCase(),
	style: "Gond",
	medium: "Ink",
	aspectRatio: 1,
	order,
	image: `${title}.jpg`,
	...artworkStates[order]!,
}));
const artworkItems = artworks.map((art) => ({ art, thumb: thumbnail }));
const artworkCounts = { all: 3, available: 1, sold: 1, archive: 1, featured: 1 };
const noPieces = { all: 0, available: 0, sold: 0, archive: 0, featured: 0 };
const suggestions = {
	mediums: ["Ink", "Natural pigment on handmade paper"],
	dimensions: ["30 x 40 cm"],
	lastUsed: { style: "Gond", medium: "Ink" },
};
const event: Event = {
	id: "event-1",
	title: "Gathering",
	eventDate: "2026-09-01",
	images: ["events/one", "events/two", "events/three"],
	featured: false,
	order: 0,
};
/** 40 characters, no photos: exercises the title ellipsis and the empty-thumbnail slot. */
const secondEvent: Event = {
	id: "event-2",
	title: "Monsoon exhibition at the community hall",
	eventDate: "2026-07-14",
	images: [],
	featured: false,
	order: 1,
};
const artworkTitles = [{ slug: "alpha", title: "Alpha", image: "alpha.jpg" }];
const mira = {
	id: "testimonial-1",
	quote: "Beautiful work.",
	authorName: "Mira",
	featured: false,
	order: 0,
};

function DialogFixture() {
	const confirm = useConfirm();
	const { run } = useAdminAction();
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("Unsaved draft");
	const [result, setResult] = useState<boolean | null>(null);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open editor
			</button>
			<button type="button">Background control</button>
			<button
				type="button"
				onClick={async () => {
					setResult(
						await confirm({
							title: "Delete draft?",
							body: "This can't be undone.",
							confirmLabel: "Delete draft",
							action: () => run(() => deleteArtwork("alpha")),
						}),
					);
				}}
			>
				Delete with action
			</button>
			{result === null ? null : <output>confirmed: {String(result)}</output>}
			{open ? (
				<Modal title="Draft editor" onClose={() => setOpen(false)}>
					<button type="button" disabled>
						Disabled control
					</button>
					<label>
						Draft <input value={text} onChange={(e) => setText(e.target.value)} />
					</label>
					<button
						type="button"
						onClick={() => confirm({ title: "Delete draft?", confirmLabel: "Delete" })}
					>
						Delete draft
					</button>
				</Modal>
			) : null}
		</>
	);
}

/** The phone sheet of D14 with its inline confirm step (no second dialog). */
function SheetFixture() {
	const { pending, err, run } = useAdminAction();
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState<"edit" | "confirmDelete">("edit");
	const [draft, setDraft] = useState("");
	const dirty = draft.length > 0;
	const close = () => {
		setOpen(false);
		setStep("edit");
	};
	const requestClose = () => {
		if (step === "confirmDelete") setStep("edit");
		else close();
	};
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open sheet
			</button>
			{open ? (
				<Modal
					placement="sheet"
					size="lg"
					title="Edit piece"
					heading={<span>Alpha</span>}
					action={step === "edit" && dirty ? <button type="button">Save changes</button> : null}
					onClose={requestClose}
				>
					{step === "edit" ? (
						<>
							<ModalBody>
								<label>
									Draft <input value={draft} onChange={(e) => setDraft(e.target.value)} />
								</label>
								<button type="button" onClick={() => setStep("confirmDelete")}>
									Delete draft
								</button>
							</ModalBody>
							<ModalFooter>{dirty ? <p>Unsaved changes</p> : <p>No changes yet</p>}</ModalFooter>
						</>
					) : (
						<ModalBody>
							<ConfirmPanel
								headingLevel={3}
								title='Delete "Alpha"?'
								body="The piece leaves the gallery."
								confirmLabel="Delete piece"
								cancelLabel="Keep piece"
								pending={pending}
								error={err}
								onConfirm={async () => {
									if (await run(() => deleteArtwork("alpha"))) close();
								}}
								onCancel={() => setStep("edit")}
							/>
						</ModalBody>
					)}
				</Modal>
			) : null}
		</>
	);
}

function NavFixture({ counts }: Readonly<{ counts?: NavCounts }>) {
	const [taps, setTaps] = useState(0);
	return (
		<>
			<button type="button" onClick={() => setTaps((n) => n + 1)}>
				Page control
			</button>
			<output>{taps}</output>
			<AdminNavMobile email="megha@example.invalid" counts={counts} />
		</>
	);
}

function useBarState() {
	const [shown, setShown] = useState(false);
	const [pending, setPending] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);
	return {
		shown,
		pending,
		saved,
		error,
		show: () => setShown(true),
		hide: () => setShown(false),
		fail: () => setError("Change was rejected."),
		wait: () => setPending(true),
		save: () => {
			setError(null);
			setPending(false);
			setSaved(true);
		},
	};
}

function BarsFixture() {
	const { err, run } = useAdminAction();
	const bar = useBarState();
	const inline = useBarState();
	const { undo, undoPending, undoError, offerUndo, dismissUndo, undoNow } = useUndo(run);
	return (
		<>
			<button type="button" onClick={bar.show}>
				Show bar
			</button>
			<button type="button" onClick={bar.fail}>
				Set error
			</button>
			<button type="button" onClick={bar.wait}>
				Set pending
			</button>
			<button type="button" onClick={bar.save}>
				Set saved
			</button>
			<button type="button" onClick={inline.show}>
				Show inline
			</button>
			<button type="button" onClick={inline.fail}>
				Set inline error
			</button>
			<button type="button" onClick={inline.wait}>
				Set inline pending
			</button>
			<button type="button" onClick={inline.save}>
				Set inline saved
			</button>
			<button
				type="button"
				onClick={() =>
					offerUndo({
						message: '"Alpha" marked as sold',
						// The raw mock action: wrapping it in run() here would trip the inFlight guard.
						action: () => setArtworkStatus("alpha", "available"),
					})
				}
			>
				Mark Alpha sold
			</button>
			{inline.shown ? (
				<InlineReorderControls
					pending={inline.pending}
					saved={inline.saved}
					error={inline.error}
					onSave={() => {}}
					onReset={inline.hide}
				/>
			) : null}
			{bar.shown ? (
				<ReorderBar
					label="Gallery order changed"
					pending={bar.pending}
					saved={bar.saved}
					error={bar.error}
					onSave={() => {}}
					onReset={bar.hide}
				/>
			) : undo ? (
				<UndoBar
					message={undo.message}
					pending={undoPending}
					error={undoError ? (err ?? undoError) : null}
					onAction={undoNow}
					onDismiss={dismissUndo}
					duration={actionState.undoDuration}
				/>
			) : null}
		</>
	);
}

function OptimisticFixture() {
	const featured = useOptimisticAction(false);
	return (
		<>
			<button
				type="button"
				aria-pressed={featured.value}
				onClick={() =>
					featured.run(!featured.value, () => setArtworkFeatured("alpha", !featured.value))
				}
			>
				Feature Alpha
			</button>
			{featured.err ? <p role="alert">{featured.err}</p> : null}
		</>
	);
}

const views = {
	artworks: <ArtworkGrid items={artworkItems} categories={["Gond"]} counts={artworkCounts} />,
	artworksEmpty: <ArtworkGrid items={[]} categories={["Gond"]} counts={noPieces} />,
	artworksFiltered: (
		<ArtworkGrid
			items={artworkItems}
			categories={["Gond"]}
			counts={artworkCounts}
			initialFilter="sold"
		/>
	),
	categories: (
		<CategoryManager
			categories={names.map((name, order) => ({ id: name, name, order }))}
			usage={{}}
		/>
	),
	workshops: (
		<WorkshopManager
			workshops={names.map((title, order) => ({
				slug: title.toLowerCase(),
				title,
				blurb: "Paint together.",
				order,
			}))}
		/>
	),
	workshopsEmpty: <WorkshopManager workshops={[]} />,
	presets: (
		<PresetManager
			presets={names.map((label, order) => ({ id: label, label, kind: "size", order }))}
		/>
	),
	events: <EventsManager events={[event, secondEvent]} />,
	eventsEmpty: <EventsManager events={[]} />,
	eventImages: <EventImageManager event={event} />,
	profile: <ProfileManager showHomeIntro={false} imageKey="profile/artist" />,
	leads: (
		<LeadsManager
			leads={[
				{
					id: "lead-1",
					name: "Mira",
					contact: "mira@example.invalid",
					brief: "A forest scene.",
					status: "new",
					createdAt: "2026-09-01",
				},
			]}
		/>
	),
	testimonials: <TestimonialsManager testimonials={[mira]} artworks={artworkTitles} />,
	testimonialsEmpty: <TestimonialsManager testimonials={[]} artworks={artworkTitles} />,
	testimonialsLinked: (
		<TestimonialsManager
			testimonials={[{ ...mira, artworkSlug: "alpha" }]}
			artworks={artworkTitles}
		/>
	),
	upload: <UploadForm categories={["Gond", "Pichwai"]} suggestions={suggestions} />,
	uploadEmpty: (
		<UploadForm
			categories={[]}
			suggestions={{ mediums: [], dimensions: [], lastUsed: null }}
			openByDefault
		/>
	),
	dialogs: (
		<>
			<DialogFixture />
			<SheetFixture />
		</>
	),
	nav: <NavFixture />,
	navBadged: <NavFixture counts={{ "/admin/leads": 3 }} />,
	bars: <BarsFixture />,
	optimistic: <OptimisticFixture />,
};

declare global {
	interface Window {
		adminTest: typeof actionState & { navigate: typeof navigate };
		mountAdmin: (view: keyof typeof views) => void;
	}
}

window.adminTest = Object.assign(actionState, { navigate });
const root = createRoot(document.getElementById("fixture")!);
window.mountAdmin = (view) => {
	root.render(
		<StrictMode>
			<ConfirmProvider>{views[view]}</ConfirmProvider>
		</StrictMode>,
	);
};
