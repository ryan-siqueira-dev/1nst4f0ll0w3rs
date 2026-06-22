export interface InstagramAccount {
  username: string;
  href?: string;
  timestamp?: number;
}

export interface InstagramData {
  followers: InstagramAccount[];
  following: InstagramAccount[];
}

export type ResultCategory =
  | "notFollowingBack"
  | "youDoNotFollowBack"
  | "mutual";

export interface ComparisonResult {
  notFollowingBack: InstagramAccount[];
  youDoNotFollowBack: InstagramAccount[];
  mutual: InstagramAccount[];
}
