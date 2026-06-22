import type { InstagramAccount } from "../types";

function escapeCsv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function accountsToCsv(accounts: InstagramAccount[]): string {
  const rows = accounts.map((account) =>
    [
      escapeCsv(account.username),
      escapeCsv(`https://instagram.com/${account.username}`),
    ].join(","),
  );

  return ["usuario,perfil", ...rows].join("\n");
}

export function downloadCsv(accounts: InstagramAccount[], filename: string) {
  const blob = new Blob(["\uFEFF", accountsToCsv(accounts)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
