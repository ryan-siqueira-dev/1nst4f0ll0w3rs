import { normalizeUsername } from "./comparison";
import type {
  CaptureKind,
  CaptureProgress,
  CaptureSnapshot,
  InstagramAccount,
} from "../types";

const RESERVED_ROUTES = new Set([
  "about",
  "accounts",
  "api",
  "challenge",
  "developer",
  "direct",
  "directory",
  "emails",
  "explore",
  "legal",
  "notes",
  "p",
  "privacy",
  "reel",
  "reels",
  "stories",
  "terms",
  "tv",
  "web",
]);

const DEFAULT_NO_PROGRESS_TIMEOUT = 15_000;
const DEFAULT_TOTAL_TIMEOUT = 5 * 60_000;
const DEFAULT_POLL_INTERVAL = 400;
const DEFAULT_COMPLETION_STABILITY = 5_000;

interface CaptureOptions {
  document?: Document;
  locationHref?: string;
  noProgressTimeoutMs?: number;
  totalTimeoutMs?: number;
  pollIntervalMs?: number;
  completionStabilityMs?: number;
}

interface CaptureCallbacks {
  onProgress?: (progress: CaptureProgress) => void;
}

export class CaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureError";
  }
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Captura cancelada.", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Captura cancelada.", "AbortError"));
      },
      { once: true },
    );
  });
}

function pathnameFromHref(href: string): string | null {
  try {
    return new URL(href, "https://www.instagram.com").pathname;
  } catch {
    return null;
  }
}

