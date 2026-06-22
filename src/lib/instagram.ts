import JSZip from "jszip";
import type {
  ComparisonResult,
  InstagramAccount,
  InstagramData,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const normalizeUsername = (value: string) =>
  value.trim().replace(/^@/, "").toLocaleLowerCase();

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null;

function accountFromStringListItem(value: unknown): InstagramAccount | null {
  if (!isRecord(value) || !Array.isArray(value.string_list_data)) {
    return null;
  }

  const item = value.string_list_data.find(isRecord);
  if (!item || typeof item.value !== "string" || !item.value.trim()) {
    return null;
  }

  return {
    username: normalizeUsername(item.value),
    href: typeof item.href === "string" ? item.href : undefined,
    timestamp: typeof item.timestamp === "number" ? item.timestamp : undefined,
  };
}

function extractAccounts(value: unknown): InstagramAccount[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const account = accountFromStringListItem(item);
      return account ? [account] : extractAccounts(item);
    });
  }

  if (!isRecord(value)) {
    return [];
  }

  const direct = accountFromStringListItem(value);
  if (direct) {
    return [direct];
  }

  return Object.values(value).flatMap(extractAccounts);
}

function uniqueAccounts(accounts: InstagramAccount[]): InstagramAccount[] {
  const byUsername = new Map<string, InstagramAccount>();

  for (const account of accounts) {
    if (!byUsername.has(account.username)) {
      byUsername.set(account.username, account);
    }
  }

  return [...byUsername.values()].sort((a, b) =>
    a.username.localeCompare(b.username),
  );
}

function isFollowerFile(path: string): boolean {
  const filename = path.split("/").pop()?.toLocaleLowerCase() ?? "";
  return /^followers(?:_\d+)?\.json$/.test(filename);
}

function isFollowingFile(path: string): boolean {
  const filename = path.split("/").pop()?.toLocaleLowerCase() ?? "";
  return filename === "following.json";
}

export async function parseInstagramZip(file: File): Promise<InstagramData> {
  if (!file.name.toLocaleLowerCase().endsWith(".zip")) {
    throw new Error("Selecione o arquivo ZIP baixado do Instagram.");
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("Não foi possível abrir o ZIP. Baixe o arquivo novamente.");
  }

  const entries = Object.values(zip.files).filter(
    (entry) =>
      !entry.dir && (isFollowerFile(entry.name) || isFollowingFile(entry.name)),
  );

  const followerEntries = entries.filter((entry) =>
    isFollowerFile(entry.name),
  );
  const followingEntry = entries.find((entry) => isFollowingFile(entry.name));

  if (followerEntries.length === 0 || !followingEntry) {
    throw new Error(
      "O ZIP não contém os arquivos de seguidores e contas seguidas. Gere uma exportação JSON incluindo “Seguidores e seguindo”.",
    );
  }

  try {
    const followerJson = await Promise.all(
      followerEntries.map(async (entry) =>
        JSON.parse(await entry.async("string")),
      ),
    );
    const followingJson = JSON.parse(await followingEntry.async("string"));

    return {
      followers: uniqueAccounts(followerJson.flatMap(extractAccounts)),
      following: uniqueAccounts(extractAccounts(followingJson)),
    };
  } catch {
    throw new Error(
      "Os arquivos JSON da exportação estão inválidos ou em um formato desconhecido.",
    );
  }
}

export function compareAccounts(data: InstagramData): ComparisonResult {
  const followers = new Map(
    data.followers.map((account) => [account.username, account]),
  );
  const following = new Map(
    data.following.map((account) => [account.username, account]),
  );

  return {
    notFollowingBack: data.following.filter(
      (account) => !followers.has(account.username),
    ),
    youDoNotFollowBack: data.followers.filter(
      (account) => !following.has(account.username),
    ),
    mutual: data.following.filter((account) =>
      followers.has(account.username),
    ),
  };
}
