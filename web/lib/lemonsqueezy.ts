import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

/**
 * Initialize Lemon Squeezy SDK.
 * Note: LEMON_SQUEEZY_API_KEY must be in .env.local
 */
export function initLemonSqueezy() {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    throw new Error("LEMON_SQUEEZY_API_KEY is not set in environment variables.");
  }

  lemonSqueezySetup({
    apiKey,
    onError: (error) => {
      console.error("Lemon Squeezy SDK Error:", error);
    },
  });
}

/**
 * Environment check for required Lemon Squeezy variables.
 */
export function validateBillingEnv() {
  const required = [
    "LEMON_SQUEEZY_API_KEY",
    "LEMON_SQUEEZY_STORE_ID",
    "LEMON_SQUEEZY_WEBHOOK_SECRET",
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`Missing Lemon Squeezy environment variables: ${missing.join(", ")}`);
    return false;
  }
  return true;
}
