#!/usr/bin/env node
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * UI token guard. The design system routes depth, motion, type size, focus and
 * z-order through tokens (app/globals.css) and shared strings (controls.ts);
 * this fails the build when raw utilities drift back in. Patterns in the
 * "integration" phase warn until every surface has migrated, then fail.
 * Spec: .claude/rework/final/system.md section 8.
 *
 * Usage: node scripts/check-ui-tokens.mjs [--root <dir>] [--phase now|integration]
 */

/** @typedef {"now" | "integration"} Phase */
/** @typedef {{ id: string, re: RegExp, phase: Phase | "warn", message: string }} Pattern */
/** @typedef {{ id: string, file: string, line: number, message: string }} Hit */

/** Flip to "integration" once every workstream has landed, then delete the flag. */
const ACTIVE_PHASE = /** @type {Phase} */ ("now");
const PHASES = new Set(["now", "integration"]);
const SCAN_DIRS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".tsx", ".ts", ".css"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "out"]);
const SKIP_FILES = /\.(?:test\.ts|test\.mjs|d\.ts)$/;
const GLOBALS = "app/globals.css";
const CONTROLS = "app/admin/_components/controls.ts";

/** @type {Pattern[]} */
export const PATTERNS = [
	{
		id: "raw-shadow",
		re: /\bshadow-(?:sm|md|lg|xl|2xl)\b/,
		phase: "now",
		message: "Use shadow-e0..e5, shadow-hairline or shadow-eN-edged",
	},
	{
		id: "raw-ring",
		re: /\bring-(?:black|white)\//,
		phase: "now",
		message: "Use shadow-hairline or border-line",
	},
	{
		id: "stacked-shadow",
		// Two unprefixed shadow utilities side by side; `shadow-e1 hover:shadow-e2` is a lift, not a stack.
		re: /(?<![\w:-])shadow-(?:e\d|hairline)\s+shadow-(?:e\d|hairline)\b/,
		phase: "integration",
		message: "Two shadow utilities collapse; use shadow-eN-edged",
	},
	{
		id: "literal-stagger",
		re: /delayMs=\{\d/,
		phase: "integration",
		message: "Use staggerDelay(i) or gridStaggerDelay(i) from lib/motion.ts (D27)",
	},
	{
		id: "literal-spring",
		re: /\b(?:stiffness|damping):\s*\d/,
		phase: "integration",
		message: "Springs live in lib/motion.ts (SPRING_PANEL / ZOOM / INDICATOR / LAYOUT / SHEET)",
	},
	{
		id: "image-zoom",
		re: /\bscale-\[1\./,
		phase: "integration",
		message: "Never scale the artwork; lift the frame (elevate-e2 + hover:-translate-y-0.5)",
	},
	{
		id: "layout-transition",
		re: /\btransition-\[(?:width|height|padding|top|left)/,
		phase: "integration",
		message: "Animate transform or opacity, never a layout property",
	},
	{
		id: "animated-blur",
		re: /(?<!backdrop-)filter:\s*"?blur/,
		phase: "integration",
		message: "Never animate into or out of a blur; apply backdrop-blur statically",
	},
	{
		id: "transition-all",
		re: /\btransition-all\b/,
		phase: "integration",
		message: "Use transition-ui or transition-colors",
	},
	{
		id: "arbitrary-text-size",
		re: /\btext-\[0?\.\d/,
		phase: "integration",
		message: "Use text-micro, text-label or a scale step",
	},
	{
		id: "arbitrary-tracking",
		re: /\btracking-\[var/,
		phase: "integration",
		message: "Use tracking-meta / tracking-eyebrow / tracking-display / tracking-tight",
	},
	{
		id: "arbitrary-z",
		re: /\bz-\[/,
		phase: "integration",
		message: "Use z-raised / z-sticky / z-nav / z-overlay",
	},
	{
		id: "dead-space-var",
		re: /var\(--space-\d/,
		phase: "integration",
		message: "Use --space-tight/group/page, --tabbar-offset or Tailwind spacing",
	},
	{
		id: "deprecated-ease-spring",
		re: /ease-\(--ease-spring\)|var\(--ease-spring\)/,
		phase: "now",
		message: "Bounce curve; springs live in lib/motion.ts",
	},
	{
		id: "deprecated-duration-micro",
		re: /duration-\(--duration-micro\)|var\(--duration-micro\)/,
		phase: "integration",
		message: "Use --duration-fast or drop it (bare transition-* inherits)",
	},
	{
		id: "arbitrary-timing",
		re: /\bduration-\[\d|\bease-\[/,
		phase: "now",
		message: "Use the --duration-* / --ease-* tokens",
	},
	{
		id: "arbitrary-color",
		re: /\b(?:bg|text|border|ring|fill|stroke|outline|from|to|via)-\[(?:#|rgba?\(|hsla?\()/,
		phase: "now",
		message: "No raw hex/rgb in components; add a token",
	},
	{
		id: "template-controls",
		re: /\$\{admin(?:Btn|Field|Icon|Panel|Row|Label|Help|Error|FilePicker|Thumb|Checkbox|SectionTitle)/,
		phase: "integration",
		message: "Compose with cn(adminX, ...) or a named variant",
	},
	{
		id: "black-white-alpha",
		re: /\b(?:bg|text|border)-(?:black|white)\//,
		phase: "integration",
		message: "Use bg-scrim/N or a token",
	},
	{
		id: "focus-ring",
		re: /\bfocus(?:-visible|-within)?:ring-|\bring-inset\b/,
		phase: "integration",
		message:
			"Focus is the global outline; use FOCUS_RING / FOCUS_WITHIN only for unmatched elements",
	},
	{
		id: "focus-outline-none",
		re: /\bfocus(?:-visible)?:outline-none\b/,
		phase: "integration",
		message: "Removing the outline leaves no focus indicator",
	},
	{
		id: "legacy-control-size",
		re: /\bmin-h-11\b|\bh-11 w-11\b|\bsize-11\b|\bmin-w-11\b/,
		phase: "warn",
		message: "Prefer min-h-control / size-control",
	},
	{
		id: "half-step",
		re: /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?:0\.5|2\.5|3\.5)\b/,
		phase: "warn",
		message: "4px grid; the sanctioned half step is 1.5",
	},
	{
		id: "vh-height",
		re: /\bmin-h-\[\d+vh\]|\bh-\[\d+vh\]/,
		phase: "warn",
		message: "Use svh (URL bar)",
	},
	{
		id: "ruby-alpha",
		re: /\b(?:border|bg|text)-ruby\/\d+/,
		phase: "warn",
		message: "Use the opaque ruby-line / ruby-soft tokens instead of alpha over a tinted surface",
	},
	{
		// The style-object form (style={{ "--plate-glow": swatch }}): the sanctioned
		// raw-colour exception is confined to the two allowlisted files.
		id: "inline-plate-glow",
		re: /"--plate-glow"/,
		phase: "now",
		message: "Inline --plate-glow only in PlateFrame and the artwork viewer plate",
	},
	{
		id: "inline-sheen-every",
		re: /"--sheen-every"/,
		phase: "now",
		message:
			"Set the sheen period through PlateFrame's sheen prop; inline --sheen-every only there",
	},
];

/** Paths where a pattern is legal: token definitions, deprecated aliases, sanctioned half steps. */
/** @type {{ id: string, path: string }[]} */
export const ALLOW = [
	{ id: "arbitrary-color", path: GLOBALS },
	{ id: "dead-space-var", path: GLOBALS },
	{ id: "deprecated-ease-spring", path: GLOBALS },
	{ id: "deprecated-duration-micro", path: GLOBALS },
	// The transition-ui comment names the forbidden utility.
	{ id: "transition-all", path: GLOBALS },
	{ id: "template-controls", path: CONTROLS },
	// The five spring definitions.
	{ id: "literal-spring", path: "lib/motion.ts" },
	// px-2.5 on pills and adminBtnSm; mt-0.5 is the notice icon's optical alignment.
	{ id: "half-step", path: CONTROLS },
	{ id: "half-step", path: "components/ui/badge.tsx" },
	{ id: "half-step", path: "app/admin/_components/admin-notice.tsx" },
	// The plate glow and sheen period are set inline only where visual-direction
	// 1.9 sanctions them (the palette array raw-colour exception).
	{ id: "inline-plate-glow", path: "components/gallery/plate-frame.tsx" },
	{ id: "inline-plate-glow", path: "components/gallery/artwork-viewer-plate.tsx" },
	{ id: "inline-sheen-every", path: "components/gallery/plate-frame.tsx" },
];

/** @param {Pattern} pattern @param {Phase} phase */
function failsIn(pattern, phase) {
	if (pattern.phase === "warn") return false;
	return pattern.phase === "now" || phase === "integration";
}

/** Scan one file's text. Line numbers are 1-based; `file` is root-relative with forward slashes.
 * @param {string} text @param {string} file @param {Phase} phase
 * @returns {{ errors: Hit[], warnings: Hit[] }}
 */
export function scan(text, file, phase) {
	/** @type {Hit[]} */
	const errors = [];
	/** @type {Hit[]} */
	const warnings = [];
	for (const [index, line] of text.split(/\r?\n/).entries()) {
		for (const pattern of PATTERNS) {
			if (!pattern.re.test(line)) continue;
			if (ALLOW.some((entry) => entry.id === pattern.id && entry.path === file)) continue;
			const hit = { id: pattern.id, file, line: index + 1, message: pattern.message };
			(failsIn(pattern, phase) ? errors : warnings).push(hit);
		}
	}
	return { errors, warnings };
}

/** Recursive, sorted, never follows symlinks; a missing directory scans as empty.
 * @param {string} directory @returns {Promise<string[]>}
 */
async function walk(directory) {
	/** @type {string[]} */
	const files = [];
	let entries;
	try {
		entries = await readdir(directory, { withFileTypes: true });
	} catch (error) {
		if (/** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT") return files;
		throw error;
	}
	entries.sort((a, b) => a.name.localeCompare(b.name, "en"));
	for (const entry of entries) {
		if (entry.isSymbolicLink()) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) files.push(...(await walk(path)));
		} else if (
			entry.isFile() &&
			EXTENSIONS.has(extname(entry.name)) &&
			!SKIP_FILES.test(entry.name)
		) {
			files.push(path);
		}
	}
	return files;
}

/** @param {Hit} hit @param {"error" | "warning"} level */
function annotation(hit, level) {
	return `::${level} file=${hit.file},line=${hit.line}::${hit.id}: ${hit.message}`;
}

/** Walk, scan, print GitHub annotations, return the exit code (0 clean or warnings, 1 errors, 2 usage).
 * @param {{ root: string, phase: string }} options
 */
export async function run(options) {
	/** @type {string} */
	let root;
	try {
		root = await realpath(options.root);
		if (!(await stat(root)).isDirectory()) throw new Error("not a directory");
	} catch {
		console.error(`check-ui-tokens: --root must be an existing directory (got "${options.root}").`);
		return 2;
	}
	if (!PHASES.has(options.phase)) {
		console.error(
			`check-ui-tokens: --phase must be "now" or "integration" (got "${options.phase}").`,
		);
		return 2;
	}
	const phase = /** @type {Phase} */ (options.phase);
	let errors = 0;
	let warnings = 0;
	for (const directory of SCAN_DIRS) {
		for (const path of await walk(join(root, directory))) {
			const file = relative(root, path).split(sep).join("/");
			const result = scan(await readFile(path, "utf8"), file, phase);
			for (const hit of result.errors) console.error(annotation(hit, "error"));
			for (const hit of result.warnings) console.log(annotation(hit, "warning"));
			errors += result.errors.length;
			warnings += result.warnings.length;
		}
	}
	console.log(`check-ui-tokens: ${errors} errors, ${warnings} warnings (phase: ${phase})`);
	return errors > 0 ? 1 : 0;
}

/** @param {string[]} argv @returns {{ root: string, phase: string } | null} */
function parseArgs(argv) {
	const options = { root: process.cwd(), phase: /** @type {string} */ (ACTIVE_PHASE) };
	for (let index = 0; index < argv.length; index += 2) {
		const flag = argv[index];
		const value = argv[index + 1];
		if (!value) return null;
		if (flag === "--root") options.root = resolve(value);
		else if (flag === "--phase") options.phase = value;
		else return null;
	}
	return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const options = parseArgs(process.argv.slice(2));
	if (options) {
		process.exitCode = await run(options);
	} else {
		console.error(
			"Usage: node scripts/check-ui-tokens.mjs [--root <dir>] [--phase now|integration]",
		);
		process.exitCode = 2;
	}
}
