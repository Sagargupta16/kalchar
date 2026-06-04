/**
 * Auth.js v5 (NextAuth) config -- Google sign-in gated to an admin allowlist.
 *
 * Only emails in ADMIN_EMAILS (comma-separated) may sign in; everyone else is
 * rejected at the `signIn` callback. Admins are Sagar + Megha (see
 * docs/PHASE-2-SETUP.md). This protects the /admin panel.
 *
 * Env vars (see .env.example):
 *   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ADMIN_EMAILS
 *
 * Auth.js auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET for the Google
 * provider, so no explicit clientId/clientSecret wiring is needed.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
	.split(",")
	.map((e) => e.trim().toLowerCase())
	.filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [Google],
	callbacks: {
		signIn({ profile }) {
			const email = profile?.email?.toLowerCase();
			return Boolean(email && adminEmails.includes(email));
		},
	},
});
