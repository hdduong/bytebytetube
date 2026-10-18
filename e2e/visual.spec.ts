import { expect, test, type Page } from "@playwright/test";
import { createLocalClipAgent, modelRequestLeak, watchBrowserModelRequests } from "./local-clip";

const channel = "/channel/midnight-marquee";

test.describe.configure({ timeout: 240_000 });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await watchBrowserModelRequests(page);
});

test.afterEach(async ({ page }) => {
  expect(await modelRequestLeak(page)).toBeNull();
});

async function changedPixelFraction(page: Page, left: Buffer, right: Buffer) {
  return page.evaluate(
    async ({ left: leftImage, right: rightImage }) => {
      async function pixels(base64: string) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      }
      const before = await pixels(leftImage);
      const after = await pixels(rightImage);
      const count = Math.floor(Math.min(before.length, after.length) / 4);
      let changed = 0;
      for (let index = 0; index < count; index += 1) {
        const offset = index * 4;
        const distance =
          Math.abs(before[offset] - after[offset]) +
          Math.abs(before[offset + 1] - after[offset + 1]) +
          Math.abs(before[offset + 2] - after[offset + 2]);
        if (distance > 48) changed += 1;
      }
      return changed / count;
    },
    { left: left.toString("base64"), right: right.toString("base64") },
  );
}

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
  const alreadySubscribed = page.getByRole("button", { name: "Subscribed", exact: true });
  if (await alreadySubscribed.isVisible()) {
    await alreadySubscribed.click();
    await expect(page.locator("[data-balloon]")).toHaveCount(0);
  }
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
  await expect
    .poll(async () =>
      page.locator("[data-balloon]").evaluateAll((nodes) =>
        nodes.some((node) => Number(getComputedStyle(node).opacity) > 0.5),
      ),
    )
    .toBe(true);
  const burst = await page.screenshot({ type: "png", caret: "hide", animations: "allow" });
  await page.evaluate(() => {
    document.querySelectorAll("[data-balloon-burst]").forEach((node) => node.remove());
  });
  const subscribed = await page.screenshot({ type: "png", caret: "hide" });
  const balloonDelta = await agent.visualDelta(burst, subscribed);
  const buttonDelta = await agent.visualDelta(stillB, subscribed);
  const balloonPixels = await changedPixelFraction(page, burst, subscribed);
  const buttonPixels = await changedPixelFraction(page, stillB, subscribed);

  console.log(`CLIP static visual delta: ${staticDelta.toFixed(4)}`);
  console.log(`CLIP balloon visual delta: ${balloonDelta.toFixed(4)}`);
  console.log(`CLIP subscribe-button visual delta: ${buttonDelta.toFixed(4)}`);
  console.log(`Balloon pixel fraction: ${balloonPixels.toFixed(4)}`);
  console.log(`Subscribe-button pixel fraction: ${buttonPixels.toFixed(4)}`);
  expect(balloonDelta).toBeGreaterThan(buttonDelta);
  expect(balloonDelta).toBeGreaterThan(staticDelta);
  expect(balloonPixels).toBeGreaterThan(buttonPixels);
  // A visible burst changed about 1.6% of pixels; the subscribe label changed 0.04%.
  expect(balloonPixels).toBeGreaterThan(0.008);
  expect(page.url()).not.toContain("/login");
});
