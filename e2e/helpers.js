// أدوات مشتركة للاختبارات: فشل عند أي خطأ كونسول، فحص إتاحة axe، واختصارات للوصول إلى حالة التطبيق
const { expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

async function open(page, opts = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 500) errors.push('5xx: ' + r.url()); });
  await page.goto('/index.html');
  await expect(page.locator('#loading')).toBeHidden();
  if (!opts.keepWelcome) { await page.keyboard.press('Escape'); await expect(page.locator('#mProjects')).toBeHidden(); }
  return errors;
}
async function template(page, id) { await page.locator('#brand').click(); await page.locator(`[data-tpl=${id}]`).click(); await expect(page.locator('#mProjects')).toBeHidden(); await page.waitForTimeout(150); }
async function state(page) { return page.evaluate(() => { const P = OMRAN.P; return { rooms: P.d.rooms.length, walls: P.d.walls.length, openings: P.d.openings.length, items: P.d.items.length, name: P.d.name, selected: OMRAN.app.selected, tool: OMRAN.editor.tool }; }); }
async function worldClick(page, x, y, opts) { const pt = await page.evaluate(([x, y]) => { const [sx, sy] = OMRAN.editor.toScreen(x, y); const r = document.querySelector('#c2d').getBoundingClientRect(); return [sx + r.left, sy + r.top]; }, [x, y]); await page.mouse.click(pt[0], pt[1], opts); return pt; }
async function screen(page, x, y) { return page.evaluate(([x, y]) => { const [sx, sy] = OMRAN.editor.toScreen(x, y); const r = document.querySelector('#c2d').getBoundingClientRect(); return [sx + r.left, sy + r.top]; }, [x, y]); }
async function axe(page, name) {
  const res = await new AxeBuilder({ page }).disableRules(['color-contrast']).exclude('#c2d').exclude('#v3d').analyze();
  const serious = res.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
  expect(serious, name + ' axe serious/critical: ' + JSON.stringify(serious.map(v => ({ id: v.id, nodes: v.nodes.length, html: v.nodes[0] && v.nodes[0].html.slice(0, 120) })))).toEqual([]);
}
module.exports = { open, template, state, worldClick, screen, axe };
