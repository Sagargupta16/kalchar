/**
 * Client-safe wording for an admin action refused because the maintainer is
 * no longer signed in. lib/admin-auth.ts throws NOT_AUTHORIZED_MESSAGE on the
 * server; the shared admin action hook shows SIGNED_OUT_MESSAGE instead, and
 * AdminErrorNotice adds a sign-in link back to the same admin page.
 */
import { safeAdminCallback } from "./admin-callback";

export const NOT_AUTHORIZED_MESSAGE = "Not authorized.";
export const SIGNED_OUT_MESSAGE = "You have been signed out. Sign in again to save.";

/** The message to show for a failed admin action: plain words for a lost session. */
export function adminFailureMessage(message: string): string {
	return message === NOT_AUTHORIZED_MESSAGE ? SIGNED_OUT_MESSAGE : message;
}

/** The login page, set to return to `currentPath` (or /admin when it is not an admin page). */
export function signInAgainHref(currentPath: string): string {
	return `/login?${new URLSearchParams({ callbackUrl: safeAdminCallback(currentPath) })}`;
}
