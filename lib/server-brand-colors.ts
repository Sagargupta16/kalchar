/**
 * Brand colors for outputs rendered before or outside the stylesheet.
 * Keep these values aligned with app/globals.css.
 * night = the rendered dark canvas (--color-bg dark, oklch(0.14 0.015 60));
 * paper = light --color-bg. Change both together with globals.css.
 */
export const SERVER_BRAND_COLORS = {
	paper: "#faf8f3",
	night: "#0e0804",
	ink: "#2a221b",
	terracotta: "#a84f32",
	marigold: "#dfad55",
} as const;
