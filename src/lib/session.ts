import type {
  CaptureKind,
  CaptureSnapshot,
  StoredAnalysis,
} from "../types";

export function canAppendCapture(
  current: StoredAnalysis | null,
  accountUsername: string,
  kind: CaptureKind,
): boolean {
  return Boolean(
    current?.accountUsername === accountUsername &&
      !current.captures[kind] &&
      Object.keys(current.captures).length === 1,
  );
}

export function applyCapture(
  current: StoredAnalysis | null,
  capture: CaptureSnapshot,
  createSessionId: () => string = () => crypto.randomUUID(),
): StoredAnalysis {
  if (
    current &&
    canAppendCapture(current, capture.accountUsername, capture.kind)
  ) {
    return {
      ...current,
      captures: {
        ...current.captures,
        [capture.kind]: capture,
      },
    };
  }

  return {
    version: 2,
    sessionId: createSessionId(),
    accountUsername: capture.accountUsername,
    captures: {
      [capture.kind]: capture,
    },
  };
}

export function isCompleteAnalysis(
  analysis: StoredAnalysis | null,
): analysis is StoredAnalysis & {
  captures: Record<CaptureKind, CaptureSnapshot>;
} {
  return Boolean(
    analysis?.captures.followers &&
      analysis.captures.following &&
      analysis.captures.followers.accountUsername ===
        analysis.accountUsername &&
      analysis.captures.following.accountUsername ===
        analysis.accountUsername,
  );
}