export function getProfileUsername(locationHref = window.location.href) {
  const pathname = pathnameFromHref(locationHref);
  const segment = pathname?.split("/").filter(Boolean)[0];
  if (!segment) return null;

  const username = normalizeUsername(segment);
  if (
    !/^[a-z0-9._]+$/.test(username) ||
    RESERVED_ROUTES.has(username)
  ) {
    return null;
  }

  return username;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function elementText(element: HTMLElement): string {
  return normalizeText(
    [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.textContent,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function elementMatchesListRoute(
  element: HTMLElement,
  profileUsername: string,
  kind: CaptureKind,
): boolean {
  const href = element.getAttribute("href");
  if (!href) return false;

  const pathname = pathnameFromHref(href);
  if (!pathname) return false;

  const parts = pathname.split("/").filter(Boolean).map(normalizeUsername);
  const listIndex = parts.lastIndexOf(kind);

  return (
    listIndex >= 0 &&
    (listIndex === 0 || parts[listIndex - 1] === profileUsername)
  );
}

function elementMatchesListText(
  element: HTMLElement,
  kind: CaptureKind,
): boolean {
  const text = elementText(element);
  const terms =
    kind === "followers"
      ? ["seguidor", "seguidores", "follower", "followers"]
      : ["seguindo", "following"];

  return terms.some((term) => {
    const pattern = new RegExp(`(^|\\s)${term}(\\s|$)`, "i");
    return pattern.test(text);
  });
}

export function findListTrigger(
  document: Document,
  profileUsername: string,
  kind: CaptureKind,
): HTMLElement | null {
  const candidates = [
    ...document.querySelectorAll<HTMLElement>(
      "a[href], button, [role='button'], [tabindex='0']",
    ),
  ];
  const routeMatch = candidates.find((element) =>
    elementMatchesListRoute(element, profileUsername, kind),
  );
  if (routeMatch) return routeMatch;

  return (
    candidates.find(
      (element) => elementMatchesListText(element, kind),
    ) ?? null
  );
}

function usernameFromProfileHref(href: string): string | null {
  const pathname = pathnameFromHref(href);
  const parts = pathname?.split("/").filter(Boolean);
  if (!parts) return null;

  const rawUsername =
    parts.length === 1
      ? parts[0]
      : parts.length === 2 && parts[0] === "_u"
        ? parts[1]
        : null;
  if (!rawUsername) return null;

  const username = normalizeUsername(rawUsername);
  if (
    !/^[a-z0-9._]+$/.test(username) ||
    RESERVED_ROUTES.has(username)
  ) {
    return null;
  }

  return username;
}

const SUGGESTION_BOUNDARY_TERMS = [
  "sugestoes para voce",
  "sugestoes",
  "recomendacoes para voce",
  "descobrir pessoas",
  "suggested for you",
  "suggestions for you",
  "suggested",
  "discover people",
  "recommended for you",
];

function findSuggestionBoundary(root: ParentNode): Node | null {
  const document =
    root instanceof Document ? root : root.ownerDocument;
  if (!document) return null;

  const showText = document.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = document.createTreeWalker(root, showText);
  let node = walker.nextNode();

  while (node) {
    const text = normalizeText(node.textContent ?? "");
    if (
      text.length > 0 &&
      text.length <= 80 &&
      SUGGESTION_BOUNDARY_TERMS.some(
        (term) => text === term || text.startsWith(`${term} `),
      )
    ) {
      return node;
    }
    node = walker.nextNode();
  }

  return null;
}

interface ProfileAccountScan {
  accounts: InstagramAccount[];
  rowAccounts: InstagramAccount[];
  reachedSuggestions: boolean;
}

function isBeforeBoundary(element: Node, boundary: Node | null): boolean {
  if (!boundary) return true;
  const view = element.ownerDocument?.defaultView;
  const followingPosition = view?.Node.DOCUMENT_POSITION_FOLLOWING ?? 4;
  return Boolean(element.compareDocumentPosition(boundary) & followingPosition);
}

function profileUsernamesIn(element: ParentNode): string[] {
  const usernames: string[] = [];

  for (const link of element.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const username = usernameFromProfileHref(link.href);
    if (username && !usernames.includes(username)) usernames.push(username);
  }

  return usernames;
}

function primaryAccountsFromFollowingRows(
  root: ParentNode,
  boundary: Node | null,
): string[] {
  const usernames = new Set<string>();
  const actionTerms = [
    "seguindo",
    "following",
    "solicitado",
    "requested",
  ];
  const controls = root.querySelectorAll<HTMLElement>(
    "button, [role='button']",
  );

  for (const control of controls) {
    if (!isBeforeBoundary(control, boundary)) continue;

    const text = elementText(control);
    if (
      !actionTerms.some(
        (term) =>
          text === term ||
          text.startsWith(`${term} `) ||
          text.endsWith(` ${term}`),
      )
    ) {
      continue;
    }

    let row: HTMLElement | null = control.parentElement;
    while (row && row !== root) {
      const candidates = profileUsernamesIn(row);
      if (candidates.length > 0) {
        usernames.add(candidates[0]);
        break;
      }
      row = row.parentElement;
    }
  }

  return [...usernames];
}

function scanProfileAccounts(
  root: ParentNode,
): ProfileAccountScan {
  const boundary = findSuggestionBoundary(root);
  const usernames = new Set<string>();
  const rowUsernames = new Set(
    primaryAccountsFromFollowingRows(root, boundary),
  );

  for (const link of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (!isBeforeBoundary(link, boundary)) continue;

    const username = usernameFromProfileHref(link.href);
    if (username) usernames.add(username);
  }

  return {
    accounts: [...usernames]
      .sort((a, b) => a.localeCompare(b))
      .map((username) => ({ username })),
    rowAccounts: [...rowUsernames]
      .sort((a, b) => a.localeCompare(b))
      .map((username) => ({ username })),
    reachedSuggestions: boundary !== null,
  };
}

export function extractProfileAccounts(root: ParentNode): InstagramAccount[] {
  return scanProfileAccounts(root).accounts;
}

export function findScrollContainer(dialog: HTMLElement): HTMLElement {
  const candidates = [dialog, ...dialog.querySelectorAll<HTMLElement>("*")]
    .filter(
      (element) =>
        element.clientHeight > 80 &&
        element.scrollHeight - element.clientHeight > 8,
    )
    .sort(
      (a, b) =>
        b.scrollHeight - b.clientHeight - (a.scrollHeight - a.clientHeight),
    );

  return candidates[0] ?? dialog;
}

async function waitForDialog(
  document: Document,
  existingDialogs: Set<HTMLElement>,
  signal: AbortSignal | undefined,
  timeoutMs: number,
  pollIntervalMs: number,
): Promise<HTMLElement> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const dialog = [
      ...document.querySelectorAll<HTMLElement>('[role="dialog"]'),
    ].find(
      (candidate) =>
        !existingDialogs.has(candidate) &&
        !candidate.hidden &&
        candidate.getAttribute("aria-hidden") !== "true",
    );
    if (dialog) return dialog;
    await sleep(pollIntervalMs, signal);
  }

  throw new CaptureError(
    "O Instagram não abriu a lista. Confirme que o perfil está carregado e tente novamente.",
  );
}

function closeDialog(document: Document, dialog: HTMLElement) {
  const closeButton = [
    ...dialog.querySelectorAll<HTMLElement>("button, [role='button']"),
  ].find((element) =>
    /^(close|fechar)$/i.test(
      element.getAttribute("aria-label")?.trim() ?? "",
    ),
  );

  if (closeButton) {
    closeButton.click();
    return;
  }

  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
    }),
  );
}

