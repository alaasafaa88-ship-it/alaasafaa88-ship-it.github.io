const { test, expect } = require('@playwright/test');
const { open, template, state, screen, worldClick, axe } = require('./helpers');

test.describe('F03 التأثيث اليدوي', () => {
  test.beforeEach(async ({ page }) => { await open(page); await template(page, 'blank'); await page.evaluate(() => { OMRAN.P.addRoom(0, 0, 6, 5, 'living'); OMRAN.P.emit('change'); OMRAN.editor.fit(); }); });
  test('F03-H1 بحث الكتالوج ثم وضع قطعة وسحبها وتدويرها وتغيير لونها', async ({ page }) => {
    await page.getByLabel('بحث').fill('سرير'); await expect(page.locator('#catCount')).toContainText(/\d+ قطعة/);
    await page.locator('.item-card[data-id=bed_double]').click(); expect((await state(page)).tool).toBe('place');
    await expect(page.locator('#placeBanner')).toBeVisible();
    await worldClick(page, 3, 2.5); const s1 = await state(page); expect(s1.items).toBe(1); expect(s1.tool).toBe('select');
    const from = await screen(page, 3, 2.5), to = await screen(page, 4, 3);
    await page.mouse.move(from[0], from[1]); await page.mouse.down(); await page.mouse.move(to[0], to[1], { steps: 6 }); await page.mouse.up();
    const pos = await page.evaluate(() => { const it = OMRAN.P.d.items[0]; return [it.x, it.y]; }); expect(pos[0]).toBeGreaterThan(3.5);
    await page.keyboard.press('r'); expect(await page.evaluate(() => OMRAN.P.d.items[0].rot)).toBe(90);
    await page.locator('#propsBody [name=c]').fill('#ff0000'); expect(await page.evaluate(() => OMRAN.P.d.items[0].c)).toBe('#ff0000');
    await axe(page, 'S07 item');
  });
  test('F03-E1 قطعة جدارية تلتصق بأقرب جدار وتدور لتواجه الداخل', async ({ page }) => {
    await page.locator('.item-card[data-id=tv55]').click(); await worldClick(page, 3, 0.6);
    const it = await page.evaluate(() => OMRAN.P.d.items[0]); expect(it.y).toBeLessThan(0.3); expect(it.rot).toBe(0);
  });
  test('F03-E2 Esc يلغي الوضع، والحذف بـ Delete يعمل', async ({ page }) => {
    await page.locator('.item-card[data-id=sofa2]').click(); await page.keyboard.press('Escape'); expect((await state(page)).tool).toBe('select');
    await page.locator('.item-card[data-id=sofa2] .add').click(); expect((await state(page)).items).toBe(1);
    await page.keyboard.press('Delete'); expect((await state(page)).items).toBe(0);
  });
  test('F03-H2 القفل يمنع السحب، والنسخ واللصق ينتجان قطعة ثانية', async ({ page }) => {
    await page.locator('.item-card[data-id=armchair] .add').click();
    await page.locator('#propsBody [name=locked]').check();
    const c = await page.evaluate(() => { const it = OMRAN.P.d.items[0]; return [it.x, it.y]; });
    const from = await screen(page, c[0], c[1]), to = await screen(page, c[0] + 1.5, c[1] + 1);
    await page.mouse.move(from[0], from[1]); await page.mouse.down(); await page.mouse.move(to[0], to[1], { steps: 5 }); await page.mouse.up();
    const after = await page.evaluate(() => { const it = OMRAN.P.d.items[0]; return [it.x, it.y]; }); expect(after).toEqual(c);
    await page.keyboard.press('Control+c'); await page.keyboard.press('Control+v'); expect((await state(page)).items).toBe(2);
  });
  test('F03-H3 قطعة مخصصة بأبعاد المستخدم تظهر في الكتالوج وتُوضع', async ({ page }) => {
    await page.locator('#btnCustomItem').click();
    await page.locator('#customForm [name=n]').fill('خزانة جدتي'); await page.locator('#customForm [name=w]').fill('1.8'); await page.locator('#customForm [name=kind]').selectOption('cabinet');
    await page.locator('#customForm button[type=submit]').click();
    expect((await state(page)).tool).toBe('place'); await worldClick(page, 3, 4.5);
    const it = await page.evaluate(() => { const i = OMRAN.P.d.items[0]; return { w: i.w, n: CATALOG.BY_ID[i.defId].n, custom: OMRAN.P.d.customDefs.length }; });
    expect(it.w).toBe(1.8); expect(it.n).toBe('خزانة جدتي'); expect(it.custom).toBe(1);
    await expect(page.locator('.item-card .nm', { hasText: 'خزانة جدتي' })).toBeVisible();
  });
  test('F03-E3 اسم طويل (60 حرفاً) في القطعة المخصصة يُقصّ إلى 40', async ({ page }) => {
    await page.locator('#btnCustomItem').click(); await page.locator('#customForm [name=n]').fill('ك'.repeat(60));
    await page.locator('#customForm button[type=submit]').click();
    expect(await page.evaluate(() => OMRAN.P.d.customDefs[0].n.length)).toBe(40);
  });
});
