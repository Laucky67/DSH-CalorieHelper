import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const [profile, executable, desktopPort] = process.argv.slice(2);
const chrome = desktopPort ? undefined : spawn(executable, [
  '--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });

async function until(check, description, timeout = 18000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await delay(180);
  }
  throw new Error(`Timeout ${description}`);
}

let ws;
try {
  const port = desktopPort ?? await until(async () => (await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')).split('\n')[0], 'Chrome devtools');
  const target = await until(async () => {
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => []);
    return targets.find(({ type, url }) => type === 'page' && (!desktopPort || url.startsWith('dsh-app://app/')));
  }, 'DSH renderer DevTools', 30000);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  let sequence = 0;
  const requests = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const pending = requests.get(message.id);
    if (!pending) return;
    requests.delete(message.id);
    if (message.error) pending.reject(new Error(message.error.message));
    else pending.resolve(message.result);
  });
  const invoke = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    requests.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await invoke('Page.enable');
  ws.addEventListener('message', ({ data }) => {
    if (JSON.parse(data).method === 'Page.javascriptDialogOpening') void invoke('Page.handleJavaScriptDialog', { accept: true });
  });
  async function page(expression) {
    const result = await invoke('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception.description);
    return result.result.value;
  }
  const buttons = `[...document.querySelectorAll('button,a,[role="button"]')]`;
  const find = (label, scope = buttons) => `${scope}.find(el => el.getClientRects().length && (el.textContent.trim() === ${JSON.stringify(label)} || el.getAttribute('aria-label') === ${JSON.stringify(label)}))`;
  async function click(label, scope) {
    await until(() => page(`(() => { const el = ${find(label, scope)}; if (!el || el.disabled) return false; el.click(); return true; })()`), label);
  }
  const value = (selector, input) => page(`(() => {const el = document.querySelector(${JSON.stringify(selector)}); const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(input)}); el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles:true })); return el.value; })()`);

  async function openPlugin() {
    await until(() => page(`Boolean(${find('继续')} || ${find('Continue')} || ${find('卡路里记录')})`), 'DSH shell');
    for (const label of ['继续', 'Continue']) {
      if (await page(`Boolean(${find(label)})`)) await click(label);
    }
    await click('卡路里记录');
  }
  const selectFood = async (meal, name) => {
    await click(`添加${meal}记录`);
    const id = await until(() => page(`[...document.querySelectorAll('.cal-diet-form select option')].find(el=>el.textContent===${JSON.stringify(name)})?.value`), 'existing food option');
    await value('.cal-diet-form select', id);
  };
  if (!desktopPort) await invoke('Page.navigate', { url: process.env.CALORIE_SMOKE_BOOT_URL });
  await openPlugin();
  await until(() => page(`document.querySelector('.cal-daily input[type=date]')?.value`), 'date and calorie panel');
  if (process.env.CALORIE_RESTART_CHECK === 'true') {
    await until(() => page(`document.querySelector('[data-meal=breakfast]').innerText.includes('260 千卡')`), 'desktop restart keeps edited breakfast');
    const historical = await page(`(async () => { const response = await fetch(new URL('api/calorie-helper', document.baseURI), {
      method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({action:'daily_summary',input:{date:'2026-11-25'}})
    }); return (await response.json()).result; })()`);
    assert.equal(historical.items[0].id, 'meal-01');
    assert.equal(historical.totalKcal, 187.5);
    assert.equal(Math.round(historical.maintenanceKcal), 2275);
    await selectFood('零嘴', '浏览器烟测饭团');
    await value('.cal-diet-form input[name=amount]', '4');
    await click('保存记录');
    await until(() => page(`!document.querySelector('.cal-diet-form')`), 'retry after desktop restart completed');
    assert.equal(await page(`[...document.querySelectorAll('[data-meal=snack] .cal-food-name strong')].filter(el=>el.textContent==='浏览器烟测饭团').length`), 1);
    console.log('Passed: Windows DSH Desktop restart, migrated history and profile, retry after full restart');
  } else {
  await click('添加早餐记录');
  await click('新增食物');
  await until(() => page(`Boolean(document.querySelector('.cal-editor form input[name=name]'))`), 'food editor');
  assert.equal(await value('.cal-editor input[name=name]', '浏览器烟测饭团'), '浏览器烟测饭团');
  await value('.cal-editor input[name=basisValue]', '1');
  await value('.cal-editor input[name=basisUnit]', '个');
  await value('.cal-editor input[name=energyKcal]', '123');
  await click('保存食物');
  await until(() => page(`!document.querySelector('.cal-editor') && document.querySelector('.cal-diet-form select')?.value`), 'food editor return and selected food');
  await value('.cal-diet-form input[name=amount]', '2');
  await click('保存记录');
  await until(() => page(`document.querySelector('[data-meal=breakfast]').innerText.includes('246 千卡')`), 'saved breakfast calories');
  await click('编辑浏览器烟测饭团的食物资料');
  await until(() => page(`Boolean(document.querySelector('.cal-editor input[name=energyKcal]'))`), 'pencil opens existing food');
  await value('.cal-editor input[name=energyKcal]', '130');
  await click('保存食物');
  await until(() => page(`document.querySelector('[data-meal=breakfast]').innerText.includes('260 千卡')`), 'read-time calories');
  const external = await page(`(async () => {const date = document.querySelector('.cal-daily input[type=date]').value; const r = await fetch(new URL('api/calorie-helper',document.baseURI),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'diet_create',input:{date,meal:'snack',items:[{newFood:{name:'外部记餐验证',nutrition:{per:{value:1,unit:'份'},values:{energyKcal:45}}},amount:{value:1,unit:'份'}}]}})});return r.ok})()`);
  assert.equal(external, true);
  if (!desktopPort) {
    await until(() => page(`document.querySelector('[data-meal=snack]').innerText.includes('外部记餐验证')`), 'external write refresh');
  }
  await page(`(() => {const original = fetch; window.fetch = async (...args) => {
    const response = await original(...args);
    if (response.ok && args[1]?.body && JSON.parse(args[1].body).action === 'diet_create') throw new TypeError('test: response lost');
    return response;
  };})()`);
  await selectFood('午餐', '浏览器烟测饭团');
  await click('保存记录');
  await until(() => page(`document.querySelector('.cal-diet-form').innerText.includes('暂时无法确认')`), 'ambiguous write visible');
  await invoke('Page.reload');
  await until(() => page(`typeof window.fetch === 'function' && !document.querySelector('.cal-diet-form')`), 'reload old draft cleared');
  await openPlugin();
  await selectFood('午餐', '浏览器烟测饭团');
  await click('保存记录');
  const countLunch = () => page(`[...document.querySelectorAll('[data-meal=lunch] .cal-food-name strong')].filter(el=>el.textContent==='浏览器烟测饭团').length`);
  await until(() => page(`!document.querySelector('.cal-diet-form')`), 'retried save completed');
  assert.equal(await countLunch(), 1);
  await selectFood('午餐', '浏览器烟测饭团');
  await click('保存记录');
  await until(async () => (await countLunch()) === 2, 'intentional second meal is allowed');

  await page(`(() => {
    const original = fetch;
    const gate = new Promise((resolve) => { window.calorieTestRelease = resolve; });
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (args[1]?.body && JSON.parse(args[1].body).action === 'diet_create') {
        window.calorieTestCommitted = response.ok;
        await gate;
      }
      return response;
    };
  })()`);
  await selectFood('晚餐', '浏览器烟测饭团');
  await click('保存记录');
  await until(() => page('window.calorieTestCommitted === true'), 'committed response held');
  await selectFood('早餐', '浏览器烟测饭团');
  await value('[data-meal=breakfast] .cal-diet-form input[name=amount]', '3');
  await page('window.calorieTestRelease()');
  await until(() => page(`document.querySelector('[data-meal=dinner]').innerText.includes('130 千卡')`), 'old response processed');
  assert.equal(await page(`document.querySelector('[data-meal=breakfast] .cal-diet-form input[name=amount]').value`), '3');
  if (desktopPort) {
    await page(`(() => {const original = fetch; window.fetch = async (...args) => {
      const response = await original(...args);
      if (response.ok && args[1]?.body && JSON.parse(args[1].body).action === 'diet_create') throw new TypeError('test: response lost');
      return response;
    };})()`);
    await selectFood('零嘴', '浏览器烟测饭团');
    await value('.cal-diet-form input[name=amount]', '4');
    await click('保存记录');
    await until(() => page(`document.querySelector('.cal-diet-form').innerText.includes('暂时无法确认')`), 'ambiguous write before desktop restart');
    await page(`(() => {for (const key of Object.keys(localStorage)) { if (key.startsWith('calorie-helper:pending:')) localStorage.removeItem(key); }})()`);
  }
  console.log(`Passed: DSH sidebar, meal and food editors, ${desktopPort ? 'external write' : 'external refresh'}, lost response after reload, intentional repeat and late response preserves next draft`);
  }
} finally {
  ws?.close();
  chrome?.kill();
}
