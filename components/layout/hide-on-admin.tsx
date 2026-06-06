"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders its children on public routes, nothing under /admin.
 *
 * The admin dashboard ships its own header + fixed bottom tab bar, so the
 * global marketing chrome (SiteHeader, SiteFooter) must not also render there
 * -- the footer would stack on top of the admin tab bar and steal its taps.
 * Server components passed as children still render on the server; this client
 * wrapper only decides whether to include them. Mirrors the BackToTop FAB,
 * which self-hides on /admin the same way.
 */
export function HideOnAdmin({ children }: Readonly<{ children: ReactNode }>) {
	const pathname = usePathname();
	if (pathname?.startsWith("/admin")) return null;
	return <>{children}</>;
}
