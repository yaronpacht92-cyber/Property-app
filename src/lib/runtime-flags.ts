/**
 * Central production/runtime flags.
 * Keep authentication always on; only gate optional public surfaces here.
 */
export function isProductionRuntime() {
  return (
    process.env.APP_ENV === "production" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

/**
 * Public self-serve signup (/signup).
 * Disabled by default in production for personal-use deployments.
 * Set ALLOW_PUBLIC_SIGNUP=true only if you intentionally want open registration.
 */
export function isPublicSignupEnabled() {
  if (process.env.ALLOW_PUBLIC_SIGNUP === "true") return true;
  if (process.env.ALLOW_PUBLIC_SIGNUP === "false") return false;
  return !isProductionRuntime();
}
