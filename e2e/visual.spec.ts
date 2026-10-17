import { expect, test, type Page } from "@playwright/test";
import { blockedModelRequestCount, createLocalClipAgent } from "./local-clip";

const channel = "/channel/midnight-marquee";

test.describe.configure({ timeout: 240_000 });

function testAccount() {
  const email = process.env.SUBSCRIBE_TEST_EMAIL;
  const password = process.env.SUBSCRIBE_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("SUBSCRIBE_TEST_EMAIL and SUBSCRIBE_TEST_PASSWORD are required.");
  }
  return { email, password };
}

async function signIn(page: Page) {
  const { email, password } = testAccount();
  await page.goto(`/login?next=${encodeURIComponent(channel)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/channel\/midnight-marquee\/?$/);
}

async function waitForVisibleImages(page: Page) {
  await page.waitForFunction(
    () => {
      const visible = [...document.images].filter((img) => {
        const box = img.getBoundingClientRect();
        return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight;
      });
      return visible.length > 0 && visible.every((img) => img.complete);
    },
    undefined,
    { timeout: 20_000 },
  );
}

test("home page matches a search field and video listing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByPlaceholder("Search movies, reviews, and creators")).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
  await waitForVisibleImages(page);

  const agent = await createLocalClipAgent(page);
  const similarity = await agent.aiAssert(
    "A video website homepage with a search field at the top and a grid of video thumbnails",
  );
  console.log(`CLIP layout similarity: ${similarity.toFixed(4)}`);
  expect(blockedModelRequestCount()).toBe(0);
});

test("signed-out like redirects to login", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("article").first();
  await expect(card).toBeVisible();
  await card.hover();
  await card.getByLabel(/More actions for/).click();
  await card.getByRole("button", { name: "Add to Liked videos" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).pathname).toBe("/login");
});

test("subscribe balloon burst outscores a static page", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Midnight Marquee" })).toBeVisible();
  const subscribe = page.getByRole("button", { name: "Subscribe", exact: true });
  await expect(subscribe).toBeVisible();
  await waitForVisibleImages(page);

  const agent = await createLocalClipAgent(page);
  const stillA = await page.screenshot({ type: "png", caret: "hide" });
  await page.waitForTimeout(400);
  const stillB = await page.screenshot({ type: "png", caret: "hide" });
  const staticDelta = await agent.visualDelta(stillA, stillB);

  await subscribe.click();
  await expect.poll(async () => page.locator("[data-balloon]").count()).toBeGreaterThanOrEqual(100);
  await page.waitForTimeout(700);
  const burst = await page.screenshot({ type: "png", caret: "hide", animations: "allow" });
  const animationDelta = await agent.visualDelta(stillB, burst);

  console.log(`CLIP static visual delta: ${staticDelta.toFixed(4)}`);
  console.log(`CLIP animation visual delta: ${animationDelta.toFixed(4)}`);
  expect(animationDelta).toBeGreaterThan(staticDelta);
  expect(page.url()).not.toContain("/login");
  expect(blockedModelRequestCount()).toBe(0);
});
