"use client";

import { CalendarPlus, GraduationCap, ImagePlus, MessageSquareQuote } from "lucide-react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { useAdminNavigate, useBeforeUnloadGuard } from "./admin-draft-guard";
import { adminBtn, ICON_MD } from "./controls";
import { Modal, ModalBody, useModalExit } from "./modal";
import { UploadComposer } from "./upload-form";
import { type ArtworkFieldSuggestions, useUploadComposer } from "./use-upload-composer";

/**
 * Imperative handles for the raised Add (1.3): the tab-bar disc and the
 * desktop nav button call these per route. `addOpen` drives the Plus-to-X
 * rotation on the disc while any add surface is open.
 */
interface AddSheetApi {
	/** Opens the photo composer; the chooser stays inside the sheet. */
	openPiece: () => void;
	/** Opens the multi-photo picker; picking navigates to /admin/events with the batch. */
	openEvent: () => void;
	/** The four-row choice sheet for routes with no single obvious create. */
	openChoice: () => void;
	addOpen: boolean;
	/** Reactive notification; the batch stays here until the create form can accept it. */
	eventFiles: readonly File[] | null;
	/** One-shot: the event batch picked through the raised Add, for the events create panel. */
	takeEventFiles: () => File[] | null;
}

const AddSheetContext = createContext<AddSheetApi | null>(null);

export function useAddSheet(): AddSheetApi {
	const ctx = useContext(AddSheetContext);
	if (!ctx) throw new Error("useAddSheet must be used within <AddSheetProvider>");
	return ctx;
}

/** Optional for standalone event managers that only expose their local picker. */
export function useGlobalEventFiles() {
	return useContext(AddSheetContext)?.eventFiles ?? null;
}

function mergeEventFiles(current: readonly File[], incoming: readonly File[]): File[] {
	const files = new Map(
		[...current, ...incoming].map(
			(file) => [`${file.name}-${file.size}-${file.lastModified}`, file] as const,
		),
	);
	return [...files.values()];
}

/** Defer incoming photos during submission so its reset cannot erase a newer selection. */
export function useEventPhotoDraft(pending: boolean) {
	const { eventFiles, takeEventFiles } = useContext(AddSheetContext) ?? {};
	const [files, setFiles] = useState<File[]>([]);
	useEffect(() => {
		if (pending || !eventFiles) return;
		const incoming = takeEventFiles?.();
		if (incoming) setFiles((current) => mergeEventFiles(current, incoming));
	}, [eventFiles, pending, takeEventFiles]);
	return [files, setFiles] as const;
}

interface AddSheetProviderProps {
	categories: readonly string[];
	suggestions?: ArtworkFieldSuggestions;
	children: ReactNode;
}

const CHOICE_ROWS = [
	{ key: "piece", label: "Add piece", icon: ImagePlus },
	{ key: "event", label: "Add event", icon: CalendarPlus },
	{ key: "workshop", label: "Add workshop", icon: GraduationCap },
	{ key: "testimonial", label: "Add testimonial", icon: MessageSquareQuote },
] as const;

/** Keep the in-memory draft and its real upload alive when the sheet is closed. */
function PieceSheet({
	open,
	onClose,
	categories,
	suggestions,
}: Readonly<Omit<AddSheetProviderProps, "children"> & { open: boolean; onClose: () => void }>) {
	const composer = useUploadComposer({ categories, suggestions });
	const { closing, requestClose } = useModalExit(() => {
		if (composer.added) composer.reset();
		onClose();
	});
	if (!open) return null;
	return (
		<Modal
			placement="sheet"
			size="xl"
			title="New piece"
			closing={closing}
			onClose={() => {
				if (!composer.pending) requestClose();
			}}
		>
			<ModalBody className="pb-[max(var(--card-pad),var(--spacing-safe-bottom))]">
				<UploadComposer composer={composer} />
			</ModalBody>
		</Modal>
	);
}

