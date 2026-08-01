/** Read a required env var, failing fast if it is absent.
 *
 * Empty string counts as absent: an unset var and a var set to "" are the
 * same configuration mistake, and neither is a usable bucket name or domain.
 */
export const requireEnv = (name: string): string => {
	const value = process.env[name];
	if (value === undefined || value === "") {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
};

/** Read an env var that is allowed to be absent. */
export const optionalEnv = (name: string, fallback = ""): string =>
	process.env[name] ?? fallback;
