/**
 * Shown when a non-maintainer Google account completes Google sign-in but
 * fails the maintainer allowlist check in auth.ts (configured as Auth.js's
 * `pages.error`). Explains the situation and offers a way to request access
 * from the root maintainer. No auto-redirect -- a manual "Back to site" link.
 */
import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/auth";
import { AuthShell } from "@/components/layout/auth-shell";
import { GmailIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { getRootMaintainerEmail } from "@/lib/maintainers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
	title: "Access not granted",
	robots: { index: false, follow: false },
};

interface AccessDeniedPageProps {
	searchParams: Promise<{ error?: string }>;
}

export default async function AccessDeniedPage({ searchParams }: Readonly<AccessDeniedPageProps>) {
	const { error } = await searchParams;
	const isConfigurationError = error === "Configuration";
	const rootEmail = await getRootMaintainerEmail().catch(() => null);
	const subject = isConfigurationError ? "Admin sign-in issue" : "Maintainer access request";
	const mailto = rootEmail ? `mailto:${rootEmail}?subject=${encodeURIComponent(subject)}` : null;

	return (
		<AuthShell
			title={isConfigurationError ? "Sign-in unavailable" : "Access not granted"}
			lead={
				isConfigurationError
					? "The site could not verify maintainer access because an authentication service is unavailable. Try again shortly or report the issue to the site owner."
					: "This Google account isn’t on the maintainer list, so it can’t open the admin panel. If you should have access, ask the site owner to add you."
			}
			icon={
				<IconCircle size="lg">
					<Lock size={24} aria-hidden="true" />
				</IconCircle>
			}
		>
			{mailto ? (
				// A real button (44px, global focus, press cue); the address wraps at 390 and stays visible.
				<a
					href={mailto}
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"mt-6 max-w-full whitespace-normal normal-case tracking-normal",
					)}
				>
					<GmailIcon className="size-4 shrink-0" aria-hidden="true" />
					{isConfigurationError ? "Report issue to" : "Request access from"} {rootEmail}
				</a>
			) : null}

			<div className="mt-10 flex flex-wrap items-center justify-center gap-3">
				<Link href="/" className={buttonVariants({ variant: "primary" })}>
					Back to site
				</Link>
				<form
					action={async () => {
						"use server";
						await signOut({ redirectTo: "/login" });
					}}
				>
					<button type="submit" className={buttonVariants({ variant: "ghost" })}>
						{isConfigurationError ? "Try sign-in again" : "Try a different account"}
					</button>
				</form>
			</div>
		</AuthShell>
	);
}
