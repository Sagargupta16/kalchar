/**
 * Handles Auth.js sign-in errors and denied maintainer access. Offers manual
 * account recovery and owner contact without automatically redirecting.
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
	const isSignInError = Boolean(error && error !== "AccessDenied");
	const rootEmail = await getRootMaintainerEmail().catch(() => null);
	const subject = isSignInError ? "Admin sign-in issue" : "Maintainer access request";
	const mailto = rootEmail ? `mailto:${rootEmail}?subject=${encodeURIComponent(subject)}` : null;

	return (
		<AuthShell
			eyebrow="Admin access"
			title={isSignInError ? "Sign-in unavailable" : "Access not granted"}
			lead={
				isSignInError
					? "We couldn't complete sign-in. Try again shortly, or let the site owner know."
					: "We couldn't grant admin access. Try a Google account on the maintainer list, or ask the site owner to check your access."
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
						"mt-6 w-full whitespace-normal break-words normal-case tracking-normal",
					)}
				>
					<GmailIcon className="size-4 shrink-0" aria-hidden="true" />
					<span className="min-w-0">
						{isSignInError ? "Report sign-in issue" : "Request access"}
						<span className="mt-1 block break-all text-xs text-muted">{rootEmail}</span>
					</span>
				</a>
			) : (
				<Link
					href="/contact"
					className={cn(buttonVariants({ variant: "ghost" }), "mt-6 w-full whitespace-normal")}
				>
					{isSignInError ? "Contact us about sign-in" : "Contact us about access"}
				</Link>
			)}

			<div className="mt-6 flex flex-col gap-3">
				<form
					action={async () => {
						"use server";
						await signOut({ redirectTo: "/login" });
					}}
				>
					<button
						type="submit"
						className={cn(buttonVariants({ variant: "primary" }), "w-full whitespace-normal")}
					>
						{isSignInError ? "Try sign-in again" : "Try a different account"}
					</button>
				</form>
				<Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "w-full")}>
					Back to site
				</Link>
			</div>
			<p className="mt-4 text-sm text-muted">
				You can still browse artwork and contact us without signing in.
			</p>
		</AuthShell>
	);
}