/** Owns the persistent piece composer, the event batch picker, and the Add choices. */
export function AddSheetProvider({
	categories,
	suggestions,
	children,
}: Readonly<AddSheetProviderProps>) {
	const navigate = useAdminNavigate();
	const [pieceOpen, setPieceOpen] = useState(false);
	const [choiceOpen, setChoiceOpen] = useState(false);
	const { closing: choiceClosing, requestClose: closeChoice } = useModalExit(() =>
		setChoiceOpen(false),
	);
	const eventInputRef = useRef<HTMLInputElement>(null);
	const eventFilesRef = useRef<File[] | null>(null);
	const [eventFiles, setEventFiles] = useState<File[] | null>(null);
	const choiceTrigger = useRef<HTMLElement | null>(null);
	useBeforeUnloadGuard(eventFiles !== null);

	const openPiece = useCallback(() => {
		if (choiceOpen) closeChoice();
		setPieceOpen(true);
	}, [choiceOpen, closeChoice]);

	const openEvent = useCallback(() => {
		if (choiceOpen) closeChoice();
		eventInputRef.current?.click();
	}, [choiceOpen, closeChoice]);

	const openChoice = useCallback(() => {
		choiceTrigger.current =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
		setChoiceOpen(true);
	}, []);

	const takeEventFiles = useCallback(() => {
		const files = eventFilesRef.current;
		eventFilesRef.current = null;
		if (files) setEventFiles(null);
		return files;
	}, []);

	const goTo = useCallback(
		async (href: string) => {
			if (choiceOpen) closeChoice();
			const left = await navigate(href);
			if (!left) {
				// The confirmation resolves just before its native dialog unmounts.
				requestAnimationFrame(() => choiceTrigger.current?.focus({ preventScroll: true }));
			}
			return left;
		},
		[navigate, choiceOpen, closeChoice],
	);

	const api = useMemo<AddSheetApi>(
		() => ({
			openPiece,
			openEvent,
			openChoice,
			addOpen: pieceOpen || choiceOpen,
			eventFiles,
			takeEventFiles,
		}),
		[openPiece, openEvent, openChoice, pieceOpen, choiceOpen, eventFiles, takeEventFiles],
	);

	const onChoice = (key: (typeof CHOICE_ROWS)[number]["key"]) => {
		if (choiceClosing) return;
		if (key === "piece") {
			openPiece();
			return;
		}
		if (key === "event") {
			openEvent();
			return;
		}
		void goTo(key === "workshop" ? "/admin/workshops" : "/admin/testimonials");
	};

	return (
		<AddSheetContext.Provider value={api}>
			{children}
			<input
				ref={eventInputRef}
				type="file"
				accept="image/*"
				multiple
				tabIndex={-1}
				aria-hidden="true"
				className="sr-only"
				onChange={(event) => {
					const files = Array.from(event.currentTarget.files ?? []);
					event.currentTarget.value = "";
					if (files.length === 0) return;
					const next = mergeEventFiles(eventFilesRef.current ?? [], files);
					eventFilesRef.current = next;
					setEventFiles(next);
					void goTo("/admin/events");
				}}
			/>
			<PieceSheet
				open={pieceOpen}
				onClose={() => setPieceOpen(false)}
				categories={categories}
				suggestions={suggestions}
			/>
			{choiceOpen ? (
				<Modal
					placement="sheet"
					size="md"
					detent="content"
					title="Add"
					closing={choiceClosing}
					onClose={closeChoice}
				>
					<ModalBody className="grid gap-2 pb-[calc(var(--spacing-safe-bottom)+var(--space-group))]">
						{CHOICE_ROWS.map((row) => (
							<button
								key={row.key}
								type="button"
								disabled={choiceClosing}
								onClick={() => onChoice(row.key)}
								className={cn(adminBtn, "min-h-14 w-full justify-start")}
							>
								<row.icon size={ICON_MD} aria-hidden="true" />
								{row.label}
							</button>
						))}
					</ModalBody>
				</Modal>
			) : null}
		</AddSheetContext.Provider>
	);
}
