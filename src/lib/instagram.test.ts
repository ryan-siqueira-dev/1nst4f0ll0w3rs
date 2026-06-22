import JSZip from "jszip";
import { compareAccounts, parseInstagramZip } from "./instagram";

const entry = (username: string) => ({
  string_list_data: [
    {
      href: `https://www.instagram.com/${username}`,
      value: username,
      timestamp: 1_700_000_000,
    },
  ],
});

describe("compareAccounts", () => {
  it("separa contas não recíprocas e mútuas", () => {
    const result = compareAccounts({
      followers: [
        { username: "ana" },
        { username: "bruno" },
        { username: "carla" },
      ],
      following: [
        { username: "bruno" },
        { username: "carla" },
        { username: "diego" },
      ],
    });

    expect(result.notFollowingBack.map((item) => item.username)).toEqual([
      "diego",
    ]);
    expect(result.youDoNotFollowBack.map((item) => item.username)).toEqual([
      "ana",
    ]);
    expect(result.mutual.map((item) => item.username)).toEqual([
      "bruno",
      "carla",
    ]);
  });
});

describe("parseInstagramZip", () => {
  it("lê múltiplos arquivos de seguidores e remove duplicados", async () => {
    const zip = new JSZip();
    zip.file(
      "connections/followers_and_following/followers_1.json",
      JSON.stringify([entry("Ana"), entry("bruno")]),
    );
    zip.file(
      "connections/followers_and_following/followers_2.json",
      JSON.stringify([entry("ana"), entry("carla")]),
    );
    zip.file(
      "connections/followers_and_following/following.json",
      JSON.stringify({
        relationships_following: [entry("bruno"), entry("diego")],
      }),
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "instagram.zip", {
      type: "application/zip",
    });
    const result = await parseInstagramZip(file);

    expect(result.followers.map((item) => item.username)).toEqual([
      "ana",
      "bruno",
      "carla",
    ]);
    expect(result.following.map((item) => item.username)).toEqual([
      "bruno",
      "diego",
    ]);
  });

  it("rejeita ZIP sem os arquivos necessários", async () => {
    const zip = new JSZip();
    zip.file("profile.json", "{}");
    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "instagram.zip");

    await expect(parseInstagramZip(file)).rejects.toThrow(
      "não contém os arquivos",
    );
  });
});
