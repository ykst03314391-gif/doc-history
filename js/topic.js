// トピック詳細ページ（B＝最新情報の詳細）。一覧のカードから遷移してくる。
(async function () {
  const el = document.getElementById("topic");
  if (!el) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    el.innerHTML = `<p class="error">トピックIDが指定されていません。</p>`;
    return;
  }

  function infoTable(t) {
    const rows = [];
    if (t.period && (t.period.from || t.period.to)) {
      rows.push(["会期", `${esc(t.period.from || "")} 〜 ${esc(t.period.to || "")}`]);
    }
    if (t.place && (t.place.name || t.place.prefecture)) {
      let loc = esc([t.place.prefecture, t.place.city, t.place.name].filter(Boolean).join(" "));
      if (t.place.address) loc += `<br><span class="muted">${esc(t.place.address)}</span>`;
      if (t.place.prefecture) {
        loc += `<br><a href="regions.html?pref=${encodeURIComponent(t.place.prefecture)}">${esc(t.place.prefecture)}のゆかりの人物・史跡を見る →</a>`;
      }
      rows.push(["会場", loc]);
    }
    if (t.platform) rows.push(["対応", esc(t.platform)]);
    (t.info || []).forEach((r) => {
      if (r && r.label) rows.push([r.label, esc(r.value)]);
    });
    if (!rows.length) return "";
    return `<dl class="facts">${rows
      .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
      .join("")}</dl>`;
  }

  function listSection(title, items, li) {
    if (!items || !items.length) return "";
    return `<section class="topic-section"><h2>${esc(title)}</h2><ul class="list">${items
      .map(li)
      .join("")}</ul></section>`;
  }

  function textSection(title, text) {
    if (!text) return "";
    return `<section class="topic-section"><h2>${esc(title)}</h2><p class="topic-detail-body">${esc(text)}</p></section>`;
  }

  function render(t, peopleName, articleTitle) {
    if (t.title) document.title = `${t.title} ｜ ぱぱねこの戦国見立て`;

    const source =
      t.source && t.source.name
        ? t.source.url
          ? `<a href="${esc(t.source.url)}" target="_blank" rel="noopener">${esc(t.source.name)}</a>`
          : esc(t.source.name)
        : "";

    const relArticles = (t.relatedArticles || [])
      .map(
        (aid) =>
          `<a class="topic-to-article" href="article.html?id=${encodeURIComponent(aid)}">→ 深掘りを読む：${esc(articleTitle.get(aid) || "考察記事")}</a>`
      )
      .join("");
    const relPeople = (t.relatedPeople || [])
      .map(
        (pid) =>
          `<a class="topic-to-person" href="person.html?id=${encodeURIComponent(pid)}">${esc(peopleName.get(pid) || pid)}</a>`
      )
      .join("");

    const tags = (t.tags || [])
      .map((x) => `<span class="tag">${esc(x)}</span>`)
      .join("");

    const imagesHtml =
      t.images && t.images.length
        ? `<div class="topic-images">${t.images
            .map((im) => {
              const cap = [im.caption, [im.credit, im.license].filter(Boolean).join("／")]
                .filter(Boolean)
                .map((x, i) => (i === 0 ? esc(x) : `<span class="img-credit">（${esc(x)}）</span>`))
                .join(" ");
              return `<figure class="topic-figure">
                <img src="${esc(im.src)}" alt="${esc(im.caption || t.title)}" loading="lazy">
                ${cap ? `<figcaption>${cap}</figcaption>` : ""}
              </figure>`;
            })
            .join("")}</div>`
        : "";

    let mapHtml = "";
    if (t.place && t.place.lat != null && t.place.lng != null) {
      const lat = Number(t.place.lat);
      const lng = Number(t.place.lng);
      if (isFinite(lat) && isFinite(lng)) {
        const bbox = `${lng - 0.006},${lat - 0.004},${lng + 0.006},${lat + 0.004}`;
        const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lat + "," + lng)}`;
        const osmFull = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
        const gmap = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat + "," + lng)}`;
        mapHtml = `<section class="topic-section"><h2>会場の地図</h2>
          <div class="topic-map"><iframe title="会場の地図" src="${esc(osmEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
          <p class="topic-map-links"><a href="${esc(osmFull)}" target="_blank" rel="noopener">大きな地図（OpenStreetMap）</a>　/　<a href="${esc(gmap)}" target="_blank" rel="noopener">Googleマップで開く</a></p>
        </section>`;
      }
    }

    const highlightsHtml = listSection("見どころ", t.highlights, (h) => `<li>${esc(h)}</li>`);
    const eventsHtml = listSection(
      "関連イベント",
      t.events,
      (e) =>
        `<li><b>${esc(e.name)}</b>${e.schedule ? `<br><span class="muted">${esc(e.schedule)}</span>` : ""}${e.note ? `<br><span class="muted">${esc(e.note)}</span>` : ""}</li>`
    );

    // ストリームで中身のレイアウトを変える（新説は専用の4部構成）
    let middleHtml;
    if (t.stream === "新説") {
      const compareHtml =
        t.conventional || t.revision
          ? `<section class="topic-section"><h2>従来と何が違うか</h2>
               <div class="revision-compare">
                 <div class="rc-col rc-old"><span class="rc-label">従来（通説）</span><p>${esc(t.conventional || "")}</p></div>
                 <div class="rc-col rc-new"><span class="rc-label">新説</span><p>${esc(t.revision || "")}</p></div>
               </div>
             </section>`
          : "";
      middleHtml = `
        ${textSection("情報元の概要", t.sourceOverview)}
        ${textSection("内容の詳細", t.detail || t.body)}
        ${compareHtml}
        ${t.comment ? `<section class="topic-section"><h2>管理人のコメント</h2><div class="topic-comment">${esc(t.comment)}</div></section>` : ""}
      `;
    } else {
      middleHtml = `
        ${t.body ? `<p class="topic-detail-body">${esc(t.body)}</p>` : ""}
        ${infoTable(t)}
        ${mapHtml}
        ${highlightsHtml}
        ${eventsHtml}
        ${t.take ? `<div class="topic-take"><span class="take-label">ひとこと</span>${esc(t.take)}</div>` : ""}
      `;
    }

    let buyHtml = "";
    if (t.buy && t.buy.length) {
      // 見出し・ボタン文言はストリームに合わせる（buyLabel で個別上書きも可）
      const buyLabel =
        t.buyLabel ||
        (t.stream === "お出かけ"
          ? "宿・チケットを予約する"
          : t.stream === "ゲーム"
            ? "購入・予約"
            : "関連書籍");
      const verb = t.stream === "お出かけ" ? "で予約・確認" : "で見る";
      const hasAmazon = t.buy.some(
        (b) => /amazon/i.test(b.shop || "") || /amazon\./i.test(b.url || "")
      );
      const disclosure =
        "※ 上記リンクにはアフィリエイト（提携先の広告）を含み、リンク経由の予約・購入で当サイトに収入が入ることがあります。" +
        (hasAmazon ? "Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。" : "");
      buyHtml = `<section class="topic-section topic-buy">
          <h2>${esc(buyLabel)}</h2>
          <div class="buy-links">${t.buy
            .map(
              (b) =>
                `<a class="btn btn-primary buy-btn" href="${esc(b.url)}" target="_blank" rel="noopener sponsored nofollow">${esc(b.shop || "ショップ")}${verb}${b.note ? ` <span class="buy-note">（${esc(b.note)}）</span>` : ""}</a>`
            )
            .join("")}</div>
          <p class="affiliate-disclosure">${esc(disclosure)}</p>
        </section>`;
    }

    el.innerHTML = `
      <article class="topic-detail">
        <div class="topic-head">
          <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
          <span class="topic-date">${esc(t.date || "")}</span>
        </div>
        <h1 class="topic-detail-title">${esc(t.title)}</h1>
        ${t.summary ? `<p class="topic-detail-summary">${esc(t.summary)}</p>` : ""}
        ${imagesHtml}
        ${middleHtml}
        ${buyHtml}
        ${source ? `<p class="topic-source">出どころ：${source}</p>` : ""}
        ${
          relArticles || relPeople
            ? `<div class="topic-detail-links">
                 ${relArticles}
                 ${relPeople ? `<p class="topic-people">関連人物：${relPeople}</p>` : ""}
               </div>`
            : ""
        }
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        <p class="topic-note muted">${
          t.stream === "新説"
            ? `※ 新説の紹介です。より詳しい考察は<a href="articles.html">考察・記事</a>で発信します。`
            : `※ ここは「お知らせ」です。踏み込んだ考察は<a href="articles.html">考察・記事</a>で発信します。`
        }</p>
      </article>`;
  }

  try {
    const [tRes, pRes, aRes] = await Promise.all([
      fetch("data/topics/index.json"),
      fetch("data/people/index.json").catch(() => null),
      fetch("data/articles/index.json").catch(() => null),
    ]);
    if (!tRes.ok) throw new Error(tRes.status);
    const topic = ((await tRes.json()).topics || []).find((t) => t.id === id);
    if (!topic) {
      el.innerHTML = `<p class="error">トピックが見つかりませんでした（ID: ${esc(id)}）。</p>`;
      return;
    }
    const peopleName = new Map();
    const articleTitle = new Map();
    if (pRes && pRes.ok) for (const p of (await pRes.json()).people || []) peopleName.set(p.id, p.name);
    if (aRes && aRes.ok) for (const a of (await aRes.json()).articles || []) articleTitle.set(a.id, a.title);
    render(topic, peopleName, articleTitle);
  } catch (err) {
    el.innerHTML = `<p class="error">トピックの読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }
})();
