import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function extractGuestFullNames(source) {
  return [...source.matchAll(/fullName:\s*"([^"]+)"/g)].map(
    ([, fullName]) => fullName,
  );
}

export function extractE2eGuestFullNames(source) {
  const namesBlock =
    /export const E2E_GUEST_FULL_NAMES\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(
      source,
    )?.[1] ?? "";

  return [...namesBlock.matchAll(/"([^"]+)"/g)].map(([, name]) => name);
}

export function findLeakedGuestNames(names, bundleContents) {
  return names.filter((name) =>
    bundleContents.some((contents) => contents.includes(name)),
  );
}

function readJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return readJavaScriptFiles(path);
    }

    return extname(entry.name) === ".js" ? [readFileSync(path, "utf8")] : [];
  });
}

export function checkBuiltClientPrivacy(rootDirectory = process.cwd()) {
  const guestSource = readFileSync(
    join(rootDirectory, "src/data/guests.ts"),
    "utf8",
  );
  const e2eGuestSource = readFileSync(
    join(rootDirectory, "src/data/e2e-guests.ts"),
    "utf8",
  );
  const guestNames = extractGuestFullNames(guestSource);
  const e2eGuestNames = extractE2eGuestFullNames(e2eGuestSource);

  if (guestNames.length !== e2eGuestNames.length) {
    throw new Error(
      `Expected ${guestNames.length} E2E guest names to match GUESTS, found ${e2eGuestNames.length}.`,
    );
  }

  const names = [...guestNames, ...e2eGuestNames];

  const bundleContents = readJavaScriptFiles(
    join(rootDirectory, ".next/static"),
  );
  const leakedNames = findLeakedGuestNames(names, bundleContents);

  if (leakedNames.length) {
    throw new Error(
      `Full guest names found in client bundles: ${leakedNames.join(", ")}`,
    );
  }

  return { bundleCount: bundleContents.length, guestNameCount: names.length };
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (import.meta.url === invokedPath) {
  const result = checkBuiltClientPrivacy();
  console.log(
    `Client privacy scan passed: ${result.guestNameCount} names checked across ${result.bundleCount} bundles.`,
  );
}
