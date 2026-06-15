/**
 * SteppedWriteFields E2E fill helper 회귀
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { fillBlogSteppedFormViaDom } from "./lib/e2eAuth.js";

const html = `<!DOCTYPE html><html><body>
<ol aria-label="작성 단계">
  <li><button type="button">STEP 1<br>브랜드</button></li>
  <li><button type="button">STEP 2<br>지역</button></li>
  <li><button type="button">STEP 3<br>주제</button></li>
</ol>
<div id="panel"></div>
<script>
const steps = ['brand','region','topic'];
const placeholders = {
  brand: '매장·브랜드·팀 이름',
  region: '예: 서울 마포, 경기 용인',
  topic: '오늘 전하고 싶은 이야기, 장면, 상황',
};
let active = 0;
const panel = document.getElementById('panel');
const state = { brandName: '', region: '', topic: '' };
function render() {
  const key = steps[active];
  panel.innerHTML = '<input id="f" placeholder="' + placeholders[key] + '" />';
  document.getElementById('f').value = state[key === 'brand' ? 'brandName' : key] || '';
  document.getElementById('f').oninput = (e) => {
    if (key === 'brand') state.brandName = e.target.value;
    else state[key] = e.target.value;
  };
}
document.querySelectorAll('ol button').forEach((btn, i) => {
  btn.onclick = () => { active = i; render(); };
});
render();
window.__state = () => state;
</script>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);

const result = await fillBlogSteppedFormViaDom(page, {
  brandName: "테스트카페",
  region: "서울 강남",
  topic: "봄 브런치 오픈",
});

assert.equal(result.filled, 3, JSON.stringify(result));
const state = await page.evaluate(() => window.__state());
assert.equal(state.brandName, "테스트카페");
assert.equal(state.region, "서울 강남");
assert.equal(state.topic, "봄 브런치 오픈");

await browser.close();
console.log("OK: e2e stepped form fill");
