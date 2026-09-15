"use client";

import { useEffect, useRef } from "react";

/** Groups use a focus marker because aria-invalid does not apply to fieldsets. */
export function useArtworkValidationFocus(validationAttempt: number) {
	const form = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (validationAttempt <= 0) return;
		const invalid = form.current?.querySelector<HTMLElement>(
			'[aria-invalid="true"], [data-invalid="true"]',
		);
		const disclosure = invalid?.closest("details");
		if (disclosure) disclosure.open = true;
		invalid?.focus();
	}, [validationAttempt]);
	return form;
}
