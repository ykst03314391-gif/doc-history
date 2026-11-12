// 記事詳細ページ
(async function () {
  const el = document.getElementById("article");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 開発中は article.html?id=…、公開用に書き出した article-<id>.html では <meta name="article-id"> から取る
  const idMeta = document.querySelector('meta[name="article-id"]');
  const id = new URLSearchParams(location.search).get("id") || (idMeta && idMeta.content);
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">記事IDが指定されていません。</p>`;
    return;
  }

  try {
    // メタデータ・本文・人物名の解決に必要なデータを取得
    const [artRes, mdRes, peopleRes] = await Promise.all([
      fetch("data/articles/index.json"),
      fetch(`data/articles/${encodeURIComponent(id)}.md`),
      fetch("data/people/index.json"),
    ]);
    if (!artRes.ok || !mdRes.ok) throw new Error("not found");

    const artData = await artRes.json();
    const meta = (artData.articles || []).find((a) => a.id === id);
    const series =
      meta && meta.series
        ? (artData.series || []).find((s) => s.id === meta.series)
        : null;
    const md = await mdRes.text();
    const people = peopleRes.ok ? (await peopleRes.json()).people || [] : [];
    const nameOf = (pid) => (people.find((p) => p.id === pid) || {}).name || pid;

    if (meta && meta.title) document.title = `${meta.title} ｜ ぱぱねこの戦国見立て`;

    // ヘッダー（カテゴリ・日付）。タイトルは本文 Markdown の見出しに任せる
    const head = meta
      ? `<div class="article-head">
           ${series ? `<a class="series-badge" href="articles.html">特集：${esc(series.title)}</a>` : ""}
           <span class="article-cat">${esc(meta.category || "記事")}</span>
           <span class="article-date">${esc(meta.date || "")}</span>
           ${!meta.author || meta.author === "管理人"
             ? `<span class="article-author"><img class="article-author-face" src="assets/img/chara/papaneko-face.svg" alt="">ぱぱねこ</span>`
             : `<span class="article-author">${esc(meta.author)}</span>`}
         </div>`
      : "";

    // 本文の画像 ![[castle:<id>]] / ![[battle:<id>]] / ![[person:<id>]]（| のあとに説明を書けば差し替え）。
    // 写真・肖像と権利表記は城・合戦の index.json の photo、人物の詳細ファイルの portrait から引く。
    // ![[illust:<名前>|説明]] は挿絵（assets/img/illust/<名前>.svg。AIで作ったもので、DBは引かない）
    // ![[zu:<名前>|題|説明]] は図解（assets/img/zu/<名前>.svg）。挿絵と見分けるため、罫線の箱に「図」の札と題を付ける
    // ![[manga:<名前>|題|説明]] は記事末の漫画（assets/img/manga/<名前>.svg）。朱の「漫画」の札と題を付ける
    const imgRe = /^!\[\[(castle|battle|person|illust|zu|manga):([a-z0-9-]+)(?:\|([^\]\n]*))?\]\][ \t]*$/gm;
    const refs = [...md.matchAll(imgRe)];
    const photos = new Map();
    if (refs.length) {
      const getJSON = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      const kinds = new Set(refs.map((r) => r[1]));
      const [ci, bi] = await Promise.all([
        kinds.has("castle") ? getJSON("data/castles/index.json") : null,
        kinds.has("battle") ? getJSON("data/battles/index.json") : null,
      ]);
      ((ci && ci.castles) || []).forEach((c) => c.photo && photos.set("castle:" + c.id, c.photo));
      ((bi && bi.battles) || []).forEach((b) => b.photo && photos.set("battle:" + b.id, b.photo));
      const pids = [...new Set(refs.filter((r) => r[1] === "person").map((r) => r[2]))];
      const ps = await Promise.all(pids.map((pid) => getJSON(`data/people/${pid}.json`)));
      ps.forEach((p, i) => p && p.portrait && p.portrait.src && photos.set("person:" + pids[i], p.portrait));
    }
    const figureHTML = (key, cap) => {
      if (key.startsWith("zu:")) {
        const i = cap.indexOf("|");
        const title = (i < 0 ? cap : cap.slice(0, i)).trim();
        const desc = i < 0 ? "" : cap.slice(i + 1).trim();
        return `<figure class="article-figure article-figure--zu">` +
          `<div class="zu-head"><span class="zu-label">図</span>${esc(title)}</div>` +
          `<img src="assets/img/zu/${esc(key.slice(3))}.svg" alt="${esc(title + (desc ? "。" + desc : ""))}" loading="lazy"><figcaption>` +
          (desc ? `<span class="zu-desc">${esc(desc)}</span>` : "") +
          `<span class="img-credit">作図：ぱぱねこの戦国見立て（AIで作成）</span>` +
          `</figcaption></figure>`;
      }
      if (key.startsWith("manga:")) {
        const i = cap.indexOf("|");
        const title = (i < 0 ? cap : cap.slice(0, i)).trim();
        const desc = i < 0 ? "" : cap.slice(i + 1).trim();
        return `<figure class="article-figure article-figure--manga">` +
          `<div class="manga-head"><span class="manga-label">漫画</span>${esc(title)}</div>` +
          `<img src="assets/img/manga/${esc(key.slice(6))}.svg" alt="${esc(title + (desc ? "。" + desc : ""))}" loading="lazy"><figcaption>` +
          (desc ? `<span class="manga-desc">${esc(desc)}</span>` : "") +
          `<span class="img-credit">イラスト：ぱぱねこの戦国見立て（AIで作成）</span>` +
          `</figcaption></figure>`;
      }
      if (key.startsWith("illust:")) {
        return `<figure class="article-figure article-figure--illust">` +
          `<img src="assets/img/illust/${esc(key.slice(7))}.svg" alt="${esc(cap)}" loading="lazy"><figcaption>` +
          (cap ? `<span class="portrait-title">${esc(cap)}</span>` : "") +
          `<span class="img-credit">イラスト：ぱぱねこの戦国見立て（AIで作成）</span>` +
          `</figcaption></figure>`;
      }
      const ph = photos.get(key);
      if (!ph) return "";
      const credit = window.PhotoCredit.credit(ph);
      const title = cap || ph.caption || "";
      return `<figure class="article-figure${key.startsWith("person:") ? " article-figure--portrait" : ""}">` +
        `<img src="${esc(ph.src)}" alt="${esc(title)}" loading="lazy"><figcaption>` +
        (title ? `<span class="portrait-title">${esc(title)}</span>` : "") +
        (!cap && ph.note ? `<span class="portrait-note">${esc(ph.note)}</span>` : "") +
        (credit ? `<span class="img-credit">${credit}</span>` : "") +
        `</figcaption></figure>`;
    };

    // 本文（Markdown → HTML）。原文の引用 {{…}} は人物ページと同じく「…」に括って色を変える。
    // ==…== は論拠の要を示すマーカー（太字 **…** は筆者の主張）
    const quoted = md
      .replace(imgRe, (m, kind, rid, cap) => `\n${figureHTML(kind + ":" + rid, (cap || "").trim())}\n`)
      // 漫画が続けて2本以上あるときは、1つの枠に入れて横に並べる（狭い画面では縦に積む）
      .replace(/(?:<figure class="article-figure article-figure--manga">[\s\S]*?<\/figure>\s*){2,}/g,
        (m) => `\n<div class="manga-row">${m.trim().replace(/<\/figure>\s+<figure/g, "</figure><figure")}</div>\n\n`)
      .replace(/\{\{([^{}]*)\}\}/g, (m, q) => `<span class="quote">「${q}」</span>`)
      .replace(/==([^=\n]+)==/g, (m, t) => `<mark>${t}</mark>`)
      // 筆者（ぱぱねこ＝管理人）の意見の囲み。<div class="my-view"> と </div> を空行で挟んで書く（中は Markdown のまま）
      .replace(/<div class="my-view">/g,
        `<div class="my-view"><span class="my-view-label">ぱぱねこの見立て</span>`);
    const bodyHTML =
      typeof marked !== "undefined"
        ? marked.parse(quoted)
        : `<pre>${esc(md)}</pre>`;

    // 関連人物（DB連携）
    let related = "";
    if (meta && meta.relatedPeople && meta.relatedPeople.length) {
      const links = meta.relatedPeople
        .map(
          (pid) =>
            `<a class="tag tag-link" href="person.html?id=${encodeURIComponent(pid)}">${esc(nameOf(pid))}</a>`
        )
        .join(" ");
      related = `<div class="related-people">
          <h3>関連人物</h3>
          <p>${links}</p>
        </div>`;
    }

    // 関連書籍（アフィリエイト）。可読性のため本文には挟まず、記事の末尾にだけ置く
    let books = "";
    if (meta && meta.references && meta.references.length) {
      // 書影は Amazon の画像を引かず、書名を縦書きにした札で代える
      const items = meta.references
        .map((r) => {
          const buy = r.affiliateUrl
            ? `<a class="btn btn-primary book-buy" href="${esc(r.affiliateUrl)}" target="_blank" rel="noopener sponsored nofollow">Amazonで見る</a>`
            : "";
          return `<li class="book-card">
              <div class="book-cover" aria-hidden="true"><span>${esc(r.title)}</span></div>
              <div class="book-info">
                <p class="book-title">${esc(r.title)}</p>
                ${r.author ? `<p class="book-author">${esc(r.author)}</p>` : ""}
                ${r.note ? `<p class="book-note">${esc(r.note)}</p>` : ""}
                ${buy}
              </div>
            </li>`;
        })
        .join("");
      books = `<section class="article-books">
          <h3>関連書籍</h3>
          <ul class="book-list">${items}</ul>
          <p class="affiliate-disclosure">※ 関連書籍のリンクにはアフィリエイトを含みます。Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。</p>
        </section>`;
    }

    // 誤り・出典のご指摘の窓口（docs/公開の方針.md「読者の声の受け方」）。
    // 外部のフォームの URL が決まるまでは、押せない見本として出す
    const FEEDBACK_URL = "";
    const feedback = `<section class="article-feedback">
        <h3>誤り・出典のご指摘</h3>
        <p>事実や出典の誤り、原文との食い違いに気づいたら、お知らせください。いただいた内容は公開せず、管理人だけが読んで記事を直す手がかりにします。</p>
        ${FEEDBACK_URL
          ? `<a class="btn" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener">ご指摘のフォームを開く</a>`
          : `<span class="btn is-disabled" aria-disabled="true">ご指摘のフォームを開く</span> <span class="muted">（見本：フォームは未作成）</span>`}
      </section>`;

    // 本文をDOM化して、冒頭画像の挿入と目次(TOC)生成を行う
    const tmp = document.createElement("div");
    tmp.innerHTML = bodyHTML;

    // 冒頭画像（最初の見出しの直後に差し込む）
    if (meta && meta.image && meta.image.src) {
      const im = meta.image;
      const link = (t, url) =>
        url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t);
      const credit = [
        im.credit ? link(im.credit, im.sourceUrl) : "",
        im.license ? link(im.license, im.licenseUrl) : "",
      ].filter(Boolean).join("／");
      const cap =
        im.caption || credit
          ? `<figcaption>${esc(im.caption || "")}${credit ? ` <span class="img-credit">（${credit}）</span>` : ""}</figcaption>`
          : "";
      const fig = document.createElement("figure");
      fig.className = "article-hero";
      fig.innerHTML = `<img src="${esc(im.src)}" alt="${esc(im.caption || meta.title || "")}" loading="lazy">${cap}`;
      const h1 = tmp.querySelector("h1");
      if (h1) h1.after(fig);
      else tmp.prepend(fig);
    }

    // 参考文献・出典（本文末の「## 参考文献・出典」以下）は本文の枠から出し、関連人物の下に関連書籍と同じ形で置く
    let sources = "";
    const srcHead = Array.from(tmp.querySelectorAll("h2")).find((h) => /^(参考文献|出典)/.test(h.textContent.trim()));
    if (srcHead) {
      const prev = srcHead.previousElementSibling;
      if (prev && prev.tagName === "HR") prev.remove();
      const box = document.createElement("div");
      while (srcHead.nextSibling) box.appendChild(srcHead.nextSibling);
      box.querySelectorAll("ul").forEach((u) => u.classList.add("list"));
      box.querySelectorAll("p").forEach((p) => {
        if (p.textContent.trim().startsWith("※")) p.className = "sources-note";
      });
      sources = `<section class="article-books">
          <h3>${esc(srcHead.textContent.trim())}</h3>
          ${box.innerHTML}
        </section>`;
      srcHead.remove();
    }

    // 目次（h2 見出しから生成。2個以上あるときだけ。ワイド画面で左余白に表示）
    let toc = "";
    const heads = Array.from(tmp.querySelectorAll("h2"));
    if (heads.length >= 2) {
      const items = heads
        .map((h, i) => {
          const secId = "sec-" + (i + 1);
          h.id = secId;
          return `<li><a href="#${secId}">${esc(h.textContent || "")}</a></li>`;
        })
        .join("");
      toc = `<nav class="side-toc" aria-label="目次"><p class="toc-title">目次</p><ol>${items}</ol></nav>`;
    }

    el.innerHTML = `${head}${toc}<div class="article-body">${tmp.innerHTML}</div>${related}${sources}${books}${feedback}`;
  } catch (err) {
    el.innerHTML = `<p class="error">記事を読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
