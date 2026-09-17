const r = await fetch("https://briclog.ai/admin");
const t = await r.text();
console.log({
  status: r.status,
  headline: t.includes("오늘 해야 할 일"),
  systemConsole: t.includes("System"),
  trendOrToday: /Trend System|오늘 트렌드|품질 보기|command-center/.test(t),
  sectionNav: /Today|Inflow|Quality/.test(t),
});
