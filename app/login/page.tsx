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
import { GoogleIcon } from "@/components/ui/brand-icons";
import { buttonVariants } from "@/components/ui/button";
import { getAdminAccess } from "@/lib/admin-auth";
import { safeAdminCallback } from "@/lib/admin-callback";

export const metadata: Metadata = {
	title: "Maintainer sign-in",
	robots: { index: false, follow: false },
};

interface LoginPageProps {
	searchParams: Promise<{ callbackUrl?: string; error?: string }>;
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
			lead="Access is limited to listed maintainers. Sign in with the Google account on the allowlist."
		>
			{error ? (
				// Mirrors the AdminNotice error recipe so it reads as an error in dark too.
				<p
					role="alert"
					className="mt-6 flex items-start gap-2 rounded-(--radius-sm) border border-ruby-line bg-ruby-soft px-3 py-2 text-left text-sm text-ruby"
				>
					<AlertCircle size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
					<span>
						That account is not on the maintainer list. Ask an existing maintainer to add you, then
						try again.
					</span>
				</p>
			) : null}

			<form
				action={async () => {
					"use server";
					await signIn("google", { redirectTo });
				}}
				className="mt-6"
			>
				<button type="submit" className={buttonVariants({ variant: "ghost", size: "lg" })}>
					<GoogleIcon className="size-4 shrink-0" aria-hidden="true" />
					Continue with Google
				</button>
			</form>

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
