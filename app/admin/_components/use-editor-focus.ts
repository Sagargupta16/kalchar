"use client";

import { useEffect, useRef } from "react";

/** Focus the first field when a user opens an editor, without refocusing on updates. */
export function useEditorFocus<T extends HTMLElement>(editing = true) {
	const fieldRef = useRef<T>(null);
	useEffect(() => {
		if (editing) fieldRef.current?.focus();
	}, [editing]);
	return fieldRef;
}
