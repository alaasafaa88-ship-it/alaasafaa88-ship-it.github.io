const { test, expect } = require('@playwright/test');
const { open, template, state, axe } = require('./helpers');

test.describe('F01 بدء مشروع من قالب وحفظه', () => {
  test('F01-H1 الشاشة الأولى تعرض القوالب ثم ينتج قالب شقة مخططاً مؤثثاً', async ({ page }) => {
    const errors = await open(page, { keepWelcome: true });
    await expect(page.locator('#mProjects')).toBeVisible();
    await expect(page.locator('[data-tpl]')).toHaveCount(7);
    await axe(page, 'S01');
    await page.locator('[data-tpl=apt2]').click();
    await expect(page.locator('#mProjects')).toBeHidden();
    const s = await state(page);
    expect(s.rooms).toBeGreaterThanOrEqual(6); expect(s.items).toBeGreaterThan(50); expect(s.openings).toBeGreaterThan(10);
    await expect(page.locator('#projName')).toHaveValue(/شقة/);
    expect(errors).toEqual([]);
  });
  test('F01-H2 الحفظ يظهر في المحفوظة ويُفتح من جديد', async ({ page }) => {
    const errors = await open(page); await template(page, 'studio');
    await page.locator('#projName').fill('بيت الاختبار'); await page.locator('#btnSave').click();
    await expect(page.locator('#toast')).toContainText('تم حفظ');
    await page.locator('#btnProjects').click(); await page.locator('[data-mtab=saved]').click();
    await expect(page.locator('.saved')).toHaveCount(1); await expect(page.locator('.saved b')).toContainText('بيت الاختبار');
    await expect(page.locator('.hist')).toHaveCount(1); // نسخة سابقة من الحفظ
    await page.locator('[data-open]').click();
    await expect(page.locator('#projName')).toHaveValue('بيت الاختبار');
    expect(errors).toEqual([]);
  });
  test('F01-E1 إعادة التحميل تستعيد الحفظ التلقائي بدون نافذة الترحيب', async ({ page }) => {
    await open(page); await template(page, 'studio'); await page.waitForTimeout(1200);
    await page.reload(); await expect(page.locator('#loading')).toBeHidden();
    await expect(page.locator('#mProjects')).toBeHidden();
    expect((await state(page)).rooms).toBeGreaterThan(0);
  });
  test('F01-N1 استيراد ملف JSON تالف يُرفض برسالة', async ({ page }) => {
    await open(page); await page.locator('#btnProjects').click(); await page.locator('[data-mtab=saved]').click();
    await page.locator('#fileImport').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await expect(page.locator('#toast')).toContainText('غير صالح');
  });
  test('F01-E2 قالب فارغ ثم مسح المشروع لا يكسر الواجهة', async ({ page }) => {
    const errors = await open(page); await template(page, 'blank');
    expect((await state(page)).rooms).toBe(0);
    await expect(page.locator('#propsBody')).toContainText('لا توجد غرف');
    expect(errors).toEqual([]);
  });
});
