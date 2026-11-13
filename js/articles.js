// 記事一覧ページ：テーマごとにグループ表示（検索時はフラット表示）
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // テーマの目次（.side-toc。いま開いている見出しの強調は js/toc.js）と、検索の行の左端の名前
  const tocEl = document.getElementById("list-toc");
  const nameEl = document.getElementById("order-current");
  let articles = [];
  let series = [];
  let seriesMap = new Map();
  let rawData = {};

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
    return `<section class="section series-block" id="series-other">
      <h2 class="series-title">${esc(title)}</h2>
      ${desc ? `<p class="series-desc">${esc(desc)}</p>` : ""}
      ${grid(items)}
    </section>`;
  }

  // テーマブロック（内部を group でサブ分類）
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
    // ただし「総論」はテーマの入口なので先頭に置く
    groupOrder.sort((a, b) => (b === "総論") - (a === "総論"));

    let inner = ungrouped.length ? grid(ungrouped) : "";
    for (const g of groupOrder) {
      inner += `<h3 class="series-group">${esc(g)}</h3>${grid(groups.get(g))}`;
    }
    return `<section class="section series-block" id="series-${esc(s.id)}">
      <h2 class="series-title">${esc(s.title)}</h2>
      ${s.description ? `<p class="series-desc">${esc(s.description)}</p>` : ""}
      ${inner}
    </section>`;
  }

  // テーマごと＋一般記事でグループ表示
  function renderGrouped() {
    let html = "";
    // 連載（考察の主の形）をいちばん上に置く
    const rens = window.Rensai ? window.Rensai.list(rawData) : [];
    if (rens.length) {
      html += `<section class="section series-block" id="rensai">
        <h2 class="series-title">連載</h2>
        <p class="series-desc">1つの大きな問いを、表紙の記事と何本かの記事で追う。表紙から読むと、問いと答えの全体が見える。</p>
        <div class="rensai-cards">${rens.map(window.Rensai.cardHTML).join("")}</div>
      </section>`;
    }
    const sorted = series
      .slice()
      .sort((a, b) => (a.order || 99) - (b.order || 99));
    for (const s of sorted) html += seriesBlock(s);
    const general = articles
      .filter((a) => !a.series || !seriesMap.has(a.series))
      .sort(byDateDesc);
    html += block("その他の考察・記事", "", general);
    listEl.innerHTML = html || `<p class="muted">まだ記事がありません。</p>`;
    // 目次は、出したテーマの見出しから作る
    const rows = [...listEl.querySelectorAll(".series-block")].map(
      (sec) => `<li><a href="#${sec.id}">${esc(sec.querySelector(".series-title").textContent)}</a></li>`
    );
    if (tocEl) {
      tocEl.hidden = !rows.length;
      tocEl.innerHTML = rows.length ? `<p class="toc-title">目次</p><ol>${rows.join("")}</ol>` : "";
    }
    if (nameEl) nameEl.textContent = "連載とテーマごと";
  }

  // 検索結果はフラット表示
  function renderFlat(items) {
    // 検索中はテーマの見出しがないので、目次は出さない
    if (tocEl) tocEl.hidden = true;
    if (nameEl) nameEl.textContent = `検索結果（${items.length}件）`;
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
    rawData = data;
    series = data.series || [];
    seriesMap = new Map(series.map((s) => [s.id, s]));
    articles = (data.articles || []).filter((a) => !a.draft);
    // 上の「最近更新した〇〇」（js/recent.js）
    window.renderRecent(articles, { href: (a) => `article.html?id=${encodeURIComponent(a.id)}`, thumb: (a) => a.image && a.image.src, title: (a) => a.title, kana: () => "", useDate: true });
    renderGrouped();
    // 棚は読み込んだあとに組むので、#rensai（メニューの「連載から探す」）などの飛び先へは、組んだあとで移る
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
    searchEl.addEventListener("input", (e) => onSearch(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">記事の読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
