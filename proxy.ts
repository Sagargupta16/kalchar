/**
 * Route protection for the admin panel (Next 16 proxy.ts, formerly middleware.ts).
 *
 * Wraps every /admin request with the Auth.js session check: an unauthenticated
 * visitor is redirected to Google sign-in, then back. The signIn callback in
 * auth.ts further restricts WHO may complete login (maintainers table), so this
 * just enforces "must be logged in" -- the allowlist is enforced at login.
 *
 * The Auth.js `auth()` wrapper supplies the default export Next runs as the
 * proxy; `config.matcher` scopes it to /admin. Runs on the Node.js runtime.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
	const isAdmin = req.nextUrl.pathname.startsWith("/admin");
	if (isAdmin && !req.auth) {
		const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
		signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
		return NextResponse.redirect(signInUrl);
	}
	return NextResponse.next();
});

export const config = {
	matcher: ["/admin/:path*"],
};
