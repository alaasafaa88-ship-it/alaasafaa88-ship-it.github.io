const { test, expect } = require('@playwright/test');
const { open, template, state } = require('./helpers');

test.describe('F05 العرض ثلاثي الأبعاد والتجوّل', () => {
  test('F05-H1 فتح 3D يبني المشهد، الليل والأسقف واللقطة تعمل', async ({ page }) => {
    const errors = await open(page); await template(page, 'studio');
    await page.locator('#btn3d').click(); await expect(page.locator('#v3d')).toBeVisible();
    await page.waitForTimeout(1200);
    const n = await page.evaluate(() => OMRAN.app.view3d.root.children.length); expect(n).toBeGreaterThan(20);
    await page.locator('#b3Night').click(); expect(await page.evaluate(() => OMRAN.app.view3d.night)).toBe(true);
    await page.locator('#b3Ceiling').click(); expect(await page.evaluate(() => OMRAN.P.d.settings.showCeiling)).toBe(true);
    await page.locator('#b3Shot').click(); await expect(page.locator('#shotImg')).toHaveAttribute('src', /^data:image\/png/);
    expect(errors).toEqual([]);
  });
  test('F05-H2 التجوّل يحرّك الكاميرا بالمفاتيح والعودة إلى 2D تنهيه', async ({ page }) => {
    await open(page); await template(page, 'studio'); await page.locator('#btn3d').click(); await page.waitForTimeout(800);
    await page.locator('#b3Walk').click(); await expect(page.locator('#walkPad')).toBeVisible();
    const p0 = await page.evaluate(() => OMRAN.app.view3d.camera.position.z);
    await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w'); await page.waitForTimeout(100);
    const p1 = await page.evaluate(() => OMRAN.app.view3d.camera.position.z); expect(p1).not.toBe(p0);
    await page.locator('#btn2d').click(); expect(await page.evaluate(() => OMRAN.app.view3d.walk)).toBe(false);
    await expect(page.locator('#v3d')).toBeHidden();
  });
  test('F05-E1 تعديل في 2D بعد زيارة 3D يُعاد بناؤه عند العودة', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.evaluate(() => { OMRAN.P.addRoom(0, 0, 4, 4, 'living'); OMRAN.P.emit('change'); });
    await page.locator('#btn3d').click(); await page.waitForTimeout(600); const a = await page.evaluate(() => OMRAN.app.view3d.root.children.length);
    await page.locator('#btn2d').click(); await page.evaluate(() => { OMRAN.P.addItem('sofa3', 2, 2, 0); OMRAN.P.emit('change'); });
    await page.locator('#btn3d').click(); await page.waitForTimeout(600); const b = await page.evaluate(() => OMRAN.app.view3d.root.children.length);
    expect(b).toBe(a + 1);
  });
  test('F05-E2 النقر على قطعة في 3D يحددها', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.evaluate(() => { OMRAN.P.addRoom(0, 0, 4, 4, 'living'); OMRAN.P.addItem('wardrobe4', 2, 2, 0); OMRAN.P.emit('change'); });
    await page.locator('#btn3d').click(); await page.waitForTimeout(800);
    await page.evaluate(() => { const v = OMRAN.app.view3d; v.controls.target.set(2, 1, 2); v.camera.position.set(2, 3, 6); v.controls.update(); v.requestRender(); }); await page.waitForTimeout(300);
    const box = await page.locator('#v3d canvas').boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200); expect((await state(page)).selected).not.toBeNull();
  });
});
