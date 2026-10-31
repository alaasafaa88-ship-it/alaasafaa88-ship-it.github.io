const { test, expect } = require('@playwright/test');
const { open, template, state, axe } = require('./helpers');

test.describe('F04 المصمم الذكي', () => {
  test('F04-H1 توليد مخطط من النموذج ثم تأثيث كل الغرف', async ({ page }) => {
    const errors = await open(page); await template(page, 'blank');
    await page.locator('#btnAI').click(); await axe(page, 'S10');
    await page.locator('#gBed').fill('3'); await page.locator('#gOffice').check(); await page.locator('#btnGenerate').click();
    await expect(page.locator('#mAI')).toBeHidden(); const s = await state(page);
    expect(s.rooms).toBeGreaterThanOrEqual(8); expect(s.items).toBeGreaterThan(80);
    const office = await page.evaluate(() => OMRAN.P.d.rooms.some(r => r.type === 'office')); expect(office).toBe(true);
    expect(errors).toEqual([]);
  });
  test('F04-H2 المحادثة: تكلفة، نصائح، إضافة قطعة، تأثيث غرفة بالاسم', async ({ page }) => {
    await open(page); await template(page, 'apt2'); await page.locator('#btnAI').click();
    const ask = async q => { await page.locator('#chatText').fill(q); await page.locator('#chatText').press('Enter'); await page.waitForTimeout(400); };
    await ask('كم التكلفة؟'); await expect(page.locator('.msg.bot').last()).toContainText('الإجمالي');
    await ask('نصائح'); await expect(page.locator('.msg.bot').last()).not.toBeEmpty();
    const before = (await state(page)).items; await ask('أضف ثلاجة'); expect((await state(page)).items).toBe(before + 1);
    await ask('أثّث المطبخ بنمط كلاسيك'); await expect(page.locator('.msg.bot').last()).toContainText('مطبخ');
  });
  test('F04-E1 تأثيث بدون غرفة محددة يطلب التحديد، وطلب غير مفهوم يرد باقتراحات', async ({ page }) => {
    await open(page); await template(page, 'blank'); await page.locator('#btnAI').click();
    await page.getByText('🛋️ تأثيث تلقائي').click(); await page.locator('#btnFurnishSel').click(); await expect(page.locator('#toast')).toContainText('حدّد غرفة');
    await page.locator('#chatText').fill('بلا بلا بلا'); await page.locator('#chatText').press('Enter'); await page.waitForTimeout(400);
    await expect(page.locator('.msg.bot').last()).toContainText('جرّب');
  });
  test('F04-E2 تأثيث غرفة صغيرة جداً لا يرمي خطأ ولا يضع قطعاً خارجها', async ({ page }) => {
    const errors = await open(page); await template(page, 'blank');
    const out = await page.evaluate(() => { const P = OMRAN.P; const r = P.addRoom(0, 0, 1.2, 1.0, 'bathroom'); AI.furnish(P, r, 'modern'); return P.d.items.filter(i => i.x < 0 || i.x > 1.2 || i.y < 0 || i.y > 1.0).length; });
    expect(out).toBe(0); expect(errors).toEqual([]);
  });
  test('F04-H3 تطبيق نمط يغيّر دهان الغرف', async ({ page }) => {
    await open(page); await template(page, 'apt2'); await page.locator('#btnAI').click();
    await page.getByText('🎨 لوحة ألوان ونمط').click(); await page.locator('.style-card[data-style=luxury]').click();
    const wall = await page.evaluate(() => OMRAN.P.d.rooms.find(r => r.type === 'living').wall); expect(wall).toBe('#2d3b55');
  });
});
