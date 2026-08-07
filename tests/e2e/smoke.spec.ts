import { test, expect } from "@playwright/test";

test.describe("Homefolio smoke", () => {
  test("login page is calm and readable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Homefolio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
