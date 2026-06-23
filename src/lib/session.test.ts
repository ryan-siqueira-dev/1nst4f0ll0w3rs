import {
  applyCapture,
  canAppendCapture,
  isCompleteAnalysis,
} from "./session";
import type { CaptureKind, CaptureSnapshot } from "../types";

const capture = (
  kind: CaptureKind,
  accountUsername = "ryan",
): CaptureSnapshot => ({
  kind,
  accountUsername,
  capturedAt: "2026-06-23T12:00:00.000Z",
  capturedTotal: 1,
  accounts: [{ username: "ana" }],
});

describe("applyCapture", () => {
  it("combina duas listas da mesma conta na mesma sessão", () => {
    const first = applyCapture(null, capture("followers"), () => "session-1");
    const complete = applyCapture(
      first,
      capture("following"),
      () => "session-2",
    );

    expect(complete.sessionId).toBe("session-1");
    expect(isCompleteAnalysis(complete)).toBe(true);
  });

  it("inicia outra sessão ao repetir uma captura", () => {
    const first = applyCapture(null, capture("followers"), () => "session-1");
    const repeated = applyCapture(
      first,
      capture("followers"),
      () => "session-2",
    );

    expect(repeated.sessionId).toBe("session-2");
    expect(repeated.captures.following).toBeUndefined();
  });

  it("não mistura contas diferentes", () => {
    const first = applyCapture(null, capture("followers"), () => "session-1");
    const otherAccount = applyCapture(
      first,
      capture("following", "outra"),
      () => "session-2",
    );

    expect(otherAccount.accountUsername).toBe("outra");
    expect(otherAccount.captures.followers).toBeUndefined();
  });
});

describe("canAppendCapture", () => {
  it("permite somente a lista complementar da mesma conta", () => {
    const first = applyCapture(null, capture("followers"), () => "session-1");

    expect(canAppendCapture(first, "ryan", "following")).toBe(true);
    expect(canAppendCapture(first, "ryan", "followers")).toBe(false);
    expect(canAppendCapture(first, "outra", "following")).toBe(false);
  });
});
