interface FixedWindowRateLimiterOptions {
	limit: number;
	windowMs: number;
	maxKeys: number;
}

interface RateWindow {
	startedAt: number;
	count: number;
}

/**
 * Build a bounded per-key limiter for best-effort serverless abuse control.
 * Entries are process-local and expire lazily; durable enforcement belongs in
 * a shared store when the project has one.
 */
export function createFixedWindowRateLimiter({
	limit,
	windowMs,
	maxKeys,
}: FixedWindowRateLimiterOptions): (key: string, now?: number) => boolean {
	const windows = new Map<string, RateWindow>();

	return (key: string, now = Date.now()) => {
		for (const [storedKey, window] of windows) {
			if (now - window.startedAt >= windowMs) windows.delete(storedKey);
		}
		while (!windows.has(key) && windows.size >= maxKeys) {
			const oldestKey = windows.keys().next().value;
			if (typeof oldestKey !== "string") break;
			windows.delete(oldestKey);
		}

		const current = windows.get(key);
		if (!current || now - current.startedAt >= windowMs) {
			windows.set(key, { startedAt: now, count: 1 });
			return false;
		}

		current.count += 1;
		return current.count > limit;
	};
}
