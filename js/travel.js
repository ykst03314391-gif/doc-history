// 旅の記録：テーマ「travel」の記事を、都道府県（group）ごとに並べる
(async function () {
  const listEl = document.getElementById("list");
  const tocEl = document.getElementById("list-toc");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));

  function cardHTML(a) {
    const tags = (a.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
    const thumb =
      a.image && a.image.src
        ? `<img class="card-thumb" src="${esc(a.image.src)}" alt="" loading="lazy">`
        : "";
    return `
      <a class="card${thumb ? " card--thumb" : ""}" href="article.html?id=${encodeURIComponent(a.id)}">
        ${thumb}
        <div class="card-main">
          <p class="article-cat">${esc(a.group || "旅の記録")}</p>
          <h3>${esc(a.title)}</h3>
          <p class="years">${esc(a.date || "")}</p>
          <p class="card-summary">${esc(a.summary || "")}</p>
          <div class="tags">${tags}</div>
        </div>
      </a>`;
  }

  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const arts = (data.articles || [])
      .filter((a) => !a.draft && a.series === "travel")
      .sort(byDateDesc);
    if (!arts.length) {
      listEl.innerHTML = `<p class="muted">まだ旅の記録がありません。</p>`;
      return;
    }
    // 都道府県は、新しい記事のある順に並べる
    const order = [];
    const groups = new Map();
    for (const a of arts) {
      const g = a.group || "その他";
      if (!groups.has(g)) {
        groups.set(g, []);
        order.push(g);
      }
      groups.get(g).push(a);
    }
    listEl.innerHTML = order
      .map(
        (g, i) => `<section class="section series-block" id="pref-${i + 1}">
          <h2 class="series-title">${esc(g)}</h2>
          <div class="article-list">${groups.get(g).map(cardHTML).join("")}</div>
        </section>`
      )
      .join("");
    if (tocEl && order.length > 1) {
      tocEl.hidden = false;
      tocEl.innerHTML = `<p class="toc-title">目次</p><ol>${order
        .map((g, i) => `<li><a href="#pref-${i + 1}">${esc(g)}</a></li>`)
        .join("")}</ol>`;
    }
  } catch (err) {
    listEl.innerHTML = `<p class="error">記事の読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
