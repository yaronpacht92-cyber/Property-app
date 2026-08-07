import { test, expect } from "@playwright/test";

test.describe("Pachtfolio smoke", () => {
  test("login page is calm and readable", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Pachtfolio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
