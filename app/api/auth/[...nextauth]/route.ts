/**
 * Auth.js v5 catch-all route handler. Exposes the sign-in / callback / sign-out
 * endpoints under /api/auth/*. The Google callback Google redirects to is
 * /api/auth/callback/google (registered in the Google Cloud OAuth client).
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
