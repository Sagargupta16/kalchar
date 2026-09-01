/**
 * Failure envelope for admin server actions.
 *
 * Next.js replaces any error *thrown* inside a server action with a generic
 * "the specific message is omitted in production builds" digest before the
 * client sees it. Our validation messages ("Image must be a JPEG, PNG, or WebP
 * file.") therefore never reached the admin UI in production: every failure,
 * from a wrong file type to a real fault, surfaced as an opaque 500.
 *
 * Returned values are not sanitized, so actions hand their failure back as data
 * and the caller re-throws it in the browser, where messages survive and the
 * existing error UI keeps working unchanged.
 */

/** A failed action, carrying a message safe to show a maintainer. */
export interface Failure {
	ok: false;
	message: string;
}

/** A successful action, plus whatever payload it returns. */
export type Success<T> = { ok: true } & T;

export type ActionResult<T = unknown> = Success<T> | Failure;

/** Wrap a caught error as a failure the client can display. */
export function failure(error: unknown): Failure {
	return {
		ok: false,
		message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
	};
}

/**
 * Unwrap an action result in the browser: return the payload, or throw the
 * server's real message so the calling component's catch shows it.
 */
export function unwrap<T>(result: ActionResult<T>): Success<T> {
	if (!result.ok) throw new Error(result.message);
	return result;
}
