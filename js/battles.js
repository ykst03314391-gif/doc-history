// 合戦一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // 並べ方の切替。年代順／50音順／地域別／国別（地域・国は主な戦場の国 province で分ける）
  const orderEl = document.getElementById("order");
  const { kanaRow, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff } = window.ListOrder;
  let battles = [];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 対戦した陣営と勝敗（例：織田軍（勝）× 今川軍（負））。勝ち負けのない合戦は末尾に「決着つかず」などをまとめて書く
  const MARK = { 勝利: "勝", 敗北: "負" };
  function sidesHTML(b) {
    const sides = b.sides || [];
    if (!sides.length) return "";
    const names = sides
      .map((x) => {
        const m = MARK[x.outcome];
        return `<span class="side${m === "勝" ? " side-win" : ""}">${esc(x.name)}${m ? `（${m}）` : ""}</span>`;
      })
      .join(" × ");
    const other = [...new Set(sides.filter((x) => x.outcome && !MARK[x.outcome]).map((x) => x.outcome))];
    return `<p class="battle-sides">${names}${other.length ? `（${esc(other.join("・"))}）` : ""}</p>`;
  }

  // 写真のクレジット（作者・ライセンス・出典。書き方は js/photo.js）
  function creditsHTML(items) {
    const rows = items
      .filter((b) => b.photo)
      .map((b) => `<li><span class="credit-name">${esc(b.name)}</span>${esc(b.photo.caption)}：${window.PhotoCredit.credit(b.photo)}</li>`)
      .join("");
    return rows ? `<h2>写真の出典</h2><ul class="photo-credit-list">${rows}</ul>` : "";
  }

  function cardHTML(b) {
    return `
      <a class="card battle-card" href="battle.html?id=${encodeURIComponent(b.id)}">
        ${b.photo ? `<img class="castle-thumb" src="${esc(b.photo.thumb)}" alt="${esc(b.photo.caption)}" loading="lazy">` : ""}
        <p class="years">${esc(b.year || "")}年${b.province ? "　" + esc(b.province) : ""}${b.prefecture ? "（" + esc(b.prefecture) + "）" : ""}</p>
        <h3>${esc(b.name)}</h3>
        <p class="kana">${esc(b.kana || "")}</p>
        ${sidesHTML(b)}
        <p class="card-summary">${esc(b.summary || "")}</p>
      </a>`;
  }

  // 北から（緯度の大きい順）。緯度のない合戦は後ろ
  const lat = (b) => (typeof b.lat === "number" ? b.lat : -Infinity);
  const byNorth = (a, b) => diff(lat(b), lat(a));
  const prov = (b) => (isProvince(b.province) ? b.province : null);
  const byProvince = (a, b) => diff(provinceRank(prov(a)), provinceRank(prov(b)));
  const byRegion = (a, b) => diff(regionRank(prov(a)), regionRank(prov(b)));
  const byYear = (a, b) => diff(a.year || Infinity, b.year || Infinity);
  const byKana = (a, b) => (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja");

  // 並べ方ごとの見出し（年代順は見出しなし）と並び。同じ国の中は北から、同じ場所なら年代順
  function groupOf(b, order) {
    if (order === "year") return "";
    if (order === "kana") return kanaRow(b.kana);
    if (!prov(b)) return "国不明";
    return order === "region" ? regionOf(prov(b)) : `${prov(b)}（${regionOf(prov(b))}）`;
  }
  function sortFor(order, items) {
    if (order === "year") return [...items].sort(by(byYear, byKana));
    if (order === "kana") return [...items].sort(byKana);
    const head = order === "region" ? [byRegion, byProvince] : [byProvince];
    return [...items].sort(by(...head, byNorth, byYear));
  }

  function render(items) {
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する合戦がありません。</p>`;
      return;
    }
    const order = currentOrder();
    let html = "";
    let current = null;
    for (const b of sortFor(order, items)) {
      const row = groupOf(b, order);
      if (row && row !== current) {
        html += `<h3 class="kana-row-heading">${esc(row)}</h3>`;
        current = row;
      }
      html += cardHTML(b);
    }
    listEl.innerHTML = html;
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(battles);
    render(
      battles.filter((b) =>
        [b.name, b.kana, b.summary, b.prefecture, b.province, ...(b.sides || []).map((x) => x.name)].join(" ").toLowerCase().includes(q)
      )
    );
  }

  const currentOrder = setupSwitch(orderEl, ["year", "kana", "region", "province"], () => filter(searchEl.value));

  try {
    const res = await fetch("data/battles/index.json");
    if (!res.ok) throw new Error(res.status);
    battles = (await res.json()).battles || [];
    // 上の「最近更新した〇〇」（js/recent.js）
    window.renderRecent(battles, { href: (b) => `battle.html?id=${encodeURIComponent(b.id)}`, thumb: (b) => b.photo && b.photo.thumb });
    filter(searchEl.value);
    const creditsEl = document.getElementById("photo-credits");
    if (creditsEl) creditsEl.innerHTML = creditsHTML([...battles].sort(by(byYear, byKana)));
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">合戦データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
