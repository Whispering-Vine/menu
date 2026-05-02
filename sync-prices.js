#!/usr/bin/env node

const DEFAULT_ADMIN_BASE_URL = "https://admin.wvwine.co";
const ENDPOINT_PATH = "/api/toast/menu/fourth-linked-prices";

function readRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (value) {
    return value;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, "");
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { rawResponse: text };
  }
}

function summarizeResult(payload) {
  const failed = Array.isArray(payload.failed) ? payload.failed : [];
  const wouldUpdate = Array.isArray(payload.wouldUpdate) ? payload.wouldUpdate : [];
  const updated = Array.isArray(payload.updated) ? payload.updated : [];
  const skipped = Array.isArray(payload.skipped) ? payload.skipped : [];

  console.log("Fourth Street Toast price sync complete.");
  console.log(`Applied: ${payload.applied === true}`);
  console.log(`Dry run: ${payload.dryRun === true}`);
  console.log(`Linked prices: ${payload.linkedPriceCount ?? payload.itemCount ?? 0}`);
  console.log(`Items checked: ${payload.itemCount ?? 0}`);
  console.log(`Updated: ${updated.length}`);
  console.log(`Would update: ${wouldUpdate.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (updated.length > 0) {
    console.log("\nUpdated items:");
    updated.forEach((item) => {
      console.log(
        `- ${item.name}: $${Number(item.currentPrice).toFixed(2)} -> $${Number(item.nextPrice).toFixed(2)}`
      );
    });
  }

  if (wouldUpdate.length > 0) {
    console.log("\nWould update items:");
    wouldUpdate.forEach((item) => {
      console.log(
        `- ${item.name}: $${Number(item.currentPrice).toFixed(2)} -> $${Number(item.nextPrice).toFixed(2)}`
      );
    });
  }

  if (failed.length > 0) {
    console.log("\nFailed items:");
    failed.forEach((item) => {
      console.log(`- ${item.name}: ${item.status}${item.error ? ` (${item.error})` : ""}`);
    });
  }
}

async function main() {
  const stackApiKey = readRequiredEnv("STACK_AUTH_API_KEY");
  const adminBaseUrl = normalizeBaseUrl(process.env.ADMIN_BASE_URL?.trim() || DEFAULT_ADMIN_BASE_URL);
  const dryRun = ["1", "true", "yes"].includes(
    String(process.env.TOAST_PRICE_SYNC_DRY_RUN || "").trim().toLowerCase()
  );
  const endpoint = new URL(ENDPOINT_PATH, adminBaseUrl);

  if (!dryRun) {
    endpoint.searchParams.set("apply", "1");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${stackApiKey}`,
      "Content-Type": "application/json",
      "x-api-key": stackApiKey,
      "x-stack-api-key": stackApiKey,
    },
    body: JSON.stringify({ apply: !dryRun }),
  });

  const payload = await readJsonResponse(response);
  summarizeResult(payload);

  if (!response.ok) {
    console.error(`\nRequest failed with HTTP ${response.status}.`);
    if (payload.error) {
      console.error(payload.error);
    }
    process.exit(1);
  }

  if (Array.isArray(payload.failed) && payload.failed.length > 0) {
    console.error("\nToast price sync reported failed items.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
