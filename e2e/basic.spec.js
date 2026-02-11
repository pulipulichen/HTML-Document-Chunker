import { test, expect } from '@playwright/test';

test('頁面標題正確且主要元件已載入', async ({ page }) => {
  await page.goto('/');

  // 檢查標題
  await expect(page).toHaveTitle("檔案切片與 AI 圖片辨識工具");

  // 檢查標頭文字
  const header = page.locator('h1');
  await expect(header).toContainText('檔案切片與 AI 工具');

  // 檢查拖放區是否存在
  const dropZone = page.locator('#dropZone');
  await expect(dropZone).toBeVisible();

  // 檢查設定區塊
  const chunkSizeInput = page.locator('#chunkSize');
  await expect(chunkSizeInput).toHaveValue('1000');
});

test('可以展開 AI 設定區塊', async ({ page }) => {
  await page.goto('/');
  
  const toggleBtn = page.locator('#toggleAi');
  const aiSettings = page.locator('#aiSettings');
  
  await expect(aiSettings).not.toBeVisible();
  await toggleBtn.click();
  await expect(aiSettings).toBeVisible();
});

test('PWA manifest 已連結', async ({ page }) => {
  await page.goto('/');
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveAttribute('href', 'manifest.json');
});
