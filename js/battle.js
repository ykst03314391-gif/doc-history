// 合戦詳細ページ
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
    el.innerHTML = `<p class="error">合戦IDが指定されていません。</p>`;
    return;
  }

  function fmtDate(d) {
    if (!d) return "";
    if (d.era) return esc(d.era);
    const p = [];
    if (d.year) p.push(d.year + "年");
    if (d.month) p.push(d.month + "月");
    if (d.day) p.push(d.day + "日");
    return p.join("");
  }

  function commander(c) {
    const label = esc(c.name || c.person_id || "");
    const name = c.person_id
      ? `<a href="person.html?id=${encodeURIComponent(c.person_id)}">${label}</a>`
      : label;
    // 従軍したか確かでない武将には「要確認」の札を付ける（理由は陣営の note に書く）
    return c.uncertain ? `${name}<span class="uncertain-badge">要確認</span>` : name;
  }

  function outcomeClass(o) {
    if (o === "勝利") return "win";
    if (o === "敗北") return "lose";
    return "draw";
  }

  try {
    const [bRes, aRes, biRes] = await Promise.all([
      fetch(`data/battles/${encodeURIComponent(id)}.json`),
      fetch("data/articles/index.json").then((r) => (r.ok ? r.json() : { articles: [] })).catch(() => ({ articles: [] })),
      fetch("data/battles/index.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    if (!bRes.ok) throw new Error("not found");
    const b = await bRes.json();
    const articles = (aRes && aRes.articles) || [];

    document.title = `${b.name} ｜ ぱぱねこの戦国見立て`;
    const html = [];

    // ヘッダー
    const meta = [fmtDate(b.date), b.place && b.place.name ? esc(b.place.name) : ""]
      .filter(Boolean)
      .join("　／　");
    // 写真は合戦一覧のデータ（index.json の photo）を使う
    const ph = (((biRes && biRes.battles) || []).find((x) => x.id === b.id) || {}).photo;
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
          <h1>${esc(b.name)}</h1>
          <p class="kana">${esc(b.kana || "")}</p>
          ${meta ? `<p class="years">${meta}</p>` : ""}
          ${b.summary ? `<p class="summary">${esc(b.summary)}</p>` : ""}
        </div>
      </div>
    `);

    // 対戦した陣営
    if (b.sides && b.sides.length) {
      const cards = b.sides
        .map((s) => {
          const cmds = (s.commanders || []).map(commander).join("、");
          const parts = (s.participants || []).map(commander).join("、");
          return `<div class="side-card side-${outcomeClass(s.outcome)}">
              <div class="side-head">
                <span class="side-name">${esc(s.name)}</span>
                ${s.outcome ? `<span class="side-outcome">${esc(s.outcome)}</span>` : ""}
              </div>
              ${cmds ? `<div class="side-cmd"><span class="side-label">大将</span>${cmds}</div>` : ""}
              ${parts ? `<div class="side-cmd"><span class="side-label">従軍</span>${parts}</div>` : ""}
              ${s.note ? `<p class="side-note muted">${linkText(s.note, b.links)}</p>` : ""}
            </div>`;
        })
        .join(`<div class="side-vs">対</div>`);
      let inner = `<div class="sides">${cards}</div>`;
      if (b.result) inner += `<p class="battle-result">${linkText(b.result, b.links)}</p>`;
      html.push(`<section class="section"><h2>対戦した陣営</h2>${inner}</section>`);
    }

    // 解説
    if (b.description && b.description.length) {
      const body = b.description.map((p) => `<p>${linkText(p, b.links)}</p>`).join("");
      html.push(`<section class="section"><h2>解説</h2>${body}</section>`);
    }

    // 古戦場（現在地・地図）
    if (b.place && (b.place.address || (b.place.lat != null && b.place.lng != null))) {
      let inner = b.place.address
        ? `<p class="battle-place-addr">現在地：${esc(b.place.address)}</p>`
        : "";
      const lat = Number(b.place.lat);
      const lng = Number(b.place.lng);
      if (isFinite(lat) && isFinite(lng)) {
        const bbox = `${lng - 0.02},${lat - 0.014},${lng + 0.02},${lat + 0.014}`;
        const osm = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + "," + lng)}`;
        const osmFull = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
        const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lng)}`;
        inner += `<div class="topic-map"><iframe title="古戦場の地図" src="${esc(osm)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <p class="topic-map-links"><a href="${esc(osmFull)}" target="_blank" rel="noopener">大きな地図（OpenStreetMap）</a>　/　<a href="${esc(gmap)}" target="_blank" rel="noopener">Googleマップで開く</a></p>`;
      }
      html.push(`<section class="section"><h2>古戦場（現在地）</h2>${inner}</section>`);
    }

    // 関連する史跡
    if (b.spots && b.spots.length) {
      const items = b.spots
        .map((s) => {
          const place = [s.prefecture, s.city].filter(Boolean).map(esc).join(" ");
          return `<div class="spot-item">
              <span class="spot-type">${esc(s.type)}</span>
              <b>${esc(s.name)}</b>
              ${place ? `<span class="spot-place">／ ${place}</span>` : ""}
              ${s.description ? `<div class="muted">${linkText(s.description, b.links)}</div>` : ""}
              ${s.url ? `<div class="spot-link">公式：<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.urlName || "公式サイト")} ↗</a></div>` : ""}
            </div>`;
        })
        .join("");
      html.push(`<section class="section"><h2>関連する史跡</h2>${items}</section>`);
    }

    // 時系列（合戦の経過）
    if (b.timeline && b.timeline.length) {
      const items = b.timeline
        .map(
          (t) => `<li>
            <span class="bt-title">${esc(t.title)}</span>
            ${t.description ? `<br><span class="bt-desc">${linkText(t.description, b.links)}</span>` : ""}
          </li>`
        )
        .join("");
      html.push(`<section class="section"><h2>時系列</h2><ul class="battle-timeline">${items}</ul></section>`);
    }

    // 逸話
    if (b.episodes && b.episodes.length) {
      const items = b.episodes
        .map(
          (e) => `<li><b>${esc(e.title)}</b>${
            e.uncertain ? ` <span class="uncertain-badge">諸説あり</span>` : ""
          }<br><span class="muted">${linkText(e.body, b.links)}</span></li>`
        )
        .join("");
      html.push(`<section class="section"><h2>逸話</h2><ul class="list">${items}</ul></section>`);
    }

    // 関連する考察・記事
    const rel = articles
      .filter((a) => !a.draft && (a.relatedBattles || []).includes(id))
      .sort((a, b2) => String(b2.date || "").localeCompare(String(a.date || "")));
    if (rel.length) {
      const items = rel
        .map(
          (a) => `<div class="ref-item">
            <span class="article-cat">${esc(a.category || "記事")}</span>
            <a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a>
            ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
          </div>`
        )
        .join("");
      html.push(`<section class="section"><h2>関連する考察・記事</h2>${items}</section>`);
    }

    // 出典
    if (b.sources && b.sources.length) {
      const items = b.sources
        .map((s) => {
          const m = [s.author, s.publisher, s.year, s.page].filter(Boolean).map(esc).join(" / ");
          const title = s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
            : esc(s.title);
          // 塗りつぶし＝区分（色は SRC_CLASS）、枠だけ＝種別
          const badges =
            (s.primary ? `<span class="src-primary ${SRC_CLASS[s.primary] || ""}">${esc(s.primary)}</span>` : "") +
            (s.type ? `<span class="src-type">${esc(s.type)}</span>` : "");
          return `<li>${badges ? badges + " " : ""}${title}${m ? ` <span class="muted">（${m}）</span>` : ""}</li>`;
        })
        .join("");
      html.push(`<section class="section"><h2>出典</h2>${SRC_LEGEND}<ul class="list src-list">${items}</ul></section>`);
    }

    if (b.updatedAt) html.push(`<p class="muted">最終更新：${esc(b.updatedAt)}</p>`);

    el.innerHTML = html.join("");
    buildSideToc(el);
  } catch (err) {
    el.innerHTML = `<p class="error">合戦データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }

  // ワイド画面用のサイド目次（左の余白に固定表示）。section.section の h2 から生成
  function buildSideToc(root) {
    const secs = Array.from(root.querySelectorAll("section.section"));
    if (secs.length < 2) return;
    const items = secs
      .map((s, i) => {
        const h = s.querySelector("h2");
        if (!h) return "";
        const sid = s.id || "sec-" + (i + 1);
        s.id = sid;
        // h2 直下のテキストノードだけを見出しに使う（補足の span 等は除外）
        let label = "";
        h.childNodes.forEach((n) => {
          if (n.nodeType === 3) label += n.textContent;
        });
        label = (label.trim() || h.textContent || "").trim();
        return `<li><a href="#${sid}">${esc(label)}</a></li>`;
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
