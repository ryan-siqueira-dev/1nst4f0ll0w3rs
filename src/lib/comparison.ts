import type {
  ComparisonResult,
  InstagramAccount,
} from "../types";

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLocaleLowerCase();
}

export function uniqueAccounts(
  accounts: InstagramAccount[],
): InstagramAccount[] {
  const usernames = new Set<string>();

  for (const account of accounts) {
    const username = normalizeUsername(account.username);
    if (username) usernames.add(username);
  }

  return [...usernames]
    .sort((a, b) => a.localeCompare(b))
    .map((username) => ({ username }));
}

export function compareAccounts(
  followersInput: InstagramAccount[],
  followingInput: InstagramAccount[],
): ComparisonResult {
  const followers = uniqueAccounts(followersInput);
  const following = uniqueAccounts(followingInput);
  const followerNames = new Set(followers.map(({ username }) => username));
  const followingNames = new Set(following.map(({ username }) => username));

  return {
    notFollowingBack: following.filter(
      ({ username }) => !followerNames.has(username),
    ),
    youDoNotFollowBack: followers.filter(
      ({ username }) => !followingNames.has(username),
    ),
    mutual: following.filter(({ username }) => followerNames.has(username)),
  };
}
