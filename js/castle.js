// 城詳細ページ
(async function () {
  const el = document.getElementById("content");

  // 出典バッジ：資料の区分ごとの塗り色（style.css）と、出典欄の頭に置く凡例
  const SRC_CLASS = { "一次資料": "src-primary1", "二次資料": "src-primary2", "研究": "src-research" };
  const SRC_LEGEND = `<p class="src-legend muted">塗りつぶしは資料の区分：
    <span class="src-primary src-primary1">一次資料</span>同時代の日記・書状など
    <span class="src-primary src-primary2">二次資料</span>後世の軍記・編纂物
    <span class="src-primary src-research">研究</span>研究者の解釈（説の典拠）
    ／枠だけは資料の種別：<span class="src-type">史料</span><span class="src-type">研究書</span><span class="src-type">寄稿</span>など。区分の無いものは概要（Wikipediaなど）</p>`;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 本文中の語をサイト内ページへのリンクにする。links: [{ text, person_id | battle_id | castle_id }]
  // 各語は最初に出てきた1か所だけをリンクにする
  function linkText(text, links) {
    const s = String(text ?? "");
    if (!links || !links.length) return esc(s);
    const hrefOf = (l) =>
      l.person_id ? `person.html?id=${encodeURIComponent(l.person_id)}`
      : l.battle_id ? `battle.html?id=${encodeURIComponent(l.battle_id)}`
      : l.castle_id ? `castle.html?id=${encodeURIComponent(l.castle_id)}`
      : "";
    const hits = links
      .filter((l) => l.text && hrefOf(l))
      .map((l) => ({ l, at: s.indexOf(l.text) }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at);
    let out = "";
    let pos = 0;
    for (const { l, at } of hits) {
      if (at < pos) continue;
      out += esc(s.slice(pos, at)) + `<a href="${hrefOf(l)}">${esc(l.text)}</a>`;
      pos = at + l.text.length;
    }
    return out + esc(s.slice(pos));
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">城IDが指定されていません。</p>`;
    return;
  }

  const uncertain = (o) => (o && o.uncertain ? ` <span class="uncertain-badge">諸説あり</span>` : "");

  // 「1443年（嘉吉3年）」の形
  function fmtYear(d) {
    if (!d || (!d.year && !d.era)) return "";
    if (d.year && d.era) return `${esc(d.year)}年（${esc(d.era)}）`;
    return d.year ? `${esc(d.year)}年` : esc(d.era);
  }

  // "2026-10-21" → "2026年10月21日"
  function fmtAsOf(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || ""));
    return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : String(s || "");
  }

  function personLink(name, pid) {
    return pid
      ? `<a href="person.html?id=${encodeURIComponent(pid)}">${esc(name)}</a>`
      : esc(name);
  }

  try {
    const [cRes, aRes, bRes, ciRes] = await Promise.all([
      fetch(`data/castles/${encodeURIComponent(id)}.json`),
      fetch("data/articles/index.json").then((r) => (r.ok ? r.json() : { articles: [] })).catch(() => ({ articles: [] })),
      fetch("data/battles/index.json").then((r) => (r.ok ? r.json() : { battles: [] })).catch(() => ({ battles: [] })),
      fetch("data/castles/index.json").then((r) => (r.ok ? r.json() : { castles: [] })).catch(() => ({ castles: [] })),
    ]);
    if (!cRes.ok) throw new Error("not found");
    const c = await cRes.json();
    const articles = (aRes && aRes.articles) || [];
    const battleIds = new Set(((bRes && bRes.battles) || []).map((b) => b.id));

    // 出典マーカー（人物ページと同じ表示）
    const srcMap = new Map((c.sources || []).map((s) => [s.id, s]));
    function srcMark(sourceId) {
      if (!sourceId) return "";
      if (Array.isArray(sourceId)) return sourceId.map(srcMark).join("");
      const s = srcMap.get(sourceId);
      const label = s ? s.title || sourceId : sourceId;
      const prim = s && s.primary ? `（${s.primary}）` : "";
      return ` <span class="src-mark" title="出典${prim}：${esc(label)}">出典: ${esc(label)}</span>`;
    }

    document.title = `${c.name} ｜ ぱぱねこの戦国見立て`;
    const html = [];

    // ヘッダー
    const built = fmtYear(c.built);
    const abandoned = fmtYear(c.abandoned);
    const span = built || abandoned
      ? `${built ? "築城 " + built : "築城年不詳"}${abandoned ? "　〜　廃城 " + abandoned : ""}`
      : "";
    // 写真は城一覧のデータ（index.json の photo）を使う
    const ph = (((ciRes && ciRes.castles) || []).find((x) => x.id === c.id) || {}).photo;
    let photoHTML = "";
    if (ph) {
      const credit = window.PhotoCredit.credit(ph);
      photoHTML = `
        <figure class="castle-photo">
          <img src="${esc(ph.src)}" alt="${esc(ph.caption)}">
          <figcaption>
            <span class="portrait-title">${esc(ph.caption)}</span>
            ${ph.note ? `<span class="portrait-note">${esc(ph.note)}</span>` : ""}
            <span class="img-credit">${credit}</span>
          </figcaption>
        </figure>`;
    }
    html.push(`
      <div class="person-head${ph ? " has-portrait" : ""}">
        ${photoHTML}
        <div class="person-head-main">
          <h1>${esc(c.name)}</h1>
          <p class="kana">${esc(c.kana || "")}${c.alias ? `（別名：${esc(c.alias)}）` : ""}</p>
          ${span ? `<p class="years">${span}</p>` : ""}
          ${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ""}
        </div>
      </div>
    `);

    // 基本情報
    const rows = [];
    if (c.type) rows.push(["分類", esc(c.type)]);
    if (c.place) {
      const p = c.place;
      rows.push(["所在地", esc(p.address || [p.prefecture, p.city].filter(Boolean).join(""))]);
      if (p.name) rows.push(["旧国・郡", esc(p.name)]);
    }
    if (c.built) {
      rows.push(["築城", `${built || "不詳"}${uncertain(c.built)}`]);
      if (c.built.builder) rows.push(["築城者", esc(c.built.builder)]);
    }
    rows.push(["廃城", abandoned ? `${abandoned}${uncertain(c.abandoned)}` : "—"]);
    if (c.scale) {
      const s = c.scale;
      if (s.elevation != null) rows.push(["標高", `${esc(s.elevation)}m${s.mountain ? `（${esc(s.mountain)}山頂）` : ""}`]);
      else if (s.mountain) rows.push(["立地", esc(s.mountain)]);
      if (s.extent) rows.push(["規模", `${esc(s.extent)}${s.note ? `<br><span class="muted">${esc(s.note)}</span>` : ""}${srcMark(s.sourceId)}`]);
    }
    if (c.present && c.present.designations && c.present.designations.length) {
      rows.push(["指定など", c.present.designations.map((d) => `${d.year ? esc(d.year) + "年 " : ""}${esc(d.title)}`).join("<br>")]);
    }
    if (rows.length) {
      const trs = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
      let inner = `<table class="info-table">${trs}</table>`;
      const notes = [c.built && c.built.note, c.abandoned && c.abandoned.note].filter(Boolean);
      if (notes.length) inner += notes.map((n) => `<p class="muted info-note">${linkText(n, c.links)}</p>`).join("");
      html.push(`<section class="section"><h2>基本情報</h2>${inner}</section>`);
    }

    // 歴代城主
    if (c.lords && c.lords.length) {
      const items = c.lords
        .map((l) => {
          const yrs = l.from || l.to ? `${l.from ? esc(l.from) : "?"}〜${l.to ? esc(l.to) : ""}` : "";
          return `<li>
            ${yrs ? `<span class="lord-years">${yrs}</span>` : ""}
            <b>${personLink(l.name, l.person_id)}</b>${l.role ? `<span class="muted">（${esc(l.role)}）</span>` : ""}${uncertain(l)}
            ${l.note ? `<br><span class="muted">${linkText(l.note, c.links)}</span>` : ""}${srcMark(l.sourceId)}
          </li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>歴代城主</h2><ul class="list lord-list">${items}</ul></section>`);
    }

    // 増改築の歴史（築城・改修・破却・復元などを年代順に）
    if (c.changes && c.changes.length) {
      const items = c.changes
        .map((ch) => {
          const yrs = ch.year
            ? `${esc(ch.year)}${ch.toYear ? `〜${esc(ch.toYear)}` : ""}年${ch.era ? `（${esc(ch.era)}）` : ""}`
            : esc(ch.era || "");
          return `<li>
            ${yrs ? `<span class="lord-years">${yrs}</span>` : ""}${ch.kind ? `<span class="change-kind">${esc(ch.kind)}</span>` : ""}<b>${esc(ch.title)}</b>${uncertain(ch)}
            ${ch.description ? `<br><span class="muted">${linkText(ch.description, c.links)}</span>` : ""}
            ${ch.quote ? `<blockquote class="castle-quote">${esc(ch.quote)}</blockquote>` : ""}
            ${srcMark(ch.sourceId)}
          </li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>増改築の歴史</h2><ul class="list lord-list">${items}</ul></section>`);
    }

    // 城としての特徴
    if (c.features && c.features.length) {
      const items = c.features
        .map((f) => `<li><b>${esc(f.title)}</b><br><span class="muted">${linkText(f.body, c.links)}</span>${srcMark(f.sourceId)}</li>`)
        .join("");
      html.push(`<section class="section"><h2>城としての特徴</h2><ul class="list">${items}</ul></section>`);
    }

    // 所在地（地図）
    if (c.place && (c.place.address || (c.place.lat != null && c.place.lng != null))) {
      let inner = c.place.address ? `<p class="battle-place-addr">${esc(c.place.address)}</p>` : "";
      const lat = Number(c.place.lat);
      const lng = Number(c.place.lng);
      if (isFinite(lat) && isFinite(lng)) {
        const bbox = `${lng - 0.02},${lat - 0.014},${lng + 0.02},${lat + 0.014}`;
        const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + "," + lng)}`;
        const osmFull = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
        const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lng)}`;
        inner += `<div class="topic-map"><iframe title="${esc(c.name)}の地図" src="${esc(osm)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <p class="topic-map-links"><a href="${esc(osmFull)}" target="_blank" rel="noopener">大きな地図（OpenStreetMap）</a>　/　<a href="${esc(gmap)}" target="_blank" rel="noopener">Googleマップで開く</a></p>`;
      }
      html.push(`<section class="section"><h2>所在地</h2>${inner}</section>`);
    }

    // この城で起きた合戦
    if (c.battles && c.battles.length) {
      const items = c.battles
        .map((b) => {
          const name = b.battle_id && battleIds.has(b.battle_id)
            ? `<a href="battle.html?id=${encodeURIComponent(b.battle_id)}">${esc(b.name)}</a>`
            : esc(b.name);
          return `<li>
            <span class="lord-years">${fmtYear(b)}</span><b>${name}</b>${uncertain(b)}
            ${b.description ? `<br><span class="muted">${linkText(b.description, c.links)}</span>` : ""}
            ${b.quote ? `<blockquote class="castle-quote">${esc(b.quote)}</blockquote>` : ""}
            ${srcMark(b.sourceId)}
          </li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>この城で起きた合戦</h2><ul class="list lord-list">${items}</ul></section>`);
    }

    // 現在の様子
    if (c.present) {
      let inner = c.present.status ? `<p><b>${esc(c.present.status)}</b></p>` : "";
      inner += (c.present.description || []).map((p) => `<p>${linkText(p, c.links)}</p>`).join("");
      html.push(`<section class="section"><h2>現在の様子</h2>${inner}</section>`);
    }

    // 見学情報
    if (c.visit) {
      const v = c.visit;
      // 調査時点は見出しの直下に目立たせて出す（料金・時間は変わりやすいため）
      let inner = v.asOf ? `<p class="as-of">${esc(fmtAsOf(v.asOf))} 時点の情報（${esc(v.checkedWith || "公式サイトで確認")}）</p>` : "";
      if (v.hours && v.hours.length) {
        const hasLast = v.hours.some((h) => h.last);
        const trs = v.hours
          .map((h) => `<tr><th>${esc(h.season)}</th><td>${esc(h.period)}</td><td>${esc(h.time)}</td>${hasLast ? `<td>${esc(h.last || "")}</td>` : ""}</tr>`)
          .join("");
        inner += `<h3>${esc(v.hoursTitle || "入城時間")}</h3><div class="table-scroll"><table class="info-table visit-table"><thead><tr><th>季節</th><th>期間</th><th>時間</th>${hasLast ? "<th>最終登城</th>" : ""}</tr></thead><tbody>${trs}</tbody></table></div>`;
        if (v.hoursNote) inner += `<p class="muted info-note">${esc(v.hoursNote)}</p>`;
      }
      if (v.closed) inner += `<p><b>休み：</b>${esc(v.closed)}</p>`;
      if (v.fee) inner += `<h3>観覧料</h3><p>${esc(v.fee)}</p>`;
      if (v.feeNote) inner += `<p class="muted info-note">${esc(v.feeNote)}</p>`;
      inner += `<p class="muted info-note">内容は変わることがあるので、行く前に公式サイトで最新情報を確認してください。${srcMark(v.sourceId)}</p>`;
      html.push(`<section class="section"><h2>見学情報</h2>${inner}</section>`);
    }

    // 交通アクセス
    if (c.access && c.access.length) {
      const items = c.access
        .map((a) => `<li>
          <span class="spot-type">${esc(a.mode)}</span><b>${esc(a.route)}</b>
          ${a.time ? `<br>所要：${esc(a.time)}` : ""}
          ${a.note ? `<br><span class="muted">${esc(a.note)}</span>` : ""}
        </li>`)
        .join("");
      let inner = `<ul class="list access-list">${items}</ul>`;
      if (c.accessSourceId) inner += `<p class="muted info-note">${srcMark(c.accessSourceId)}</p>`;
      if (c.official && c.official.url) {
        inner += `<p class="spot-link">公式：<a href="${esc(c.official.url)}" target="_blank" rel="noopener">${esc(c.official.name || "公式サイト")} ↗</a></p>`;
      }
      html.push(`<section class="section"><h2>交通アクセス</h2>${inner}</section>`);
    }

    // 周辺の見どころ
    if (c.spots && c.spots.length) {
      const items = c.spots
        .map((s) => {
          const place = [s.prefecture, s.city].filter(Boolean).map(esc).join(" ");
          return `<div class="spot-item">
              <span class="spot-type">${esc(s.type)}</span>
              <b>${esc(s.name)}</b>
              ${place ? `<span class="spot-place">／ ${place}</span>` : ""}
              ${s.description ? `<div class="muted">${linkText(s.description, c.links)}</div>` : ""}
              ${s.url ? `<div class="spot-link">公式：<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.urlName || "公式サイト")} ↗</a></div>` : ""}
            </div>`;
        })
        .join("");
      html.push(`<section class="section"><h2>周辺の見どころ</h2>${items}</section>`);
    }

    // 関連する考察・記事
    const rel = articles
      .filter((a) => !a.draft && (a.relatedCastles || []).includes(id))
      .sort((a, b2) => String(b2.date || "").localeCompare(String(a.date || "")));
    if (rel.length) {
      const items = rel
        .map((a) => `<div class="ref-item">
            <span class="article-cat">${esc(a.category || "記事")}</span>
            <a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a>
            ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
          </div>`)
        .join("");
      html.push(`<section class="section"><h2>関連する考察・記事</h2>${items}</section>`);
    }

    // 出典
    if (c.sources && c.sources.length) {
      const items = c.sources
        .map((s) => {
          const m = [s.author, s.publisher, s.year, s.page].filter(Boolean).map(esc).join(" / ");
          const title = s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
            : esc(s.title);
          // 塗りつぶし＝区分（色は SRC_CLASS）、枠だけ＝種別
          const badges =
            (s.primary ? `<span class="src-primary ${SRC_CLASS[s.primary] || ""}">${esc(s.primary)}</span>` : "") +
            (s.type ? `<span class="src-type">${esc(s.type)}</span>` : "");
          return `<li>${badges ? badges + " " : ""}${title}${m ? ` <span class="muted">（${m}）</span>` : ""}${s.note ? `<br><span class="muted">${esc(s.note)}</span>` : ""}</li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>出典</h2>${SRC_LEGEND}<ul class="list src-list">${items}</ul></section>`);
    }

    if (c.updatedAt) html.push(`<p class="muted">最終更新：${esc(c.updatedAt)}</p>`);

    el.innerHTML = html.join("");
    buildSideToc(el);
  } catch (err) {
    el.innerHTML = `<p class="error">城データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }

  // ワイド画面用のサイド目次（合戦ページと同じ）
  function buildSideToc(root) {
    const secs = Array.from(root.querySelectorAll("section.section"));
    if (secs.length < 2) return;
    const items = secs
      .map((s, i) => {
        const h = s.querySelector("h2");
        if (!h) return "";
        const sid = s.id || "sec-" + (i + 1);
        s.id = sid;
        return `<li><a href="#${sid}">${esc(h.textContent.trim())}</a></li>`;
      })
      .filter(Boolean)
      .join("");
    if (!items) return;
    const nav = document.createElement("nav");
    nav.className = "side-toc";
    nav.setAttribute("aria-label", "目次");
    nav.innerHTML = `<p class="toc-title">目次</p><ol>${items}</ol>`;
    // 人物ページと同じく、冒頭の枠（.person-head）の後ろに置き、枠を目次のレールの左端から広げる
    const head = root.querySelector(":scope > .person-head");
    if (head) head.after(nav);
    else root.prepend(nav);
  }
})();
