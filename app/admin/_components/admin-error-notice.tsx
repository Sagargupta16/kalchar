"use client";

import { LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { SIGNED_OUT_MESSAGE, signInAgainHref } from "@/lib/admin-session";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { adminBtn, ICON_MD } from "./controls";

/**
 * Drop-in for `<AdminNotice variant="error">{err}</AdminNotice>` under an admin
 * action: when the hook reports a lost session it adds a "Sign in again" link
 * that returns to this page (query included) after sign-in. Every other
 * message renders exactly as AdminNotice would.
 */
export function AdminErrorNotice({
	children,
	className,
	id,
}: Readonly<{ children: string; className?: string; id?: string }>) {
	const pathname = usePathname();
	if (children !== SIGNED_OUT_MESSAGE) {
		return (
			<AdminNotice id={id} variant="error" className={className}>
				{children}
			</AdminNotice>
		);
	}
	// The message only exists after a client-side action failed, so window is always there.
	const search = typeof window === "undefined" ? "" : window.location.search;
	return (
		<AdminNotice id={id} variant="error" className={className}>
			<span className="block">{children}</span>
			<a
				href={signInAgainHref(`${pathname}${search}`)}
				className={cn(adminBtn, "mt-2 w-full sm:w-auto")}
			>
				<LogIn size={ICON_MD} aria-hidden="true" />
				Sign in again
			</a>
		</AdminNotice>
	);
}
