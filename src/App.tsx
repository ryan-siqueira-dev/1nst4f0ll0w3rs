import { useEffect, useMemo, useRef, useState } from "react";
import { Results } from "./components/Results";
import { compareAccounts } from "./lib/comparison";
import {
  captureInstagramList,
  getProfileUsername,
} from "./lib/instagram-dom";
import {
  applyCapture,
  canAppendCapture,
  isCompleteAnalysis,
} from "./lib/session";
import {
  clearAnalysis,
  loadAnalysis,
  saveAnalysis,
} from "./lib/storage";
import type {
  CaptureKind,
  CaptureProgress,
  StoredAnalysis,
} from "./types";

const captureLabels: Record<CaptureKind, string> = {
  followers: "seguidores",
  following: "contas seguidas",
};

function formatCaptureDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function useCurrentProfileUsername() {
  const [username, setUsername] = useState(() => getProfileUsername());

  useEffect(() => {
    const refresh = () => setUsername(getProfileUsername());
    const interval = window.setInterval(refresh, 500);
    window.addEventListener("popstate", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("popstate", refresh);
    };
  }, []);

  return username;
}

function App() {
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [captureKind, setCaptureKind] = useState<CaptureKind | null>(null);
  const [progress, setProgress] = useState<CaptureProgress | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const profileUsername = useCurrentProfileUsername();

  useEffect(() => {
    let active = true;

    loadAnalysis()
      .then((stored) => {
        if (active) setAnalysis(stored);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar as capturas salvas.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      abortController.current?.abort();
    };
  }, []);

  const result = useMemo(() => {
    if (!isCompleteAnalysis(analysis)) return null;

    return compareAccounts(
      analysis.captures.followers.accounts,
      analysis.captures.following.accounts,
    );
  }, [analysis]);

  const startCapture = async (kind: CaptureKind) => {
    const controller = new AbortController();
    abortController.current = controller;
    setCaptureKind(kind);
    setProgress(null);
    setError("");

    try {
      let captureBase = analysis;
      if (
        !profileUsername ||
        !canAppendCapture(analysis, profileUsername, kind)
      ) {
        if (analysis) {
          await clearAnalysis();
          setAnalysis(null);
        }
        captureBase = null;
      }

      const snapshot = await captureInstagramList(
        kind,
        { onProgress: setProgress },
        controller.signal,
      );
      const next = applyCapture(captureBase, snapshot);
      await saveAnalysis(next);
      setAnalysis(next);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Captura interrompida. Nenhuma lista incompleta foi salva.");
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "A captura não foi concluída. Nenhuma lista incompleta foi salva.",
        );
      }
    } finally {
      abortController.current = null;
      setCaptureKind(null);
      setProgress(null);
    }
  };

  const removeAllData = async () => {
    if (
      !window.confirm(
        "Apagar as capturas e a comparação salvas neste navegador?",
      )
    ) {
      return;
    }

    setError("");
    try {
      await clearAnalysis();
      setAnalysis(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível apagar as capturas salvas.",
      );
    }
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        className="minimized-button"
        onClick={() => setIsMinimized(false)}
        aria-label="Abrir 1nst4f0ll0w3rs"
      >
        1nst4<span>f0ll0w3rs</span>
      </button>
    );
  }

  return (
    <section className="extension-shell" aria-label="1nst4f0ll0w3rs">
      <header className="panel-header">
        <div>
          <div className="brand">
            1nst4<span>f0ll0w3rs</span>
          </div>
          <small>Comparação local no Instagram</small>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => setIsMinimized(true)}
          aria-label="Minimizar analisador"
        >
          —
        </button>
      </header>

      <main className="panel-body">
        <div className="intro">
          <span className="eyebrow">Sem exportar arquivos</span>
          <h1>Compare seguidores direto no perfil.</h1>
          <p>
            Capture Seguidores e Seguindo. A extensão percorre cada lista e
            faz a comparação localmente no seu navegador.
          </p>
        </div>

        {!profileUsername && (
          <div className="notice" role="status">
            Abra um perfil do Instagram para iniciar as capturas.
          </div>
        )}

        <div className="capture-grid">
          {(["followers", "following"] as const).map((kind) => {
            const snapshot = analysis?.captures[kind];
            const isActive = captureKind === kind;

            return (
              <article className="capture-card" key={kind}>
                <div>
                  <span>
                    {kind === "followers" ? "Seguidores" : "Seguindo"}
                  </span>
                  <strong>
                    {snapshot
                      ? snapshot.capturedTotal.toLocaleString("pt-BR")
                      : "—"}
                  </strong>
                  <small>
                    {snapshot
                      ? `Capturado em ${formatCaptureDate(snapshot.capturedAt)}`
                      : "Aguardando captura"}
                  </small>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    isLoading || captureKind !== null || !profileUsername
                  }
                  onClick={() => startCapture(kind)}
                >
                  {isActive
                    ? "Capturando…"
                    : snapshot
                      ? "Refazer captura"
                      : `Capturar ${captureLabels[kind]}`}
                </button>
              </article>
            );
          })}
        </div>

        {progress && (
          <div className="capture-progress" aria-live="polite">
            <div>
              <strong>{progress.message}</strong>
              <span>
                {progress.collected.toLocaleString("pt-BR")} contas capturadas
              </span>
            </div>
            <progress />
            <button
              type="button"
              className="text-button"
              onClick={() => abortController.current?.abort()}
            >
              Interromper captura
            </button>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <strong>Captura não concluída.</strong>
            <span>{error}</span>
          </div>
        )}

        {result && analysis ? (
          <Results
            result={result}
            accountUsername={analysis.accountUsername}
          />
        ) : (
          <div className="pending-state">
            <strong>Faça as duas capturas no mesmo perfil.</strong>
            <span>
              A comparação aparece quando Seguidores e Seguindo estiverem
              completos.
            </span>
          </div>
        )}

        {analysis && (
          <button
            type="button"
            className="danger-button"
            disabled={captureKind !== null}
            onClick={removeAllData}
          >
            Apagar capturas
          </button>
        )}
      </main>
    </section>
  );
}

export default App;
