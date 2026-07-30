import "server-only";

type E2eEnvironment = {
  NODE_ENV?: string;
  E2E_REPOSITORY?: string;
};

export const E2E_WORKER_HEADER = "x-e2e-worker-id";

export function normalizeE2eWorkerScope(value: string | null) {
  const scope = value?.trim();

  if (!scope || !/^[a-zA-Z0-9_-]{1,64}$/.test(scope)) {
    return undefined;
  }

  return scope;
}

export function isE2eMemoryRepositoryEnabled(
  environment: E2eEnvironment = process.env,
) {
  return (
    environment.NODE_ENV !== "production" &&
    environment.E2E_REPOSITORY === "memory"
  );
}
