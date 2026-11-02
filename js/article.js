// 記事詳細ページ
(async function () {
  const el = document.getElementById("article");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
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

    if (meta && meta.title) document.title = `${meta.title} ｜ 戦国クロニクル`;

    // ヘッダー（カテゴリ・日付）。タイトルは本文 Markdown の見出しに任せる
    const head = meta
      ? `<div class="article-head">
           ${series ? `<a class="series-badge" href="articles.html">特集：${esc(series.title)}</a>` : ""}
           <span class="article-cat">${esc(meta.category || "記事")}</span>
           <span class="article-date">${esc(meta.date || "")}</span>
           ${meta.author ? `<span class="article-author">${esc(meta.author)}</span>` : ""}
         </div>`
      : "";

    // 本文（Markdown → HTML）。原文の引用 {{…}} は人物ページと同じく「…」に括って色を変える。
    // ==…== は論拠の要を示すマーカー（太字 **…** は筆者の主張）
    const quoted = md
      .replace(/\{\{([^{}]*)\}\}/g, (m, q) => `<span class="quote">「${q}」</span>`)
      .replace(/==([^=\n]+)==/g, (m, t) => `<mark>${t}</mark>`);
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
      const items = meta.references
        .map((r) => {
          const label =
            esc(r.title) + (r.author ? ` <span class="muted">${esc(r.author)}</span>` : "");
          const body = r.affiliateUrl
            ? `<a href="${esc(r.affiliateUrl)}" target="_blank" rel="noopener sponsored nofollow">${label}</a>`
            : label;
          return `<li>${body}${r.note ? ` <span class="muted">（${esc(r.note)}）</span>` : ""}</li>`;
        })
        .join("");
      books = `<section class="article-books">
          <h3>関連書籍</h3>
          <ul class="list">${items}</ul>
          <p class="affiliate-disclosure">※ 関連書籍のリンクにはアフィリエイトを含みます。Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。</p>
        </section>`;
    }

    // 本文をDOM化して、冒頭画像の挿入と目次(TOC)生成を行う
    const tmp = document.createElement("div");
    tmp.innerHTML = bodyHTML;

    // 冒頭画像（最初の見出しの直後に差し込む）
    if (meta && meta.image && meta.image.src) {
      const im = meta.image;
      const credit = [im.credit, im.license].filter(Boolean).map(esc).join("／");
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

    el.innerHTML = `${head}${toc}<div class="article-body">${tmp.innerHTML}</div>${related}${sources}${books}`;
  } catch (err) {
    el.innerHTML = `<p class="error">記事を読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
