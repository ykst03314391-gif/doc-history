// 出典一覧ページ：一次・二次・三次資料ごとに、資料名の50音順で並べる
(async function () {
  const root = document.getElementById("sources");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 50音の行見出し。読みの先頭1文字から行を判定する（濁音・半濁音・小書きも同じ行）
  const ROWS = [
    ["あ行", "ぁあぃいぅうゔぇえぉお"],
    ["か行", "かがきぎくぐけげこご"],
    ["さ行", "さざしじすずせぜそぞ"],
    ["た行", "ただちぢっつづてでとど"],
    ["な行", "なにぬねの"],
    ["は行", "はばぱひびぴふぶぷへべぺほぼぽ"],
    ["ま行", "まみむめも"],
    ["や行", "ゃやゅゆょよ"],
    ["ら行", "らりるれろ"],
    ["わ行", "ゎわゐゑをん"],
  ];
  function rowOf(s) {
    const c = (s.yomi || "").trim().charAt(0);
    const row = ROWS.find(([, chars]) => chars.includes(c));
    return row ? row[0] : "その他";
  }
  const collator = new Intl.Collator("ja");

  // 使用ページへのリンク先と、名前を引く索引
  const PAGES = {
    article: { label: "考察", href: "article.html", index: "data/articles/index.json", key: "articles", name: "title" },
    person: { label: "人物", href: "person.html", index: "data/people/index.json", key: "people", name: "name" },
    battle: { label: "合戦", href: "battle.html", index: "data/battles/index.json", key: "battles", name: "name" },
    castle: { label: "城", href: "castle.html", index: "data/castles/index.json", key: "castles", name: "name" },
    topic: { label: "最新", href: "topic.html", index: "data/topics/index.json", key: "topics", name: "title" },
  };

  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} の読み込みに失敗しました`);
    return res.json();
  }

  function usedInHTML(usedIn, names) {
    if (!usedIn || !usedIn.length) return "";
    const links = usedIn
      .map((u) => {
        const page = PAGES[u.type];
        if (!page) return "";
        const name = names[u.type][u.id] || u.id;
        // 記事は公開用の書き出し（tools/build-site.py）で article-<id>.html に替わるので、その形で書いておく
        const href = u.type === "article"
          ? `article.html?id=${encodeURIComponent(u.id)}`
          : `${page.href}?id=${encodeURIComponent(u.id)}`;
        return `<a class="tag tag-link" href="${href}">${esc(page.label)}：${esc(name)}</a>`;
      })
      .join("");
    return `<div class="tags src-used">${links}</div>`;
  }

  function itemHTML(s, names) {
    const title = s.url
      ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
      : esc(s.title);
    const meta = [s.author, s.publication, s.era, s.year ? `${s.year}年` : ""]
      .filter(Boolean)
      .map(esc)
      .join(" / ");
    // 史料名は読みにくいので読みを添える（論文・Web記事は省く）
    const yomi = s.kind === "史料" ? ` <span class="muted">（${esc(s.yomi)}）</span>` : "";
    return `
      <li class="src-entry">
        <p class="src-entry-title">${s.kind ? `<span class="src-type">${esc(s.kind)}</span> ` : ""}<strong>${title}</strong>${yomi}</p>
        ${meta ? `<p class="muted">${meta}</p>` : ""}
        ${s.note ? `<p class="src-entry-note">${esc(s.note)}</p>` : ""}
        ${usedInHTML(s.usedIn, names)}
      </li>`;
  }

  try {
    const data = await loadJSON("data/sources.json");

    // 使用ページの名前を各索引から引く（読めなかった索引は id 表示で代用）
    const names = {};
    await Promise.all(
      Object.entries(PAGES).map(async ([type, page]) => {
        names[type] = {};
        try {
          const idx = await loadJSON(page.index);
          (idx[page.key] || []).forEach((x) => (names[type][x.id] = x[page.name]));
        } catch (e) {
          /* 名前が引けなくてもリンクは出す */
        }
      })
    );

    const html = data.levels
      .map((lv) => {
        const items = data.sources
          .filter((s) => s.level === lv.id)
          .sort((a, b) => collator.compare(a.yomi || "", b.yomi || ""));
        if (!items.length) return "";
        let body = "";
        let lastRow = "";
        items.forEach((s) => {
          const row = rowOf(s);
          if (row !== lastRow) {
            if (lastRow) body += "</ul>";
            body += `<h3 class="kana-row-heading">${row}</h3><ul class="src-entries">`;
            lastRow = row;
          }
          body += itemHTML(s, names);
        });
        body += "</ul>";
        return `
          <section class="section" id="level-${lv.id}">
            <h2>${esc(lv.title)}<span class="head-note">${items.length}件</span></h2>
            <p class="lead">${esc(lv.description)}</p>
            ${body}
          </section>`;
      })
      .join("");

    root.innerHTML = html;
  } catch (e) {
    root.innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
})();
