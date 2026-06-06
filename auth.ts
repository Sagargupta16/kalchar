/**
 * Auth.js v5 (NextAuth) config -- Google sign-in gated to the maintainer roster.
 *
 * Login is allowed only for emails in the `maintainers` DB table (see
 * lib/maintainers.ts). The roster is seeded with sg85207@gmail.com as root and
 * is editable from the /admin panel, so access can change without a redeploy.
 *
 * Env vars (see .env.example):
 *   AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
 *
 * Auth.js auto-reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET for the Google
 * provider, so no explicit clientId/clientSecret wiring is needed.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isMaintainer } from "@/lib/maintainers";

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [Google],
	pages: {
		// A non-maintainer Google account fails the signIn callback below;
		// Auth.js sends them here instead of the default NextAuth error screen.
		error: "/access-denied",
	},
	callbacks: {
		async signIn({ profile }) {
			return await isMaintainer(profile?.email);
		},
	},
});
