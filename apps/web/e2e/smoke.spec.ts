import { expect, test } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test("homepage loads with no sideways scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("nothing");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/login/);
});

test.describe("signed in", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD (a Neon dev branch login) to run these.");
  // One business per run, created and deleted by the test.
  test.describe.configure({ mode: "serial" });

  test("lead to Day 3, stage move, undo and palette", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Full flow runs once, on desktop.");
    const name = `E2E Smoke ${Date.now()}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/today/);

    // Create a lead: it opens its profile with a Day 1 follow-up.
    await page.getByRole("button", { name: "New lead" }).first().click();
    await page.getByLabel("Business name").fill(name);
    await page.getByRole("button", { name: "Add lead" }).click();
    await expect(page).toHaveURL(/\/businesses\//);
    await expect(page.getByRole("button", { name: /Complete Day 1/ })).toBeVisible();

    // Find it again with the command palette from Today.
    await page.goto("/today");
    await page.keyboard.press("Control+K");
    await page.getByRole("combobox").fill(name.slice(0, 14));
    await page.getByRole("option", { name: new RegExp(name) }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    // Complete Day 1: lead moves on and Day 3 is scheduled. Then Undo puts Day 1 back.
    await page.getByRole("button", { name: /Complete Day 1/ }).click();
    await expect(page.getByText(/Day 3/).first()).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: /Complete Day 1/ })).toBeVisible();

    // Move the stage on the profile, then clean up.
    await page.getByLabel("Stage").selectOption({ label: "Contacted" });
    await expect(page.getByText(/follow-ups stopped|Moved to/i).first()).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/businesses/);
  });
});
