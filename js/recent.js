// 一覧ページの上の「最近更新した〇〇」（人物・記事・城・合戦・大名家で共用）。
// 各項目の update（{ date: "YYYY-MM-DD", items: [何を直したかの箇条] }）の新しい順に3件を並べる。
// 記事は update がなければ公開日（date）で並べ、「公開」と出す。箇条は2つまで出し、3つ以上なら「ほか」を添える
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
    const lis = items.slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join("");
    const more = items.length > 2 ? `<li class="recent-more">ほか</li>` : "";
    return `<ul class="recent-items">${lis}${more}</ul>`;
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
};
