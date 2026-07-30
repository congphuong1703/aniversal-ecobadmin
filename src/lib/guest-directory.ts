import "server-only";

import { E2E_GUESTS } from "@/data/e2e-guests";
import { GUESTS } from "@/data/guests";
import {
  isE2eMemoryRepositoryEnabled,
  type E2eEnvironment,
} from "@/lib/e2e-mode";

export function getGuestDirectory(
  environment: E2eEnvironment = process.env,
) {
  return isE2eMemoryRepositoryEnabled(environment) ? E2E_GUESTS : GUESTS;
}

export function findGuestInActiveDirectory(
  id: string,
  environment?: E2eEnvironment,
) {
  return getGuestDirectory(environment).find((guest) => guest.id === id);
}
