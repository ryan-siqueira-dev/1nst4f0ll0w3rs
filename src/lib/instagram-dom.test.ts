import {
  captureInstagramList,
  extractProfileAccounts,
  findListTrigger,
  getProfileUsername,
} from "./instagram-dom";

const captureOptions = {
  document,
  locationHref: "https://www.instagram.com/ryan/",
  pollIntervalMs: 1,
  noProgressTimeoutMs: 20,
  totalTimeoutMs: 500,
  completionStabilityMs: 3,
};

function addTrigger(
  kind: "followers" | "following",
  label: string,
  dialogHtml: string,
) {
  document.body.innerHTML = `
    <a id="trigger" href="/ryan/${kind}/">${label}</a>
  `;
  document
    .querySelector<HTMLAnchorElement>("#trigger")!
    .addEventListener("click", (event) => {
      event.preventDefault();
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.innerHTML = dialogHtml;
      document.body.append(dialog);
    });
}

describe("Instagram DOM", () => {
  it("reconhece páginas de perfil", () => {
    expect(getProfileUsername("https://www.instagram.com/Ryan.DGK/")).toBe(
      "ryan.dgk",
    );
    expect(getProfileUsername("https://www.instagram.com/explore/")).toBeNull();
    expect(getProfileUsername("https://www.instagram.com/p/ABC123/")).toBeNull();
  });

  it("localiza links e botões de seguidores", () => {
    document.body.innerHTML = `
      <button aria-label="seguidores">Abrir seguidores</button>
      <a href="/ryan.dgk/following/">seguindo</a>
    `;

    expect(
      findListTrigger(document, "ryan.dgk", "followers")?.tagName,
    ).toBe("BUTTON");
    expect(
      findListTrigger(document, "ryan.dgk", "following")?.tagName,
    ).toBe("A");
  });

  it("extrai perfis e ignora rotas internas", () => {
    document.body.innerHTML = `
      <a href="/Ana/">Ana</a>
      <a href="https://www.instagram.com/_u/bruno">Bruno</a>
      <a href="/explore/">Explorar</a>
      <a href="/direct/inbox/">Mensagens</a>
    `;

    expect(extractProfileAccounts(document)).toEqual([
      { username: "ana" },
      { username: "bruno" },
    ]);
  });

  it("ignora perfis depois da seção de sugestões", () => {
    document.body.innerHTML = `
      <a href="/ana/">ana</a>
      <a href="/bruno/">bruno</a>
      <h3>Sugestões para você</h3>
      <a href="/carla/">carla</a>
    `;

    expect(extractProfileAccounts(document)).toEqual([
      { username: "ana" },
      { username: "bruno" },
    ]);
  });

  it("acumula itens de uma lista virtualizada até estabilizar no fim", async () => {
    document.body.innerHTML = `
      <a id="trigger" href="/ryan/followers/">qualquer contagem</a>
    `;
    document
      .querySelector<HTMLAnchorElement>("#trigger")!
      .addEventListener("click", (event) => {
        event.preventDefault();
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        dialog.innerHTML = `
          <a href="/ana/">ana</a>
          <a href="/bruno/">bruno</a>
        `;
        dialog.addEventListener(
          "scroll",
          () => {
            dialog.innerHTML = `
              <a href="/bruno/">bruno</a>
              <a href="/carla/">carla</a>
            `;
          },
          { once: true },
        );
        document.body.append(dialog);
      });

    const result = await captureInstagramList(
      "followers",
      {},
      undefined,
      captureOptions,
    );

    expect(result.capturedTotal).toBe(3);
    expect(result.accounts).toEqual([
      { username: "ana" },
      { username: "bruno" },
      { username: "carla" },
    ]);
  });

  it("ignora a contagem do perfil quando ela é menor que a lista", async () => {
    addTrigger(
      "followers",
      "1 seguidor",
      `
        <a href="/ana/">ana</a>
        <a href="/bruno/">bruno</a>
      `,
    );

    const result = await captureInstagramList(
      "followers",
      {},
      undefined,
      captureOptions,
    );

    expect(result.capturedTotal).toBe(2);
  });

  it("ignora mudanças na contagem durante a captura", async () => {
    document.body.innerHTML = `
      <a id="trigger" href="/ryan/followers/">1 seguidor</a>
    `;
    const trigger = document.querySelector<HTMLAnchorElement>("#trigger")!;
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const dialog = document.createElement("div");
      dialog.setAttribute("role", "dialog");
      dialog.innerHTML = `<a href="/ana/">ana</a>`;
      dialog.addEventListener(
        "scroll",
        () => {
          trigger.textContent = "999 seguidores";
        },
        { once: true },
      );
      document.body.append(dialog);
    });

    const result = await captureInstagramList(
      "followers",
      {},
      undefined,
      captureOptions,
    );

    expect(result.accounts).toEqual([{ username: "ana" }]);
  });

  it("ignora diálogos anteriores e o próprio perfil", async () => {
    document.body.innerHTML = `
      <div role="dialog"><a href="/extra/">extra</a></div>
      <a id="trigger" href="/ryan/followers/">seguidores</a>
    `;
    document
      .querySelector<HTMLAnchorElement>("#trigger")!
      .addEventListener("click", (event) => {
        event.preventDefault();
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        dialog.innerHTML = `
          <a href="/ryan/">cabeçalho</a>
          <a href="/ana/">ana</a>
        `;
        document.body.append(dialog);
      });

    const result = await captureInstagramList(
      "followers",
      {},
      undefined,
      captureOptions,
    );

    expect(result.accounts).toEqual([{ username: "ana" }]);
  });

  it("coleta o perfil principal de cada linha em seguindo", async () => {
    addTrigger(
      "following",
      "seguindo",
      `
        <div>
          <div>
            <a href="/ana/">ana</a>
            <span>Seguido por <a href="/secundaria/">outra</a></span>
          </div>
          <button>Seguindo</button>
        </div>
        <div>
          <a href="/bruno/">bruno</a>
          <button>Following</button>
        </div>
      `,
    );

    const result = await captureInstagramList(
      "following",
      {},
      undefined,
      captureOptions,
    );

    expect(result.accounts).toEqual([
      { username: "ana" },
      { username: "bruno" },
    ]);
  });

  it("não volta ao fallback após detectar linhas em seguindo", async () => {
    document.body.innerHTML = `
      <a id="trigger" href="/ryan/following/">seguindo</a>
    `;
    document
      .querySelector<HTMLAnchorElement>("#trigger")!
      .addEventListener("click", (event) => {
        event.preventDefault();
        const dialog = document.createElement("div");
        dialog.setAttribute("role", "dialog");
        dialog.innerHTML = `
          <div>
            <a href="/ana/">ana</a>
            <button>Seguindo</button>
          </div>
        `;
        dialog.addEventListener(
          "scroll",
          () => {
            dialog.innerHTML = `
              <a href="/bruno/">bruno</a>
              <a href="/secundaria/">secundária</a>
            `;
          },
          { once: true },
        );
        document.body.append(dialog);
      });

    await expect(
      captureInstagramList("following", {}, undefined, {
        ...captureOptions,
        noProgressTimeoutMs: 5,
        totalTimeoutMs: 100,
      }),
    ).rejects.toThrow("sem confirmar o final da lista");
  });
});
