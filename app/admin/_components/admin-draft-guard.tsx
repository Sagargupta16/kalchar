"use client";

import { usePathname, useRouter } from "next/navigation";
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
import { useConfirm } from "./confirm-dialog";

interface AdminDraftContext {
	drafts: Set<symbol>;
	navigate: (href: string) => Promise<boolean>;
}

const DraftContext = createContext<AdminDraftContext | null>(null);

/** Programmatic page changes use the same draft decision as navigation links. */
export function useAdminNavigate() {
	const context = useContext(DraftContext);
	if (!context) throw new Error("useAdminNavigate must be used within <AdminDraftProvider>");
	return context.navigate;
}

/** One confirmation for page navigation, even when several forms have drafts. */
export function AdminDraftProvider({ children }: Readonly<{ children: ReactNode }>) {
	const [drafts] = useState(() => new Set<symbol>());
	const confirming = useRef(false);
	const confirm = useConfirm();
	const router = useRouter();
	const pathname = usePathname();

	const navigate = useCallback(
		async (href: string) => {
			const destinationPath = href.split(/[?#]/, 1)[0] ?? href;
			if (destinationPath.replace(/\/$/, "") === pathname.replace(/\/$/, "")) return true;
			if (confirming.current) return false;
			if (drafts.size) {
				confirming.current = true;
				try {
					const leave = await confirm({
						title: "Leave without saving?",
						body: "You have unsaved changes on this page.",
						confirmLabel: "Leave page",
						cancelLabel: "Keep editing",
					});
					if (!leave) return false;
					drafts.clear();
				} finally {
					confirming.current = false;
				}
			}
			router.push(href);
			return true;
		},
		[confirm, drafts, pathname, router],
	);

	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			if (
				!drafts.size ||
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			) {
				return;
			}
			const link =
				event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
			if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self"))
				return;
			const destination = new URL(link.href, window.location.href);
			if (
				destination.origin !== window.location.origin ||
				destination.pathname.replace(/\/$/, "") === window.location.pathname.replace(/\/$/, "")
			) {
				return;
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			const href = `${destination.pathname}${destination.search}${destination.hash}`;
			void navigate(href).then((leave) => {
				if (!leave) link.focus({ preventScroll: true });
			});
		};
		window.addEventListener("click", onClick, true);
		return () => window.removeEventListener("click", onClick, true);
	}, [drafts, navigate]);

	const context = useMemo(() => ({ drafts, navigate }), [drafts, navigate]);
	return <DraftContext.Provider value={context}>{children}</DraftContext.Provider>;
}

/** Protect an unsaved form or order during navigation, reload and tab close. */
export function useAdminDraftGuard(dirty: boolean) {
	const drafts = useContext(DraftContext)?.drafts;
	useBeforeUnloadGuard(dirty);
	useEffect(() => {
		if (!dirty) return;
		const token = Symbol("admin-draft");
		drafts?.add(token);
		return () => {
			drafts?.delete(token);
		};
	}, [dirty, drafts]);
}

/** Persistent composers survive admin navigation but still need a reload warning. */
export function useBeforeUnloadGuard(dirty: boolean) {
	useEffect(() => {
		if (!dirty) return;
		const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
		};
	}, [dirty]);
}
