// 大名家詳細ページ
(function () {
  const contentEl = document.getElementById("content");

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
    contentEl.innerHTML = `<p class="error">大名家IDが指定されていません。</p>`;
    return;
  }

  function memberLink(m) {
    const label = esc(m.name || m.person_id || "");
    if (m.person_id) {
      return `<a href="person.html?id=${encodeURIComponent(m.person_id)}">${label}</a>`;
    }
    return label;
  }

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

  function render(c, kamonImage) {
    document.title = `${c.name} ｜ 戦国クロニクル`;
    const html = [];

    // ヘッダー
    const facts = [];
    if (c.kamon) facts.push(`家紋：${esc(c.kamon)}`);
    if (c.base && c.base.name) facts.push(`本拠：${esc(c.base.name)}`);
    // 家紋の絵は大名家一覧のデータ（index.json の kamonImage）を使う
    const k = kamonImage;
    const kamonHTML = k
      ? `
        <figure class="kamon-figure">
          <img src="${esc(k.src)}" alt="家紋：${esc(c.kamon || "")}">
          <figcaption>
            <span class="portrait-title">${esc(c.kamon || "家紋")}</span>
            ${k.colorNote ? `<span class="portrait-note">${esc(k.colorNote)}</span>` : ""}
            <span class="img-credit">${creditHTML(k)}</span>
          </figcaption>
        </figure>`
      : "";
    html.push(`
      <div class="person-head${k ? " has-portrait" : ""}">
        ${kamonHTML}
        <div class="person-head-main">
          <h1>${esc(c.name)}</h1>
          <p class="kana">${esc(c.kana || "")}</p>
          ${facts.length ? `<p class="years">${facts.join("　／　")}</p>` : ""}
          ${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ""}
        </div>
      </div>
    `);

    // 説明本文（段落配列）
    if (c.description && c.description.length) {
      const body = c.description.map((p) => `<p>${linkText(p, c.links)}</p>`).join("");
      html.push(`<section class="section"><h2>この家について</h2>${body}</section>`);
    }

    // 所属人物：一門 と ゆかりの人物（家臣／その他）に分ける
    const members = c.members || [];
    const memberItem = (m) => `<div class="spot-item">
        <b>${memberLink(m)}</b>
        ${m.role ? `<span class="muted">／ ${esc(m.role)}</span>` : ""}
      </div>`;
    const memberList = (list) => list.map(memberItem).join("");

    // type 未設定は「一門」扱い
    const ichimon = members.filter((m) => !m.type || m.type === "一門");
    const kashin = members.filter((m) => m.type === "家臣");
    const other = members.filter((m) => m.type === "その他");

    if (ichimon.length) {
      const headName = c.head && c.head.name ? esc(c.head.name) : "";
      const headLabel =
        c.head && c.head.person_id
          ? `<a href="person.html?id=${encodeURIComponent(c.head.person_id)}">${headName}</a>`
          : headName;
      const headNote = headName
        ? `<span class="head-note">主：${headLabel}（この人から見た続柄）</span>`
        : "";
      html.push(`<section class="section"><h2>一門${headNote}</h2>${memberList(ichimon)}</section>`);
    }
    if (kashin.length || other.length) {
      let inner = "";
      if (kashin.length) {
        inner += `<h3 class="series-group">家臣</h3>${memberList(kashin)}`;
      }
      if (other.length) {
        inner += `<h3 class="series-group">その他（親交のあった人物など）</h3>${memberList(other)}`;
      }
      html.push(`<section class="section"><h2>ゆかりの人物</h2>${inner}</section>`);
    }

    if (c.updatedAt) {
      html.push(`<p class="muted">最終更新：${esc(c.updatedAt)}</p>`);
    }

    contentEl.innerHTML = html.join("");
    buildSideToc(contentEl);
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
    root.prepend(nav);
  }

  Promise.all([
    fetch(`data/clans/${encodeURIComponent(id)}.json`).then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    }),
    fetch("data/clans/index.json").then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
    .then(([c, idx]) => render(c, (((idx && idx.clans) || []).find((x) => x.id === c.id) || {}).kamonImage))
    .catch((err) => {
      contentEl.innerHTML = `<p class="error">大名家データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
      console.error(err);
    });
})();
