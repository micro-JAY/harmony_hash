import { expect, test, type Page } from "@playwright/test";
import { composeProgression } from "./helpers/progression";

async function expectNoDocumentOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
}

test("offers the builder and every learning tool in Japanese", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await composeProgression(page, ["Cmaj7"]);

  await page.getByRole("button", { name: "JP", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByRole("navigation", { name: "ワークスペース" })).toBeVisible();
  await expect(page.getByRole("group", { name: "ハッシャーの入力モード" })).toBeVisible();
  await expect(page.getByRole("button", { name: "コード進行を共有" })).toBeVisible();
  await page.getByRole("combobox", { name: "ムード／ジャンル・レンズ" }).selectOption("dark");

  await page.getByRole("button", { name: "コード進行を共有" }).click();
  await expect(page.getByRole("dialog", { name: "このコード進行を共有" })).toBeVisible();
  await expect(page.getByLabel("共有用コード進行リンク")).toBeVisible();
  await page.getByRole("button", { name: "共有パネルを閉じる" }).click();

  const card = page.getByTestId("chord-card");
  await card.getByRole("button", { name: "Cmaj7を変更" }).click();
  await expect(card.getByRole("region", { name: "Cmaj7のコードを変更" })).toBeVisible();
  await expect(card.getByLabel("クイック・コード変更")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "コード進行", exact: true }).click();
  await page.getByRole("button", { name: "Improv Insight", exact: true }).click();
  await expect(page.getByText(/コード進行の固有音\d+音中\d+音をカバー/).first()).toBeVisible();
  await expect(page.getByTestId("improv-mood-summary")).toContainText("ムード・レンズ：暗い");

  await page.getByRole("button", { name: "指板", exact: true }).click();
  await expect(page.getByRole("heading", { name: "フレットボード・エクスプローラー", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "フレットボード設定" })).toBeVisible();

  await page.getByRole("button", { name: "五度圏", exact: true }).click();
  await expect(page.getByRole("heading", { name: "五度圏", level: 1 })).toBeVisible();
  await expect(page.getByText("ダイアトニック・コード", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "スケール", exact: true }).click();
  await expect(page.getByRole("heading", { name: "スケール・シンセシア", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "スケール練習設定" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("ムード・レンズ：暗い");
  await expect(page.getByText("ネオクラシカル・メタル・フラメンコ・劇的な短調の緊張感", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "音の関係", exact: true }).click();
  await expect(page.getByRole("heading", { name: "ノート・ニューラル・ネットワーク", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "モード・ネットワーク設定" })).toBeVisible();
  await expect(page.getByText("E ハーモニック・マイナー", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("短調の主和音とドミナントからマイナーへの解決", { exact: true })).toBeVisible();

  await expectNoDocumentOverflow(page);
});
