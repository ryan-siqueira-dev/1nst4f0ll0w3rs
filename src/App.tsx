import { useState } from "react";
import { Results } from "./components/Results";
import { UploadZone } from "./components/UploadZone";
import { compareAccounts, parseInstagramZip } from "./lib/instagram";
import type { ComparisonResult } from "./types";

function App() {
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const analyze = async (file: File) => {
    setError("");
    setIsLoading(true);

    try {
      const data = await parseInstagramZip(file);
      setResult(compareAccounts(data));
      setFilename(file.name);
    } catch (cause) {
      setResult(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Ocorreu um erro inesperado ao processar o arquivo.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Página inicial">
          1nst4<span>f0ll0w3rs</span>
        </a>
        <span className="privacy-badge">100% local e privado</span>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Análise segura do Instagram</span>
            <h1>Descubra quem não segue você de volta.</h1>
            <p>
              Use a exportação oficial do Instagram. A análise acontece
              somente no seu navegador — sem login, senha ou upload para
              servidores.
            </p>
          </div>

          <UploadZone disabled={isLoading} onFile={analyze} />

          {error && (
            <div className="error-message" role="alert">
              <strong>Não foi possível analisar o arquivo.</strong>
              <span>{error}</span>
            </div>
          )}
        </section>

        {result ? (
          <Results result={result} filename={filename} />
        ) : (
          <section className="instructions">
            <div>
              <span className="step-number">01</span>
              <h2>Solicite seus dados</h2>
              <p>
                No Instagram, acesse Central de Contas → Suas informações e
                permissões → Baixar suas informações.
              </p>
            </div>
            <div>
              <span className="step-number">02</span>
              <h2>Escolha o formato JSON</h2>
              <p>
                Selecione “Seguidores e seguindo”, período desde o início e
                formato JSON.
              </p>
            </div>
            <div>
              <span className="step-number">03</span>
              <h2>Analise o ZIP</h2>
              <p>
                Não descompacte o arquivo. Arraste o ZIP recebido para a área
                acima e veja o resultado.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer>
        <p>
          Este projeto não é afiliado ao Instagram ou à Meta. Seus arquivos
          nunca saem do dispositivo.
        </p>
      </footer>
    </>
  );
}

export default App;
