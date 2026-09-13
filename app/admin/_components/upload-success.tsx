"use client";

import { adminBtn } from "./controls";

/**
 * The add form's success line, in the artist's words, with the two next actions.
 * Stays until the next submit (no auto-dismiss). Plain anchors: one opens the
 * public page in a new tab, the other jumps to the new row in the list.
 */
export function UploadSuccess({ title, slug }: Readonly<{ title: string; slug: string }>) {
	return (
		<output className="grid gap-3 text-sm text-accent-text">
			<span>Added "{title}". It is now in the gallery.</span>
			<span className="flex flex-wrap gap-2">
				<a href={`/work/${slug}/`} target="_blank" rel="noreferrer" className={adminBtn}>
					View on site
				</a>
				<a href={`#piece-${slug}`} className={adminBtn}>
					Show in list
				</a>
			</span>
		</output>
	);
}
