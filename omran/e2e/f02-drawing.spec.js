const { test, expect } = require('@playwright/test');
const { open, template, state, screen, worldClick } = require('./helpers');

test.describe('F02 رسم غرفة وجدران وأبواب ونوافذ', () => {
  test('F02-H1 سحب مستطيل ينشئ غرفة بأربعة جدران', async ({ page }) => {
    const errors = await open(page); await template(page, 'blank');
    await page.keyboard.press('g'); expect((await state(page)).tool).toBe('room');
    const a = await screen(page, 1, 1), b = await screen(page, 6, 5);
    await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 8 }); await page.mouse.up();
    const s = await state(page); expect(s.rooms).toBe(1); expect(s.walls).toBe(4);
    await expect(page.locator('#propsBody')).toContainText('غرفة');
    expect(errors).toEqual([]);
  });
  test('F02-E1 مستطيل أصغر من 0.8 م لا ينشئ غرفة', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.keyboard.press('g');
    const a = await screen(page, 1, 1), b = await screen(page, 1.5, 1.5);
    await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 4 }); await page.mouse.up();
    expect((await state(page)).rooms).toBe(0);
  });
  test('F02-H2 أداة الجدار ترسم جدارين بثلاث نقرات وتنتهي بالنقر المزدوج', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.keyboard.press('w');
    const p1 = await screen(page, 2, 2), p2 = await screen(page, 6, 2), p3 = await screen(page, 6, 6);
    await page.mouse.click(p1[0], p1[1]); await page.mouse.click(p2[0], p2[1]); await page.mouse.click(p3[0], p3[1]); await page.mouse.dblclick(p3[0], p3[1]);
    expect((await state(page)).walls).toBe(2);
  });
  test('F02-H3 باب ونافذة على الجدران، ونقر بعيد عن أي جدار لا يضيف شيئاً', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.evaluate(() => { OMRAN.P.addRoom(1, 1, 5, 4, 'living'); OMRAN.P.emit('change'); });
    await page.keyboard.press('d'); await worldClick(page, 3.5, 5);
    await page.keyboard.press('n'); await worldClick(page, 3.5, 1);
    await page.keyboard.press('n'); await worldClick(page, 9, 9);
    const types = await page.evaluate(() => OMRAN.P.d.openings.map(o => o.type));
    expect(types).toEqual(['door', 'window']);
    await expect(page.locator('#propsBody')).toContainText('نافذة');
  });
  test('F02-E2 الفتحة تبقى داخل الجدار حتى عند تحريكها لطرفه', async ({ page }) => {
    await open(page); await template(page, 'blank');
    const ok = await page.evaluate(() => { const P = OMRAN.P; P.addRoom(0, 0, 3, 3, 'bedroom'); const w = P.d.walls[0]; const o = P.addOpening('window_wide', w.id, 0.99); const L = P.wallLength(w); return o.t * L + o.w / 2 <= L + 1e-9 && o.t * L - o.w / 2 >= -1e-9; });
    expect(ok).toBe(true);
  });
  test('F02-H4 التراجع والإعادة يعيدان عدد الغرف', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.keyboard.press('g');
    const a = await screen(page, 1, 1), b = await screen(page, 5, 4);
    await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 5 }); await page.mouse.up();
    await page.locator('#btnUndo').click(); expect((await state(page)).rooms).toBe(0);
    await page.locator('#btnRedo').click(); expect((await state(page)).rooms).toBe(1);
  });
});
