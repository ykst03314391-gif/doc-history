// 記事一覧ページ：特集ごとにグループ表示（検索時はフラット表示）
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  let articles = [];
  let series = [];
  let seriesMap = new Map();

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const byDateDesc = (a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""));

  function cardHTML(a) {
    const tags = (a.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    const thumb =
      a.image && a.image.src
        ? `<img class="card-thumb" src="${esc(a.image.src)}" alt="" loading="lazy">`
        : "";
    return `
      <a class="card${thumb ? " card--thumb" : ""}" href="article.html?id=${encodeURIComponent(a.id)}">
        ${thumb}
        <div class="card-main">
          <p class="article-cat">${esc(a.category || "記事")}</p>
          <h3>${esc(a.title)}</h3>
          <p class="years">${esc(a.date || "")}</p>
          <p class="card-summary">${esc(a.summary || "")}</p>
          <div class="tags">${tags}</div>
        </div>
      </a>`;
  }

  function grid(items) {
    return `<div class="article-list">${items.map(cardHTML).join("")}</div>`;
  }

  // 一般記事など、グループ分けなしのブロック
  function block(title, desc, items) {
    if (!items.length) return "";
    return `<section class="section series-block">
      <h2 class="series-title">${esc(title)}</h2>
      ${desc ? `<p class="series-desc">${esc(desc)}</p>` : ""}
      ${grid(items)}
    </section>`;
  }

  // 特集ブロック（内部を group でサブ分類）
  function seriesBlock(s) {
    const arts = articles.filter((a) => a.series === s.id).sort(byDateDesc);
    if (!arts.length) return "";

    const ungrouped = arts.filter((a) => !a.group);
    // group は記事の登場順（日付降順）で並べる
    const groupOrder = [];
    const groups = new Map();
    for (const a of arts) {
      if (!a.group) continue;
      if (!groups.has(a.group)) {
        groups.set(a.group, []);
        groupOrder.push(a.group);
      }
      groups.get(a.group).push(a);
    }
    // ただし「総論」は特集の入口なので先頭に置く
    groupOrder.sort((a, b) => (b === "総論") - (a === "総論"));

    let inner = ungrouped.length ? grid(ungrouped) : "";
    for (const g of groupOrder) {
      inner += `<h3 class="series-group">${esc(g)}</h3>${grid(groups.get(g))}`;
    }
    return `<section class="section series-block">
      <h2 class="series-title">${esc(s.title)}</h2>
      ${s.description ? `<p class="series-desc">${esc(s.description)}</p>` : ""}
      ${inner}
    </section>`;
  }

  // 特集ごと＋一般記事でグループ表示
  function renderGrouped() {
    let html = "";
    const sorted = series
      .slice()
      .sort((a, b) => (a.order || 99) - (b.order || 99));
    for (const s of sorted) html += seriesBlock(s);
    const general = articles
      .filter((a) => !a.series || !seriesMap.has(a.series))
      .sort(byDateDesc);
    html += block("その他の考察・記事", "", general);
    listEl.innerHTML = html || `<p class="muted">まだ記事がありません。</p>`;
  }

  // 検索結果はフラット表示
  function renderFlat(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する記事がありません。</p>`;
      return;
    }
    listEl.innerHTML = `<div class="card-grid">${items.map(cardHTML).join("")}</div>`;
  }

  function onSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) return renderGrouped();
    const hit = articles.filter((a) => {
      const st = seriesMap.has(a.series) ? seriesMap.get(a.series).title : "";
      const hay = [a.title, a.summary, a.category, st, ...(a.tags || [])]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    renderFlat(hit.sort(byDateDesc));
  }

  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    series = data.series || [];
    seriesMap = new Map(series.map((s) => [s.id, s]));
    articles = (data.articles || []).filter((a) => !a.draft);
    renderGrouped();
    searchEl.addEventListener("input", (e) => onSearch(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">記事の読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
