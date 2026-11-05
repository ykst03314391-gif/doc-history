// 一覧ページの上の「最近更新した〇〇」（人物・記事・城・合戦・大名家で共用）。
// 各項目の update（{ date: "YYYY-MM-DD", items: [何を直したかの箇条] }）の新しい順に3件を並べる。
// 記事は update がなければ公開日（date）で並べ、「公開」と出す。
// 箇条は合わせて2行までに収め、収まらない分（3つ目以降の箇条や、2行目からはみ出す字）は省いて末尾に「…他」を付ける
window.renderRecent = function (all, { href, thumb, title = (x) => x.name, kana = (x) => x.kana || "", useDate = false }) {
  const box = document.getElementById("recent");
  if (!box) return;
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const when = (x) => (x.update && x.update.date) || (useDate ? x.date || "" : "");
  const recent = all
    .filter((x) => when(x))
    .sort((a, b) => when(b).localeCompare(when(a)))
    .slice(0, 3);
  if (!recent.length) return;
  const itemsHTML = (items) => {
    if (!items.length) return "";
    const lis = items.map((t) => `<li>${esc(t)}</li>`).join("");
    return `<ul class="recent-items" data-items="${esc(JSON.stringify(items))}">${lis}</ul>`;
  };
  document.getElementById("recent-list").innerHTML = recent
    .map((x) => {
      const src = thumb(x);
      const img = src ? `<img class="person-thumb" src="${esc(src)}" alt="" loading="lazy">` : "";
      const label = x.update && x.update.date ? "更新" : "公開";
      const k = kana(x);
      return `
        <a class="card person-card recent-card" href="${esc(href(x))}">
          ${img}
          <p class="recent-date">${esc(when(x).replace(/-/g, "."))} ${label}</p>
          <h3>${esc(title(x))}</h3>
          ${k ? `<p class="kana">${esc(k)}</p>` : ""}
          ${itemsHTML((x.update && x.update.items) || [])}
        </a>`;
    })
    .join("");
  box.hidden = false;
  clampAll();
  // 幅が変わると折り返しが変わるので、収め直す
  if (!window.__recentClampBound) {
    window.__recentClampBound = true;
    let t = null;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(clampAll, 150);
    });
  }

  function clampAll() {
    document.querySelectorAll("#recent-list .recent-items").forEach(clamp);
  }
  // 箇条を2行に収める。はみ出すときは、最後に見えている箇条の末尾を削って「…他」を付ける
  function clamp(ul) {
    const items = JSON.parse(ul.dataset.items || "[]");
    ul.innerHTML = items.map((t) => `<li>${esc(t)}</li>`).join("");
    const lis = [...ul.children];
    if (!lis.length) return;
    const lh = parseFloat(getComputedStyle(lis[0]).lineHeight) || 24;
    const lines = (li) => Math.round(li.getBoundingClientRect().height / lh);
    // 前から2行ぶんまでの箇条を残す
    let used = 0;
    let keep = 0;
    for (const li of lis) {
      if (used >= 2) break;
      used += lines(li);
      keep++;
    }
    const cut = keep < lis.length || used > 2;
    lis.slice(keep).forEach((li) => li.remove());
    if (!cut) return;
    const last = lis[keep - 1];
    const room = 2 - (used - lines(last)); // 最後の箇条に使える行数
    const text = items[keep - 1];
    last.textContent = text + "…他";
    if (lines(last) <= room) return;
    // 収まる長さを二分探索で探す
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      last.textContent = text.slice(0, mid) + "…他";
      if (lines(last) <= room) lo = mid;
      else hi = mid - 1;
    }
    last.textContent = text.slice(0, lo) + "…他";
  }
};