export async function captureInstagramList(
  kind: CaptureKind,
  callbacks: CaptureCallbacks = {},
  signal?: AbortSignal,
  options: CaptureOptions = {},
): Promise<CaptureSnapshot> {
  const document = options.document ?? window.document;
  const locationHref = options.locationHref ?? window.location.href;
  const pollIntervalMs =
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
  const noProgressTimeoutMs =
    options.noProgressTimeoutMs ?? DEFAULT_NO_PROGRESS_TIMEOUT;
  const totalTimeoutMs = options.totalTimeoutMs ?? DEFAULT_TOTAL_TIMEOUT;
  const completionStabilityMs =
    options.completionStabilityMs ?? DEFAULT_COMPLETION_STABILITY;
  const accountUsername = getProfileUsername(locationHref);

  if (!accountUsername) {
    throw new CaptureError(
      "Abra um perfil do Instagram antes de iniciar a captura.",
    );
  }

  const trigger = findListTrigger(document, accountUsername, kind);
  if (!trigger) {
    throw new CaptureError(
      `Não foi possível localizar a lista de ${
        kind === "followers" ? "seguidores" : "contas seguidas"
      } no perfil @${accountUsername}. Recarregue a página do perfil e tente novamente.`,
    );
  }

  callbacks.onProgress?.({
    kind,
    collected: 0,
    message: "Abrindo lista…",
  });

  const existingDialogs = new Set(
    document.querySelectorAll<HTMLElement>('[role="dialog"]'),
  );
  trigger.click();
  const dialog = await waitForDialog(
    document,
    existingDialogs,
    signal,
    Math.min(noProgressTimeoutMs, 10_000),
    pollIntervalMs,
  );
  const startedAt = Date.now();
  let lastProgressAt = startedAt;
  let previousCount = -1;
  let stableEndSince: number | null = null;
  let reachedSuggestions = false;
  let followingRowsDetected = false;
  const capturedUsernames = new Set<string>();

  try {
    while (Date.now() - startedAt < totalTimeoutMs) {
      if (!dialog.isConnected) {
        throw new CaptureError(
          "A lista foi fechada antes do término da captura.",
        );
      }

      const scrollContainer = findScrollContainer(dialog);
      const scan = scanProfileAccounts(scrollContainer);
      reachedSuggestions ||= scan.reachedSuggestions;

      if (
        kind === "following" &&
        !followingRowsDetected &&
        scan.rowAccounts.length > 0
      ) {
        followingRowsDetected = true;
        capturedUsernames.clear();
        previousCount = -1;
        stableEndSince = null;
        lastProgressAt = Date.now();
      }

      const accounts =
        kind === "following" && followingRowsDetected
          ? scan.rowAccounts
          : scan.accounts;

      for (const account of accounts) {
        if (account.username !== accountUsername) {
          const sizeBefore = capturedUsernames.size;
          capturedUsernames.add(account.username);
          if (capturedUsernames.size > sizeBefore) {
            lastProgressAt = Date.now();
          }
        }
      }

      const collected = capturedUsernames.size;

      if (collected !== previousCount) {
        previousCount = collected;
        lastProgressAt = Date.now();
        stableEndSince = null;
      }

      callbacks.onProgress?.({
        kind,
        collected,
        message: "Percorrendo a lista…",
      });

      const isAtBottom =
        reachedSuggestions ||
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
          scrollContainer.scrollHeight - 8;
      const hasIncompleteFollowingRows =
        kind === "following" &&
        followingRowsDetected &&
        scan.rowAccounts.length === 0 &&
        scan.accounts.length > 0;
      const canConfirmEnd = isAtBottom && !hasIncompleteFollowingRows;

      if (canConfirmEnd && collected === previousCount) {
        stableEndSince ??= Date.now();
        callbacks.onProgress?.({
          kind,
          collected,
          message: "Confirmando o final da lista…",
        });

        if (Date.now() - stableEndSince >= completionStabilityMs) {
          return {
            kind,
            accountUsername,
            capturedAt: new Date().toISOString(),
            capturedTotal: collected,
            accounts: [...capturedUsernames]
              .sort((a, b) => a.localeCompare(b))
              .map((username) => ({ username })),
          };
        }
      } else {
        stableEndSince = null;
      }

      if (
        (!isAtBottom || hasIncompleteFollowingRows) &&
        Date.now() - lastProgressAt >= noProgressTimeoutMs
      ) {
        throw new CaptureError(
          `A captura parou após encontrar ${collected} contas sem confirmar o final da lista. Verifique a conexão e tente novamente.`,
        );
      }

      if (!reachedSuggestions) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
      }

      await sleep(pollIntervalMs, signal);
    }

    throw new CaptureError(
      "A captura excedeu cinco minutos e foi interrompida. Nenhuma lista incompleta foi salva.",
    );
  } finally {
    closeDialog(document, dialog);
  }
}
