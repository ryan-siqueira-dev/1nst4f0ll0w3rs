import type { StoredAnalysis } from "../types";

const STORAGE_KEY = "instagramFollowerAnalysis";

interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
}

function isCaptureSnapshot(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;

  if (
    (snapshot.kind !== "followers" && snapshot.kind !== "following") ||
    typeof snapshot.accountUsername !== "string" ||
    typeof snapshot.capturedAt !== "string" ||
    !Number.isSafeInteger(snapshot.capturedTotal) ||
    Number(snapshot.capturedTotal) < 0 ||
    !Array.isArray(snapshot.accounts)
  ) {
    return false;
  }

  const usernames = snapshot.accounts.map((account) => {
    if (!account || typeof account !== "object") return null;
    const username = (account as Record<string, unknown>).username;
    return typeof username === "string" && username ? username : null;
  });

  return (
    usernames.every((username) => username !== null) &&
    new Set(usernames).size === snapshot.capturedTotal
  );
}

function storageArea(): StorageArea {
  const chromeApi = (
    globalThis as typeof globalThis & {
      chrome?: { storage?: { local?: StorageArea } };
    }
  ).chrome;

  if (!chromeApi?.storage?.local) {
    throw new Error("Não foi possível acessar o armazenamento local da extensão.");
  }

  return chromeApi.storage.local;
}

function isStoredAnalysis(value: unknown): value is StoredAnalysis {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredAnalysis>;

  return (
    candidate.version === 2 &&
    typeof candidate.sessionId === "string" &&
    typeof candidate.accountUsername === "string" &&
    typeof candidate.captures === "object" &&
    candidate.captures !== null &&
    Object.entries(candidate.captures).every(
      ([kind, snapshot]) =>
        (kind === "followers" || kind === "following") &&
        isCaptureSnapshot(snapshot) &&
        (snapshot as { accountUsername: string }).accountUsername ===
          candidate.accountUsername,
    )
  );
}

export async function loadAnalysis(): Promise<StoredAnalysis | null> {
  const stored = await storageArea().get(STORAGE_KEY);
  const value = stored[STORAGE_KEY];
  return isStoredAnalysis(value) ? value : null;
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  await storageArea().set({ [STORAGE_KEY]: analysis });
}

export async function clearAnalysis(): Promise<void> {
  await storageArea().remove(STORAGE_KEY);
}
