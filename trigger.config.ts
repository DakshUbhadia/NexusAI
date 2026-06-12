import { defineConfig } from "@trigger.dev/sdk";
import { config as loadEnv } from "dotenv";

// Trigger CLI can evaluate this file before Next.js env loading.
// Load local env files explicitly so TRIGGER_PROJECT_REF is available.
loadEnv({ path: ".env.local" });
loadEnv();

const triggerProjectRef = process.env.TRIGGER_PROJECT_REF;

if (!triggerProjectRef) {
  throw new Error(
    "Missing TRIGGER_PROJECT_REF. Add your Trigger.dev project ref (usually starts with \"proj_\") to .env.local."
  );
}

if (!triggerProjectRef.startsWith("proj_")) {
  throw new Error(
    "Invalid TRIGGER_PROJECT_REF. This value should be your Trigger.dev project ref and usually starts with \"proj_\"."
  );
}

export default defineConfig({
  project: "proj_dmbdyaodfvvegtqcqmtu",
  runtime: "node",
  dirs: ["./trigger"],
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
