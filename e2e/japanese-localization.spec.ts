import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test("offers Hasher, Tune Toolbox, and Fret Finder completely in Japanese", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7"]);

  await page.getByRole("button", { name: "JP", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  const nav = page.getByRole("navigation", { name: "ワークスペース" });
  await expect(nav.getByRole("button")).toHaveCount(3);
  await expect(nav.getByRole("button", { name: "ハッシャー", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "チューン・ツールボックス", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "フレット・ファインダー", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "ハッシャーの入力モード" })).toBeVisible();
  await expect(page.getByRole("button", { name: "コード進行を共有" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: /ムード/ })).toHaveCount(0);

  await page.getByRole("button", { name: "コード進行を共有" }).click();
  await expect(page.getByRole("dialog", { name: "このコード進行を共有" })).toBeVisible();
  await expect(page.getByLabel("共有用コード進行リンク")).toBeVisible();
  await page.getByRole("button", { name: "共有パネルを閉じる" }).click();

  const card = page.getByTestId("chord-card");
  await card.getByRole("button", { name: "Cmaj7を変更" }).click();
  await expect(card.getByRole("region", { name: "Cmaj7のコードを変更" })).toBeVisible();
  await expect(card.getByLabel("クイック・コード変更")).toBeVisible();
  await page.keyboard.press("Escape");

  await nav.getByRole("button", { name: "チューン・ツールボックス", exact: true }).click();
  await expect(page.getByRole("heading", { name: "チューン・ツールボックス", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "五度圏", level: 2 })).toBeVisible();
  await page.locator("#theory-mood").selectOption("dark");
  await expect(page.locator("#theory-mood")).toHaveValue("dark");
  const circleRelationships = page.getByTestId("circle-of-fifths")
    .getByRole("heading", { name: "関係" })
    .locator("..");
  await expect(circleRelationships).toContainText("中程度の関係");
  await expect(circleRelationships).toContainText("弱い関係");
  await expect(circleRelationships).not.toContainText(/medium|weak|高適合/);
  await page.locator("#theory-root").selectOption("C#");
  await expect(page.getByTestId("circle-of-fifths")).toContainText("♯7個");
  await page.locator("#theory-root").selectOption("C");

  const scaleDisclosure = page.getByRole("button", { name: /スケール・シンセシア/ }).first();
  await scaleDisclosure.click();
  await expect(page.getByTestId("scale-synthesia")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "ムード・レンズ：暗い" })).toBeVisible();
  const networkDisclosure = page.getByRole("button", { name: /ノート・ニューラル・ネットワーク/ }).first();
  await networkDisclosure.click();
  const network = page.getByTestId("note-neural-network");
  await expect(network).toBeVisible();
  await expect(network).toHaveAccessibleName("ノート・ニューラル・ネットワーク");
  await expect(network.getByRole("img", { name: "Cの関係ネットワーク" })).toBeVisible();
  await expect(network.getByRole("combobox", { name: "系統" })).toBeVisible();
  await expect(network.getByRole("group", { name: "関係" })
    .getByRole("button", { name: "平行調" })).toHaveAttribute("aria-pressed", "true");
  const japaneseNodes = network.getByRole("list", { name: "ネットワークのノード" });
  await expect(japaneseNodes.getByRole("button", { name: "C メジャー（アイオニアン）" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(network.getByRole("complementary", { name: "C メジャー（アイオニアン）の詳細" }))
    .toBeVisible();
  await expect(network.getByLabel("関係の強さの凡例")).toBeVisible();

  await nav.getByRole("button", { name: "フレット・ファインダー", exact: true }).click();
  await expect(page.getByRole("heading", { name: "フレットボード・エクスプローラー", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "フレットボード設定" })).toBeVisible();
  await expectNoDocumentOverflow(page);
});
