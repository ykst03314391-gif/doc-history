// 城一覧ページ
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // 並べ方の切替。50音順／地域別／種類別
  const orderEl = document.getElementById("order");
  // 絞り込み（国宝・日本100名城・続日本100名城）。どの並べ方とも組み合わせられる
  const filtersEl = document.getElementById("filters");
  // 一覧の見出しの目次（.side-toc。いま開いている見出しの強調は js/toc.js）
  const tocEl = document.getElementById("list-toc");
  const { kanaRow, REGIONS, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff } = window.ListOrder;
  let castles = [];
  let peopleById = {};
  let battlesById = {};

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 築城年（不明なら補足を出す）と所在地。項目の途中では折り返さず、収まらないときだけ「／」で折り返す
  function metaHTML(c) {
    const built = c.builtYear
      ? `${c.builtYear}年築城${c.builder ? `（${c.builder}）` : ""}`
      : c.builtNote || "築城年不詳";
    const place = `${c.prefecture || ""}${c.city || ""}`;
    return [c.type, place, built]
      .filter(Boolean)
      .map((s) => `<span class="meta-item">${esc(s)}</span>`)
      .join(" ／ ");
  }

  function relatedHTML(c) {
    const people = (c.relatedPeople || [])
      .filter((id) => peopleById[id])
      .map((id) => `<a class="tag tag-link" href="person.html?id=${encodeURIComponent(id)}">${esc(peopleById[id].name)}</a>`);
    const battles = (c.relatedBattles || [])
      .filter((id) => battlesById[id])
      .map((id) => `<a class="tag tag-link" href="battle.html?id=${encodeURIComponent(id)}">${esc(battlesById[id].name)}</a>`);
    if (!people.length && !battles.length) return "";
    return `
      <div class="castle-related">
        ${people.length ? `<p><span class="castle-related-label">人物</span>${people.join("")}</p>` : ""}
        ${battles.length ? `<p><span class="castle-related-label">合戦</span>${battles.join("")}</p>` : ""}
      </div>`;
  }

  // 写真のクレジット（作者・ライセンス・出典。書き方は js/photo.js）
  function creditsHTML(items) {
    const rows = items
      .filter((c) => c.photo)
      .map((c) => `<li><span class="credit-name">${esc(c.name)}</span>${esc(c.photo.caption)}：${window.PhotoCredit.credit(c.photo)}</li>`)
      .join("");
    return rows ? `<h2>写真の出典</h2><ul class="photo-credit-list">${rows}</ul>` : "";
  }

  function cardHTML(c) {
    const tags = (c.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    const alias = c.alias ? `（別名：${esc(c.alias)}）` : "";
    // 詳細ページがある城だけ城名をリンクにする（カード内に人物・合戦リンクがあるのでカード全体はリンクにしない）
    const href = c.detail ? `castle.html?id=${encodeURIComponent(c.id)}` : "";
    const title = href ? `<a href="${href}">${esc(c.name)}</a>` : esc(c.name);
    return `
      <div class="card castle-card">
        ${c.photo ? `<img class="castle-thumb" src="${esc(c.photo.thumb)}" alt="${esc(c.photo.caption)}" loading="lazy">` : ""}
        <h3>${title}</h3>
        <p class="kana">${esc(c.kana || "")}${alias}</p>
        <p class="years">${metaHTML(c)}</p>
        <p class="card-summary">${esc(c.summary || "")}</p>
        ${relatedHTML(c)}
        <div class="tags">${tags}</div>
        ${href ? `<p class="castle-more"><a href="${href}">詳しく見る →</a></p>` : ""}
      </div>`;
  }

  // 北から（緯度の大きい順）。緯度のない城は後ろ
  const lat = (c) => (typeof c.lat === "number" ? c.lat : -Infinity);
  const byNorth = (a, b) => diff(lat(b), lat(a));
  const prov = (c) => (isProvince(c.province) ? c.province : null);
  const byProvince = (a, b) => diff(provinceRank(prov(a)), provinceRank(prov(b)));
  const byRegion = (a, b) => diff(regionRank(prov(a)), regionRank(prov(b)));
  const hasTag = (c, t) => (c.tags || []).includes(t);

  // labels の順に見出しを立て、その見出しに入る城を並べる。空の見出しは出さない（emptyNote があれば注記を出す）
  function grouped(items, labels, labelOf, emptyNote = {}) {
    return labels
      .map((label) => [label, items.filter((c) => labelOf(c) === label), emptyNote[label]])
      .filter(([, list, note]) => list.length || note);
  }

  const TYPES = ["山城", "平山城", "平城"];

  // 並べ方ごとに [見出し, 城の配列, 空のときの注記, 下の段の見出し] の並びを作る。items は50音順に並んでいる前提。
  // 下の段の見出しは [見出し, 城の配列] の並びで、あれば城はそちらに分けて並べる（地域別の国）
  function groupsFor(order, items) {
    if (order === "kana") {
      const rows = [...new Set(items.map((c) => kanaRow(c.kana)))];
      return grouped(items, rows, (c) => kanaRow(c.kana));
    }
    const north = [...items].sort(byNorth);
    if (order === "region") {
      const sorted = [...items].sort(by(byRegion, byProvince, byNorth));
      const label = (c) => (prov(c) ? regionOf(prov(c)) : "国不明");
      return grouped(sorted, [...REGIONS, "国不明"], label).map(([region, list, note]) => {
        if (region === "国不明") return [region, list, note];
        const provs = [...new Set(list.map(prov))];
        return [region, list, note, grouped(list, provs, prov)];
      });
    }
    if (order === "type") {
      const label = (c) => (TYPES.includes(c.type) ? c.type : "その他");
      return grouped(north, [...TYPES, "その他"], label);
    }
    return [["", items]];
  }

  // 目次は一覧の見出しから作るので、並べ方や検索で見出しが変わるたびに作り直す
  function renderToc(rows) {
    if (!tocEl) return;
    tocEl.hidden = !rows.length;
    const li = (r) =>
      r.children
        ? `<li class="toc-group"><a class="toc-group-link" href="#${r.id}">${esc(r.label)}</a><ol>${r.children.map(li).join("")}</ol></li>`
        : `<li><a href="#${r.id}">${esc(r.label)}</a></li>`;
    tocEl.innerHTML = rows.length ? `<p class="toc-title">目次</p><ol>${rows.map(li).join("")}</ol>` : "";
  }

  function render(items) {
    if (!items.length) {
      const tags = checkedTags();
      const msg = tags.length && !searchEl.value.trim()
        ? `掲載している城に、${tags.join("・")}の城はまだありません。`
        : "該当する城がありません。";
      listEl.innerHTML = `<p class="muted">${esc(msg)}</p>`;
      renderToc([]);
      return;
    }
    let n = 0;
    const rows = [];
    const heading = (label, cls) => {
      const id = `row-${n++}`;
      return [id, `<h3 class="${cls}" id="${id}">${esc(label)}</h3>`];
    };
    listEl.innerHTML = groupsFor(currentOrder(), items)
      .map(([label, list, note, subs]) => {
        if (!label) return list.map(cardHTML).join("");
        const [id, html] = heading(label, "kana-row-heading");
        const row = { id, label };
        rows.push(row);
        if (!list.length) return html + `<p class="muted list-note">${esc(note)}</p>`;
        if (!subs) return html + list.map(cardHTML).join("");
        row.children = [];
        return (
          html +
          subs
            .map(([subLabel, subList]) => {
              const [subId, subHtml] = heading(subLabel, "kana-row-heading group-subheading");
              row.children.push({ id: subId, label: subLabel });
              return subHtml + subList.map(cardHTML).join("");
            })
            .join("")
        );
      })
      .join("");
    renderToc(rows);
  }

  // 絞り込みでチェックの入っているタグ。複数あれば、どれか1つに当たる城を出す
  function checkedTags() {
    if (!filtersEl) return [];
    return [...filtersEl.querySelectorAll("input:checked")].map((i) => i.value);
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    const tags = checkedTags();
    const base = tags.length ? castles.filter((c) => tags.some((t) => hasTag(c, t))) : castles;
    if (!q) return render(base);
    render(
      base.filter((c) => {
        const hay = [
          c.name, c.kana, c.alias, c.type, c.prefecture, c.province, c.city, c.builder, c.summary,
          ...(c.tags || []),
          ...(c.relatedPeople || []).map((id) => peopleById[id]?.name),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

  const currentOrder = setupSwitch(orderEl, ["kana", "region", "type"], () => filter(searchEl.value));

  // 絞り込みの状態は URL の ?filter=国宝,日本100名城 に残す（並べ方の ?order= と同じく、再読み込みしても保つ）
  if (filtersEl) {
    const initial = (new URLSearchParams(location.search).get("filter") || "").split(",");
    for (const i of filtersEl.querySelectorAll("input")) i.checked = initial.includes(i.value);
    filtersEl.addEventListener("change", () => {
      const url = new URL(location.href);
      const tags = checkedTags();
      if (tags.length) url.searchParams.set("filter", tags.join(","));
      else url.searchParams.delete("filter");
      history.replaceState(null, "", url);
      filter(searchEl.value);
    });
  }

  async function load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.json();
  }

  try {
    const [castleData, peopleData, battleData] = await Promise.all([
      load("data/castles/index.json"),
      load("data/people/index.json"),
      load("data/battles/index.json"),
    ]);
    // 上の「最近更新した〇〇」（js/recent.js）
    window.renderRecent(castleData.castles || [], { href: (c) => `castle.html?id=${encodeURIComponent(c.id)}`, thumb: (c) => c.photo && c.photo.thumb });
    // 読み（kana）の50音順に並べておく。ほかの並べ方でも同順位のあいだはこの順が残る
    castles = (castleData.castles || []).sort((a, b) =>
      (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja")
    );
    for (const p of peopleData.people || []) peopleById[p.id] = p;
    for (const b of battleData.battles || []) battlesById[b.id] = b;
    filter(searchEl.value);
    const creditsEl = document.getElementById("photo-credits");
    if (creditsEl) creditsEl.innerHTML = creditsHTML(castles);
    searchEl.addEventListener("input", (e) => filter(e.target.value));
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
