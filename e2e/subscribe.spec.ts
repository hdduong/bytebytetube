import { expect, test, type Page } from "@playwright/test";
import { PlaywrightAgent } from "@midscene/web/playwright";

const channel = "/channel/midnight-marquee";
const watch = "/channel/midnight-marquee?v=the-hallway-that-never-ends";

function missingMidsceneEnv() {
  const missing: string[] = [];
  if (!process.env.MIDSCENE_MODEL_API_KEY && !process.env.OPENAI_API_KEY) missing.push("MIDSCENE_MODEL_API_KEY");
  if (!process.env.MIDSCENE_MODEL_NAME) missing.push("MIDSCENE_MODEL_NAME");
  if (!process.env.MIDSCENE_MODEL_BASE_URL && !process.env.OPENAI_BASE_URL) missing.push("MIDSCENE_MODEL_BASE_URL");
  return missing;
}

async function signIn(page: Page) {
  const email = process.env.SUBSCRIBE_TEST_EMAIL;
  const password = process.env.SUBSCRIBE_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("SUBSCRIBE_TEST_EMAIL and SUBSCRIBE_TEST_PASSWORD are required.");
  }
  await page.goto(`/login?next=${encodeURIComponent(channel)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/channel\/midnight-marquee\/?$/);
}

async function expectSubscribeHidden(page: Page) {
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Subscribed", exact: true })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(page.url()).not.toContain("/login");
}

test("signed-out channel and watch pages hide Subscribe", async ({ page }) => {
  await page.goto(channel);
  await expect(page.getByRole("heading", { level: 1, name: "Midnight Marquee" })).toBeVisible();
  await expectSubscribeHidden(page);

  await page.goto(watch);
  await expect(page.getByRole("heading", { level: 1, name: /The hallway that never ends/ })).toBeVisible();
  await expectSubscribeHidden(page);
});

test("signed-in subscribe launches balloons and unsubscribe shows one heart", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();

  await expect.poll(async () => page.locator("[data-balloon]").count()).toBeGreaterThanOrEqual(100);
  const fillMode = await page.locator("[data-balloon]").first().evaluate((node) => getComputedStyle(node).animationFillMode);
  expect(fillMode).toBe("both");
  await expect(page.getByRole("button", { name: "Subscribed", exact: true })).toBeVisible();
  await expect(page.locator("[data-broken-heart]")).toHaveCount(0);
  expect(page.url()).not.toContain("/login");

  await page.getByRole("button", { name: "Subscribed", exact: true }).click();
  await expect(page.locator("[data-broken-heart]")).toHaveCount(1);
  await expect(page.locator("[data-balloon]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto(watch);
  await expect(page.getByRole("button", { name: "Subscribe", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect.poll(async () => page.locator("[data-balloon]").count()).toBeGreaterThanOrEqual(100);
  await page.getByRole("button", { name: "Subscribed", exact: true }).click();
  await expect(page.locator("[data-broken-heart]")).toHaveCount(1);
  await expect(page.locator("[data-balloon]")).toHaveCount(0);
  expect(page.url()).toContain("/channel/midnight-marquee?v=the-hallway-that-never-ends");
});

test("Midscene describes subscribe, the burst, and the broken heart", async ({ page }) => {
  const missing = missingMidsceneEnv();
  test.skip(missing.length > 0, `Missing ${missing.join(", ")}`);

  const agent = new PlaywrightAgent(page);
  await page.goto(channel);
  await agent.aiAssert(
    "This is a channel page. There is no Subscribe button and no login modal is open.",
  );
  await expectSubscribeHidden(page);

  await signIn(page);
  await agent.aiAct("Click the Subscribe button in the channel header. Do not open a login page.");
  await agent.aiAssert(
    "Many balloon emojis are visible, the button reads Subscribed, and no login modal is open.",
  );
  await expect.poll(async () => page.locator("[data-balloon]").count()).toBeGreaterThanOrEqual(100);

  await agent.aiAct("Click the Subscribed button to unsubscribe. Do not sign out.");
  await agent.aiAssert("One broken heart is visible and there are no balloons. No login modal is open.");
  await expect(page.locator("[data-broken-heart]")).toHaveCount(1);
  await expect(page.locator("[data-balloon]")).toHaveCount(0);
});
