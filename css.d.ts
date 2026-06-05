// Ambient declaration for side-effect CSS imports (import "./globals.css").
// TypeScript 6 errors (TS2882) on side-effect imports of modules it can't
// resolve a type for; Next bundles the CSS at build, so we only need to tell
// tsc the module exists. Covers globals.css and component-level *.css imports.
declare module "*.css";
