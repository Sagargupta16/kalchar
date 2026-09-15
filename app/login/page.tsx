/**
 * Maintainer sign-in page.
 *
 * Lives OUTSIDE the /admin matcher (proxy.ts gates /admin/:path*), so it is
 * reachable while logged out without an infinite redirect loop. The proxy and
 * the admin layout both send unauthenticated visitors here.
 *
 * Google is the only provider. The button is a server-action form calling
 * Auth.js `signIn`, so it works with no client JS. The signIn callback in
 * auth.ts still decides WHO may complete login (the maintainers allowlist); a
 * non-maintainer Google account is bounced back here with `?error`.
 */
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthShell } from "@/components/layout/auth-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { safeAdminCallback } from "@/lib/admin-callback";
import { SignInButton } from "./sign-in-button";

export const metadata: Metadata = {
	title: "Maintainer sign-in",
	robots: { index: false, follow: false },
};

interface LoginPageProps {
	searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: Readonly<LoginPageProps>) {
	const { callbackUrl, error } = await searchParams;
	const redirectTo = safeAdminCallback(callbackUrl);

	// Already signed in: skip the form, go where they were headed.
	const { email, allowed } = await getAdminAccess();
	if (email) redirect(allowed ? redirectTo : "/access-denied");

	return (
		<AuthShell
			eyebrow="Admin access"
			title="Maintainer sign-in"
			lead="Sign in with the Google account invited to manage this site."
		>
			{error ? (
				// Mirrors the AdminNotice error recipe so it reads as an error in dark too.
				<p
					role="alert"
					className="flex items-start gap-2 rounded-md border border-ruby-line bg-ruby-soft px-3 py-3 text-left text-sm text-ruby"
				>
					<AlertCircle size={16} aria-hidden="true" className="mt-1 shrink-0" />
					<span>
						{error === "AccessDenied"
							? "This account does not have access. Use the Google account invited to manage the site, or ask the site owner to add you."
							: "We couldn't complete sign-in. Please try again. If it still doesn't work, contact the site owner."}
					</span>
				</p>
			) : null}

			<form
				action={async () => {
					"use server";
					await signIn("google", { redirectTo });
				}}
				className={error ? "mt-6" : undefined}
			>
				<SignInButton />
			</form>
			<p className="mt-4 text-sm text-muted">
				Looking for artwork or a workshop? You can browse and contact us without signing in.
			</p>

			<Link
				href="/"
				className="group mt-6 inline-flex min-h-control items-center gap-1.5 text-xs uppercase tracking-meta text-muted transition-colors hover:text-ink"
			>
				<ArrowLeft
					size={12}
					aria-hidden="true"
					className="transition-transform group-hover:-translate-x-0.5"
				/>
				Back to site
			</Link>
		</AuthShell>
	);
}
