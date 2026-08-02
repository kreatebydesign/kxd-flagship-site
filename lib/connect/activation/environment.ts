/**
 * Phase 6 Batch C4 — environment gate for local dogfood Connect.
 *
 * Production and Vercel production never allow Connect dogfood activation.
 * Fail closed.
 */

export function isConnectProductionEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.NODE_ENV === "production" || env.VERCEL_ENV === "production"
  );
}

/**
 * Whether this runtime may participate in local Connect dogfood.
 * Does not alone grant access — activation + allowlists still required.
 */
export function isConnectEnvironmentAllowed(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (isConnectProductionEnvironment(env)) return false;
  if (env.KXD_CONNECT_FORCE_ENVIRONMENT_DENIED?.trim() === "1") {
    return false;
  }
  return true;
}
