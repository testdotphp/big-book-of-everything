const attempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): boolean {
	const now = Date.now();
	const entry = attempts.get(key);

	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return true;
	}

	entry.count++;
	if (entry.count > MAX_ATTEMPTS) return false;
	return true;
}
