import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import type {
  CaptureKind,
  CaptureSnapshot,
  StoredAnalysis,
} from "./types";

const mocks = vi.hoisted(() => ({
  loadAnalysis: vi.fn(),
  saveAnalysis: vi.fn(),
  clearAnalysis: vi.fn(),
  captureInstagramList: vi.fn(),
  getProfileUsername: vi.fn(),
}));

vi.mock("./lib/storage", () => ({
  loadAnalysis: mocks.loadAnalysis,
  saveAnalysis: mocks.saveAnalysis,
  clearAnalysis: mocks.clearAnalysis,
}));

vi.mock("./lib/instagram-dom", () => ({
  captureInstagramList: mocks.captureInstagramList,
  getProfileUsername: mocks.getProfileUsername,
}));

const snapshot = (
  kind: CaptureKind,
  usernames: string[],
): CaptureSnapshot => ({
  kind,
  accountUsername: "ryan",
  capturedAt: "2026-06-23T12:00:00.000Z",
  capturedTotal: usernames.length,
  accounts: usernames.map((username) => ({ username })),
});

const completeAnalysis: StoredAnalysis = {
  version: 2,
  sessionId: "session-1",
  accountUsername: "ryan",
  captures: {
    followers: snapshot("followers", ["ana", "bruno"]),
    following: snapshot("following", ["bruno", "carla"]),
  },
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAnalysis.mockResolvedValue(null);
    mocks.saveAnalysis.mockResolvedValue(undefined);
    mocks.getProfileUsername.mockReturnValue("ryan");
    mocks.captureInstagramList.mockImplementation(
      async (kind: CaptureKind) =>
        kind === "followers"
          ? snapshot(kind, ["ana", "bruno"])
          : snapshot(kind, ["bruno", "carla"]),
    );
  });

  it("não apresenta resultado antes de concluir as duas capturas", async () => {
    render(<App />);

    await waitFor(() =>
      expect(mocks.loadAnalysis).toHaveBeenCalledOnce(),
    );
    expect(screen.queryByText(/Resultado de/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Capturar seguidores" }),
    );
    await waitFor(() => expect(mocks.saveAnalysis).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/Resultado de/)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Capturar contas seguidas" }),
    );

    expect(await screen.findByText("@ryan")).toBeInTheDocument();
    expect(mocks.saveAnalysis).toHaveBeenCalledTimes(2);
  });

  it("invalida o resultado anterior ao iniciar uma recaptura", async () => {
    mocks.loadAnalysis.mockResolvedValue(completeAnalysis);
    mocks.captureInstagramList.mockRejectedValueOnce(
      new Error("captura interrompida"),
    );

    render(<App />);
    expect(await screen.findByText("@ryan")).toBeInTheDocument();

    fireEvent.click(
      screen.getAllByRole("button", { name: "Refazer captura" })[0],
    );

    await waitFor(() => expect(mocks.clearAnalysis).toHaveBeenCalledOnce());
    expect(screen.queryByText("@ryan")).not.toBeInTheDocument();
  });
});
