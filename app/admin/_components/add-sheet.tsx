"use client";

import { CalendarPlus, GraduationCap, ImagePlus, MessageSquareQuote } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { adminBtn, ICON_MD } from "./controls";
import { Modal, ModalBody } from "./modal";
import { type ArtworkFieldSuggestions, UploadForm } from "./upload-form";

/**
 * Imperative handles for the raised Add (1.3): the tab-bar disc and the
 * desktop nav button call these per route. `addOpen` drives the Plus-to-X
 * rotation on the disc while any add surface is open.
 */
interface AddSheetApi {
	/** Opens the OS photo picker and the add-piece sheet in the same gesture. */
	openPiece: () => void;
	/** Opens the multi-photo picker; picking navigates to /admin/events with the batch. */
	openEvent: () => void;
	/** The four-row choice sheet for routes with no single obvious create. */
	openChoice: () => void;
	addOpen: boolean;
	/** One-shot: the event batch picked through the raised Add, for the events create panel. */
	takeEventFiles: () => FileList | null;
	/** One-shot: the photo picked through the raised Add, for the add-piece form (Tier 1c initialFile). */
	takePieceFile: () => File | null;
}

const AddSheetContext = createContext<AddSheetApi | null>(null);

export function useAddSheet(): AddSheetApi {
	const ctx = useContext(AddSheetContext);
	if (!ctx) throw new Error("useAddSheet must be used within <AddSheetProvider>");
	return ctx;
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

/**
 * Owns the camera-roll-first create flows (Tier 1c): two always-mounted hidden
 * file inputs (mounted before any sheet so the synchronous .click() inside the
 * Add tap is legal on iOS), the add-piece sheet (Modal full detent hosting
 * UploadForm), and the Add choice sheet (content detent, 1.7). Mounted once in
 * app/admin/layout.tsx; the navs consume useAddSheet().
 */
export function AddSheetProvider({
	categories,
	suggestions,
	children,
}: Readonly<AddSheetProviderProps>) {
	const router = useRouter();
	const pathname = usePathname();
	const [pieceOpen, setPieceOpen] = useState(false);
	const [choiceOpen, setChoiceOpen] = useState(false);
	const pieceInputRef = useRef<HTMLInputElement>(null);
	const eventInputRef = useRef<HTMLInputElement>(null);
	const pieceFile = useRef<File | null>(null);
	const eventFiles = useRef<FileList | null>(null);

	const openPiece = useCallback(() => {
		setChoiceOpen(false);
		// Synchronous within the user gesture so iOS Safari and Android Chrome
		// open the picker immediately; cancelling it leaves the sheet open at
		// the dashed picker card, so nothing is lost.
		pieceInputRef.current?.click();
		setPieceOpen(true);
	}, []);

	const openEvent = useCallback(() => {
		setChoiceOpen(false);
		eventInputRef.current?.click();
	}, []);

	const openChoice = useCallback(() => {
		setChoiceOpen(true);
	}, []);

	const takeEventFiles = useCallback(() => {
		const files = eventFiles.current;
		eventFiles.current = null;
		return files;
	}, []);

	const takePieceFile = useCallback(() => {
		const file = pieceFile.current;
		pieceFile.current = null;
		return file;
	}, []);

	const goTo = useCallback(
		(href: string) => {
			setChoiceOpen(false);
			if (pathname !== href) router.push(href);
		},
		[pathname, router],
	);

	const api = useMemo<AddSheetApi>(
		() => ({
			openPiece,
			openEvent,
			openChoice,
			addOpen: pieceOpen || choiceOpen,
			takeEventFiles,
			takePieceFile,
		}),
		[openPiece, openEvent, openChoice, pieceOpen, choiceOpen, takeEventFiles, takePieceFile],
	);

	const onChoice = (key: (typeof CHOICE_ROWS)[number]["key"]) => {
		if (key === "piece") {
			openPiece();
			return;
		}
		if (key === "event") {
			openEvent();
			return;
		}
		goTo(key === "workshop" ? "/admin/workshops" : "/admin/testimonials");
	};

	return (
		<AddSheetContext.Provider value={api}>
			{children}
			{/* The inputs mount before either sheet so a synchronous click is always legal. */}
			<input
				ref={pieceInputRef}
				type="file"
				accept="image/*"
				tabIndex={-1}
				aria-hidden="true"
				className="sr-only"
				onChange={(event) => {
					pieceFile.current = event.target.files?.[0] ?? null;
					event.target.value = "";
				}}
			/>
			<input
				ref={eventInputRef}
				type="file"
				accept="image/*"
				multiple
				tabIndex={-1}
				aria-hidden="true"
				className="sr-only"
				onChange={(event) => {
					if (event.target.files?.length) {
						eventFiles.current = event.target.files;
						goTo("/admin/events");
					}
					event.target.value = "";
				}}
			/>
			{pieceOpen ? (
				<Modal placement="sheet" size="lg" title="New piece" onClose={() => setPieceOpen(false)}>
					<ModalBody>
						<UploadForm categories={categories} suggestions={suggestions} openByDefault />
					</ModalBody>
				</Modal>
			) : null}
			{choiceOpen ? (
				<Modal
					placement="sheet"
					size="md"
					detent="content"
					title="Add"
					onClose={() => setChoiceOpen(false)}
				>
					<ModalBody className="grid gap-2 pb-[calc(var(--spacing-safe-bottom)+var(--space-group))]">
						{CHOICE_ROWS.map((row) => (
							<button
								key={row.key}
								type="button"
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
