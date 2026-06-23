import { compareAccounts, normalizeUsername, uniqueAccounts } from "./comparison";

describe("normalizeUsername", () => {
  it("remove arroba, espaços e diferenças de caixa", () => {
    expect(normalizeUsername(" @Ana.Silva ")).toBe("ana.silva");
  });
});

describe("uniqueAccounts", () => {
  it("normaliza, ordena e remove duplicados", () => {
    expect(
      uniqueAccounts([
        { username: "Bruno" },
        { username: "@ana" },
        { username: "bruno" },
      ]),
    ).toEqual([{ username: "ana" }, { username: "bruno" }]);
  });
});

describe("compareAccounts", () => {
  it("separa contas não recíprocas e mútuas", () => {
    const result = compareAccounts(
      [
        { username: "ana" },
        { username: "bruno" },
        { username: "carla" },
      ],
      [
        { username: "bruno" },
        { username: "carla" },
        { username: "diego" },
      ],
    );

    expect(result.notFollowingBack).toEqual([{ username: "diego" }]);
    expect(result.youDoNotFollowBack).toEqual([{ username: "ana" }]);
    expect(result.mutual).toEqual([
      { username: "bruno" },
      { username: "carla" },
    ]);
  });
});
