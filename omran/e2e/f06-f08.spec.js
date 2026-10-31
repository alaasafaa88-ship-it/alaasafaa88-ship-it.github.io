const { test, expect } = require('@playwright/test');
const { open, template, state, worldClick, axe } = require('./helpers');

test.describe('F06 المواد', () => {
  test('F06-H1 اختيار أرضية ودهان للغرفة المحددة، ثم على جميع الغرف', async ({ page }) => {
    await open(page); await template(page, 'apt2');
    const r = await page.evaluate(() => { const r = OMRAN.P.d.rooms[0]; return [r.x, r.y, r.id]; });
    await page.locator(`#propsBody [data-room=${r[2]}]`).click();
    await page.locator('#sideTabs [data-tab=materials]').click(); await axe(page, 'S05');
    await page.locator('#floorGrid .mat[data-id=marble]').click(); await page.locator('#paintGrid .paint[data-id="#2d3b55"]').click();
    const room = await page.evaluate(id => OMRAN.P.d.rooms.find(x => x.id === id), r[2]); expect(room.floor).toBe('marble'); expect(room.wall).toBe('#2d3b55');
    await page.locator('#chkAllRooms').check(); await page.locator('#floorGrid .mat[data-id=concrete]').click();
    const all = await page.evaluate(() => OMRAN.P.d.rooms.every(x => x.floor === 'concrete')); expect(all).toBe(true);
  });
  test('F06-E1 بدون غرفة محددة تظهر رسالة إرشاد', async ({ page }) => {
    await open(page); await template(page, 'apt2'); await page.locator('#sideTabs [data-tab=materials]').click();
    await page.locator('#floorGrid .mat[data-id=marble]').click(); await expect(page.locator('#toast')).toContainText('حدّد غرفة');
  });
});

test.describe('F07 التصدير والمشاركة', () => {
  test('F07-H1 صورة المخطط وJSON وCSV ورابط المشاركة', async ({ page, context }) => {
    await open(page); await template(page, 'studio'); await page.locator('#btnExport').click(); await axe(page, 'S11');
    await page.locator('#exPng2d').click(); await expect(page.locator('#shotImg')).toHaveAttribute('src', /^data:image\/png/); await page.keyboard.press('Escape');
    await page.locator('#btnExport').click(); const dl = page.waitForEvent('download'); await page.locator('#exJson').click(); const d = await dl; expect(d.suggestedFilename()).toMatch(/^omran-.*\.omran\.json$/);
    await page.locator('#btnExport').click(); const dl2 = page.waitForEvent('download'); await page.locator('#exCsv').click(); expect((await dl2).suggestedFilename()).toMatch(/^omran-.*\.csv$/);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#btnExport').click(); await page.locator('#exLink').click(); await expect(page.locator('#toast')).toContainText('نسخ الرابط');
    const link = await page.evaluate(() => navigator.clipboard.readText()); expect(link).toMatch(/#p=/);
    await page.goto(link); await expect(page.locator('#loading')).toBeHidden(); expect((await state(page)).rooms).toBeGreaterThan(0);
  });
  test('F07-E1 استيراد JSON صالح يفتح المشروع', async ({ page }) => {
    await open(page); const json = await page.evaluate(() => { OMRAN.P.addRoom(0, 0, 3, 3, 'office'); return JSON.stringify(OMRAN.P.d); });
    await template(page, 'blank'); await page.locator('#btnProjects').click(); await page.locator('[data-mtab=saved]').click();
    await page.locator('#fileImport').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(json) });
    await expect(page.locator('#toast')).toContainText('الاستيراد'); expect((await state(page)).rooms).toBe(1);
  });
});

test.describe('F08 التكلفة والتحليل', () => {
  test('F08-H1 الملخص يعرض التكلفة، وتغيير العملة ينعكس', async ({ page }) => {
    await open(page); await template(page, 'apt2'); await page.keyboard.press('Escape');
    await expect(page.locator('#propsBody')).toContainText('التكلفة التقديرية');
    await page.locator('#sideTabs [data-tab=settings]').click(); await page.locator('#setCur').fill('ر.س');
    await expect(page.locator('#propsBody')).toContainText('ر.س');
  });
});

test.describe('S14 الجوال', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('S14-H1 الشريط السفلي يفتح الكتالوج والخصائص ويبدّل 3D', async ({ page }) => {
    const errors = await open(page); await template(page, 'studio');
    await expect(page.locator('#mobileNav')).toBeVisible(); await axe(page, 'S14');
    await page.locator('#mobileNav [data-nav=catalog]').click(); await expect(page.locator('#sidebar')).toHaveClass(/open/);
    await page.locator('#mobileNav [data-nav=props]').click(); await expect(page.locator('#props')).toHaveClass(/open/); await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
    await page.locator('#mobileNav [data-nav=view]').click(); await expect(page.locator('#v3d')).toBeVisible();
    expect(errors).toEqual([]);
  });
});
