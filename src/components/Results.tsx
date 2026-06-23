import { useMemo, useState } from "react";
import { downloadCsv } from "../lib/csv";
import type {
  ComparisonResult,
  InstagramAccount,
  ResultCategory,
} from "../types";

interface ResultsProps {
  result: ComparisonResult;
  accountUsername: string;
}

const categories: Array<{
  key: ResultCategory;
  label: string;
  description: string;
  csvName: string;
}> = [
  {
    key: "notFollowingBack",
    label: "Não seguem de volta",
    description: "Estão em Seguindo, mas não em Seguidores.",
    csvName: "nao-seguem-de-volta.csv",
  },
  {
    key: "youDoNotFollowBack",
    label: "Você não segue de volta",
    description: "Estão em Seguidores, mas não em Seguindo.",
    csvName: "voce-nao-segue-de-volta.csv",
  },
  {
    key: "mutual",
    label: "Mútuos",
    description: "Estão presentes nas duas listas.",
    csvName: "seguidores-mutuos.csv",
  },
];

function AccountRow({ account }: { account: InstagramAccount }) {
  return (
    <li>
      <span>@{account.username}</span>
      <a
        href={`https://instagram.com/${account.username}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir perfil de ${account.username}`}
      >
        Abrir ↗
      </a>
    </li>
  );
}

export function Results({ result, accountUsername }: ResultsProps) {
  const [active, setActive] =
    useState<ResultCategory>("notFollowingBack");
  const [query, setQuery] = useState("");
  const category = categories.find((item) => item.key === active)!;
  const accounts = result[active];
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().replace(/^@/, "").toLocaleLowerCase();
    if (!normalizedQuery) return accounts;
    return accounts.filter((account) =>
      account.username.includes(normalizedQuery),
    );
  }, [accounts, query]);

  return (
    <section className="results" aria-live="polite">
      <div className="result-heading">
        <span className="eyebrow">Comparação concluída</span>
        <h2>@{accountUsername}</h2>
      </div>

      <div className="summary-grid">
        {categories.map((item) => (
          <button
            type="button"
            className={`summary-card ${active === item.key ? "active" : ""}`}
            key={item.key}
            onClick={() => {
              setActive(item.key);
              setQuery("");
            }}
          >
            <span>{item.label}</span>
            <strong>{result[item.key].length.toLocaleString("pt-BR")}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="list-panel">
        <div className="list-toolbar">
          <div>
            <h3>{category.label}</h3>
            <p>{filtered.length.toLocaleString("pt-BR")} contas</p>
          </div>
          <div className="toolbar-actions">
            <label className="search">
              <span className="sr-only">Buscar usuário</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar conta"
              />
            </label>
            <button
              type="button"
              className="secondary-button"
              disabled={accounts.length === 0}
              onClick={() => downloadCsv(accounts, category.csvName)}
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {filtered.length > 0 ? (
          <ul className="account-list">
            {filtered.map((account) => (
              <AccountRow key={account.username} account={account} />
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            {query
              ? "Nenhum usuário corresponde à busca."
              : "Nenhuma conta nesta categoria."}
          </div>
        )}
      </div>
    </section>
  );
}
