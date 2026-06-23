export interface InstagramAccount {
  username: string;
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

export type CaptureKind = "followers" | "following";

export interface CaptureSnapshot {
  kind: CaptureKind;
  accountUsername: string;
  capturedAt: string;
  capturedTotal: number;
  accounts: InstagramAccount[];
}

export interface StoredAnalysis {
  version: 2;
  sessionId: string;
  accountUsername: string;
  captures: Partial<Record<CaptureKind, CaptureSnapshot>>;
}

export interface CaptureProgress {
  kind: CaptureKind;
  collected: number;
  message: string;
}
