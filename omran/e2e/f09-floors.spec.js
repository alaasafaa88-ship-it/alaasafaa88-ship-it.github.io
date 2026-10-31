const { test, expect } = require('@playwright/test');
const { open, template, state, screen, axe } = require('./helpers');

test.describe('F09 الطوابق والخامات والتقرير', () => {
  test('F09-H1 إضافة طابق، رسم غرفة عليه، التنقل يعرض غرف الطابق فقط، و3D يبني الطابقين', async ({ page }) => {
    const errors = await open(page); await template(page, 'studio');
    const ground = (await state(page)).rooms;
    await page.locator('#btnFloorAdd').click(); await expect(page.locator('#floorSel')).toHaveValue('1');
    expect(await page.evaluate(() => OMRAN.P.vis.rooms.length)).toBe(0);
    await page.keyboard.press('g'); const a = await screen(page, 0.5, 0.5), b = await screen(page, 4.5, 3.5);
    await page.mouse.move(a[0], a[1]); await page.mouse.down(); await page.mouse.move(b[0], b[1], { steps: 6 }); await page.mouse.up();
    const up = await page.evaluate(() => ({ vis: OMRAN.P.vis.rooms.length, all: OMRAN.P.d.rooms.length, lvl: OMRAN.P.d.rooms[OMRAN.P.d.rooms.length - 1].lvl }));
    expect(up.vis).toBe(1); expect(up.all).toBe(ground + 1); expect(up.lvl).toBe(1);
    await page.locator('#floorSel').selectOption('0'); expect(await page.evaluate(() => OMRAN.P.vis.rooms.length)).toBe(ground);
    await page.locator('#btn3d').click(); await page.waitForTimeout(1200);
    const all = await page.evaluate(() => OMRAN.app.view3d.root.children.length);
    await page.locator('#b3Only').click(); await page.waitForTimeout(600);
    const only = await page.evaluate(() => OMRAN.app.view3d.root.children.length); expect(only).toBeLessThan(all);
    expect(errors).toEqual([]);
  });
  test('F09-H2 نسخ الطابق ينسخ غرفه وأثاثه، وحذفه يعيد العدد', async ({ page }) => {
    await open(page); await template(page, 'studio'); const s0 = await state(page);
    await page.locator('#btnFloorDup').click(); const s1 = await state(page);
    expect(s1.rooms).toBe(s0.rooms * 2); expect(s1.items).toBe(s0.items * 2); expect(s1.openings).toBe(s0.openings * 2);
    expect(await page.evaluate(() => OMRAN.P.d.floors.length)).toBe(2);
    page.once('dialog', d => d.accept()); await page.locator('#btnFloorDel').click();
    const s2 = await state(page); expect(s2.rooms).toBe(s0.rooms); expect(await page.evaluate(() => OMRAN.P.d.floors.length)).toBe(1);
  });
  test('F09-E1 التأثيث التلقائي على الطابق العلوي لا يمسّ الطابق الأرضي', async ({ page }) => {
    await open(page); await template(page, 'studio'); const s0 = await state(page);
    await page.evaluate(() => { const P = OMRAN.P; const i = P.addFloor(); P.setFloor(i); const r = P.addRoom(0, 0, 4.5, 4, 'bedroom'); AI.furnish(P, r, 'modern'); P.emit('change'); });
    const r = await page.evaluate(() => ({ g: OMRAN.P.d.items.filter(i => !i.lvl).length, up: OMRAN.P.d.items.filter(i => i.lvl === 1).length }));
    expect(r.g).toBe(s0.items); expect(r.up).toBeGreaterThan(4);
  });
  test('F09-H3 الخامة تُطبَّق في 3D كنسيج', async ({ page }) => {
    await open(page); await template(page, 'blank');
    await page.evaluate(() => { OMRAN.P.addRoom(0, 0, 4, 4, 'living'); const it = OMRAN.P.addItem('dining6', 2, 2, 0); OMRAN.P.emit('change'); OMRAN.editor.select(it.id); });
    await page.locator('#propsBody [name=finish]').selectOption('marble');
    expect(await page.evaluate(() => OMRAN.P.d.items[0].finish)).toBe('marble');
    await page.locator('#btn3d').click(); await page.waitForTimeout(800);
    const hasMap = await page.evaluate(() => { const g = OMRAN.app.view3d.root.children.find(c => c.userData.id === OMRAN.P.d.items[0].id); return g.children.some(m => m.material && m.material.map); });
    expect(hasMap).toBe(true);
  });
  test('F09-H4 التقرير يفتح في تبويب جديد بجداول الغرف والأثاث', async ({ page, context }) => {
    await open(page); await template(page, 'apt2');
    await page.locator('#btnExport').click(); const popup = context.waitForEvent('page'); await page.locator('#exReport').click();
    const rep = await popup; await rep.waitForLoadState();
    await expect(rep.locator('h1')).toContainText('شقة'); await expect(rep.locator('img.plan').first()).toBeVisible();
    expect(await rep.locator('table').count()).toBeGreaterThanOrEqual(3);
    await expect(rep.locator('body')).toContainText('قائمة الأثاث');
  });
  test('F09-E2 مشروع قديم بلا حقل الطوابق يُحمَّل على الدور الأرضي', async ({ page }) => {
    await open(page); await page.evaluate(() => { const d = JSON.parse(JSON.stringify(OMRAN.P.d)); delete d.floors; delete d.currentFloor; d.rooms = [{ id: 'rX', name: 'قديمة', type: 'living', x: 0, y: 0, w: 3, h: 3, floor: 'marble', wall: '#ffffff' }]; d.walls = []; d.openings = []; d.items = []; OMRAN.P.load(d); });
    const r = await page.evaluate(() => ({ floors: OMRAN.P.d.floors.length, lvl: OMRAN.P.d.rooms[0].lvl, mat: OMRAN.P.d.rooms[0].floor, vis: OMRAN.P.vis.rooms.length }));
    expect(r).toEqual({ floors: 1, lvl: 0, mat: 'marble', vis: 1 });
    await axe(page, 'S02 floors');
  });
});
