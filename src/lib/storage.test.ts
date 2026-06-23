import { clearAnalysis, loadAnalysis, saveAnalysis } from "./storage";
import type { StoredAnalysis } from "../types";

const get = vi.fn();
const set = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: { get, set, remove },
      },
    },
  });
});

const completeAnalysis: StoredAnalysis = {
  version: 2,
  sessionId: "session-1",
  accountUsername: "ryan",
  captures: {
    followers: {
      kind: "followers",
      accountUsername: "ryan",
      capturedAt: "2026-06-23T12:00:00.000Z",
      capturedTotal: 1,
      accounts: [{ username: "ana" }],
    },
  },
};

describe("storage", () => {
  it("carrega somente capturas consistentes", async () => {
    get.mockResolvedValue({
      instagramFollowerAnalysis: completeAnalysis,
    });
    await expect(loadAnalysis()).resolves.toEqual(completeAnalysis);

    get.mockResolvedValue({
      instagramFollowerAnalysis: {
        ...completeAnalysis,
        captures: {
          followers: {
            ...completeAnalysis.captures.followers,
            capturedTotal: 2,
          },
        },
      },
    });
    await expect(loadAnalysis()).resolves.toBeNull();
  });

  it("salva e remove pelo armazenamento local da extensão", async () => {
    set.mockResolvedValue(undefined);
    remove.mockResolvedValue(undefined);

    await saveAnalysis(completeAnalysis);
    expect(set).toHaveBeenCalledWith({
      instagramFollowerAnalysis: completeAnalysis,
    });

    await clearAnalysis();
    expect(remove).toHaveBeenCalledWith("instagramFollowerAnalysis");
  });
});
