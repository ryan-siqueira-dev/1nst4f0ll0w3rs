import { accountsToCsv } from "./csv";

describe("accountsToCsv", () => {
  it("gera CSV com cabeçalho e links de perfil", () => {
    expect(accountsToCsv([{ username: "ana" }])).toBe(
      'usuario,perfil\n"ana","https://instagram.com/ana"',
    );
  });
});
