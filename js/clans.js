// 大名家一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // 並べ方の切替。50音順／地域別／国別（地域・国は家が興った国 homeProvince で分ける）
  const orderEl = document.getElementById("order");
  const { kanaRow, REGIONS, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff } = window.ListOrder;
  let clans = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 家紋の絵のクレジット（作者・ライセンス・出典。CCの絵は縮小して使用）
  function creditHTML(k) {
    const lic = k.licenseUrl
      ? `<a href="${esc(k.licenseUrl)}" target="_blank" rel="noopener">${esc(k.license)}</a>`
      : esc(k.license);
    const src = `<a href="${esc(k.source.url)}" target="_blank" rel="noopener">${esc(k.source.name)}</a>`;
    return [k.author ? `作者：${esc(k.author)}` : "", lic, `出典：${src}`, k.note ? esc(k.note) : ""]
      .filter(Boolean)
      .join(" ／ ");
  }

  function creditsHTML(items) {
    const rows = items
      .filter((c) => c.kamonImage)
      .map((c) => `<li><span class="credit-name">${esc(c.name)}</span>${esc(c.kamon || "家紋")}：${creditHTML(c.kamonImage)}</li>`)
      .join("");
    return rows ? `<h2>家紋の絵の出典</h2><ul class="photo-credit-list">${rows}</ul>` : "";
  }

  // 興った国と勢力範囲。項目の途中では折り返さない
  function metaHTML(c) {
    const items = [c.homeProvince ? `${c.homeProvince}で興る` : "", c.region || ""].filter(Boolean);
    if (!items.length) return "";
    return `<p class="years">${items.map((s) => `<span class="meta-item">${esc(s)}</span>`).join(" ／ ")}</p>`;
  }

  function cardHTML(c) {
    return `
      <a class="card clan-card" href="clan.html?id=${encodeURIComponent(c.id)}">
        ${c.kamonImage ? `<img class="kamon-thumb" src="${esc(c.kamonImage.src)}" alt="家紋：${esc(c.kamon || "")}" loading="lazy">` : ""}
        <h3>${esc(c.name)}</h3>
        <p class="kana">${esc(c.kana || "")}</p>
        ${metaHTML(c)}
        <p class="card-summary">${esc(c.summary || "")}</p>
        ${c.kamon ? `<div class="tags"><span class="tag">家紋：${esc(c.kamon)}${c.kamonImage && c.kamonImage.colorNote ? "（図は黒で表示）" : ""}</span></div>` : ""}
      </a>`;
  }

  const prov = (c) => (isProvince(c.homeProvince) ? c.homeProvince : null);
  const byProvince = (a, b) => diff(provinceRank(prov(a)), provinceRank(prov(b)));
  const byRegion = (a, b) => diff(regionRank(prov(a)), regionRank(prov(b)));

  // 並べ方ごとの見出し。items は50音順に並んでいる前提で、同順位のあいだは50音順のまま残る（sort は安定）
  function groupOf(c, order) {
    if (order === "kana") return kanaRow(c.kana);
    if (!prov(c)) return "国不明";
    return order === "region" ? regionOf(prov(c)) : `${prov(c)}（${regionOf(prov(c))}）`;
  }
  function sortFor(order, items) {
    if (order === "kana") return items;
    return [...items].sort(order === "region" ? by(byRegion, byProvince) : byProvince);
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する大名家がありません。</p>`;
      return;
    }
    const order = currentOrder();
    let html = "";
    let current = null;
    for (const c of sortFor(order, items)) {
      const row = groupOf(c, order);
      if (row !== current) {
        html += `<h3 class="kana-row-heading">${esc(row)}</h3>`;
        current = row;
      }
      html += cardHTML(c);
    }
    listEl.innerHTML = html;
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(clans);
    render(
      clans.filter((c) =>
        [c.name, c.kana, c.summary, c.region, c.homeProvince].join(" ").toLowerCase().includes(q)
      )
    );
  }

  const currentOrder = setupSwitch(orderEl, ["kana", "region", "province"], () => filter(searchEl.value));

  try {
    const res = await fetch("data/clans/index.json");
    if (!res.ok) throw new Error(res.status);
    // 読み（kana）の50音順に並べておく
    clans = ((await res.json()).clans || []).sort((a, b) =>
      (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja")
    );
    // 上の「最近更新した〇〇」（js/recent.js）
    window.renderRecent(clans, { href: (c) => `clan.html?id=${encodeURIComponent(c.id)}`, thumb: (c) => c.kamonImage && c.kamonImage.src });
    filter(searchEl.value);
    const creditsEl = document.getElementById("photo-credits");
    if (creditsEl) creditsEl.innerHTML = creditsHTML(clans);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">大名家データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
