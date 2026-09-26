"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
// The public entrance CSS rides the root layout (this provider renders on every
// route) so it loads once, with the layout's own stylesheet, never per segment.
import "@/components/decor/marquee.css";
import "@/components/ui/pigment-band.css";
import "./kinetic.css";

export function MotionProvider({ children }: Readonly<{ children: ReactNode }>) {
	return <MotionConfig reducedMotion="never">{children}</MotionConfig>;
}
