import { expect, test, type Page } from "@playwright/test";

const channel = "/channel/midnight-marquee";
const watch = "/channel/midnight-marquee?v=the-hallway-that-never-ends";

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
