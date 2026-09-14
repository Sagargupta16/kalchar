"use client";

import { cn } from "@/lib/utils";
import { adminSwitch, adminSwitchThumb } from "./controls";

/**
 * Shared role="switch" primitive on the motion-elevation S7 control strings:
 * the button is the 24x44 track with a ::before hit area restoring the 44px
 * target, the thumb slides 18px on translate at --duration-fast and the track
 * recolours through transition-colors, so both land in the same frame. Focus
 * is the global outline (3px offset on rounded-full). Colour changes survive
 * reduced motion.
 */
export function AdminSwitch({
	checked,
	onChange,
	disabled,
	label,
	id,
}: Readonly<{
	checked: boolean;
	onChange: (next: boolean) => void;
	disabled?: boolean;
	label: string;
	id?: string;
}>) {
	return (
		<button
			type="button"
			role="switch"
			id={id}
			aria-checked={checked}
			aria-label={label}
			disabled={disabled}
			onClick={() => onChange(!checked)}
			className={cn(adminSwitch, "disabled:opacity-50")}
		>
			<span aria-hidden="true" className={adminSwitchThumb} />
		</button>
	);
}
