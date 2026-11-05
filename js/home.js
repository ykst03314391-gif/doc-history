// トップページ：新着記事・収録人物をピックアップ表示
(async function () {
  const artEl = document.getElementById("latest-articles");
  const topicsEl = document.getElementById("latest-topics");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 新着・更新（記事・人物・城・合戦・大名家をまとめて、日付の新しい順に8件）
  // 記事は公開日（date）を「新規」、update を「更新」として別々に数える。
  // DB の項目は update だけを見て、update.new が true なら「新規」、ほかは「更新」
  await (async function renderWhatsNew() {
    const box = document.getElementById("whats-new");
    const listEl = document.getElementById("whats-new-list");
    if (!box || !listEl) return;
    const KINDS = [
      { key: "people", file: "data/people/index.json", label: "人物", href: (x) => `person.html?id=${encodeURIComponent(x.id)}` },
      { key: "castles", file: "data/castles/index.json", label: "城", href: (x) => `castle.html?id=${encodeURIComponent(x.id)}` },
      { key: "battles", file: "data/battles/index.json", label: "合戦", href: (x) => `battle.html?id=${encodeURIComponent(x.id)}` },
      { key: "clans", file: "data/clans/index.json", label: "大名家", href: (x) => `clan.html?id=${encodeURIComponent(x.id)}` },
    ];
    const events = [];
    try {
      const arts = ((await (await fetch("data/articles/index.json")).json()).articles || []).filter((a) => !a.draft);
      for (const a of arts) {
        const href = `article.html?id=${encodeURIComponent(a.id)}`;
        if (a.date) events.push({ date: a.date, isNew: true, kind: "記事", name: a.title, href, items: [], order: 0 });
        if (a.update && a.update.date && a.update.date !== a.date)
          events.push({ date: a.update.date, isNew: false, kind: "記事", name: a.title, href, items: a.update.items || [], order: 0 });
      }
    } catch (err) {
      console.error(err);
    }
    await Promise.all(
      KINDS.map(async (k, i) => {
        try {
          const all = (await (await fetch(k.file)).json())[k.key] || [];
          for (const x of all) {
            const u = x.update;
            if (!u || !u.date) continue;
            events.push({ date: u.date, isNew: !!u.new, kind: k.label, name: x.name, href: k.href(x), items: u.new ? [] : u.items || [], order: i + 1 });
          }
        } catch (err) {
          console.error(err);
        }
      })
    );
    // 日付の新しい順。同じ日は記事→人物→城→合戦→大名家、その中は新規を先に
    events.sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order || b.isNew - a.isNew);
    const shown = events.slice(0, 8);
    if (!shown.length) return;
    listEl.innerHTML = shown
      .map(
        (e) => `
        <li>
          <a class="whats-new-row" href="${esc(e.href)}">
            <span class="whats-new-date">${esc(e.date.replace(/-/g, "."))}</span>
            <span class="whats-new-badge ${e.isNew ? "is-new" : "is-update"}">${e.isNew ? "新規" : "更新"}</span>
            <span class="whats-new-kind">${esc(e.kind)}</span>
            <span class="whats-new-body">
              <span class="whats-new-name">${esc(e.name)}</span>
              ${e.items.length ? `<span class="whats-new-items">${esc(e.items.join("／"))}</span>` : ""}
            </span>
          </a>
        </li>`
      )
      .join("");
    box.hidden = false;
  })();

  // 新着記事（最大3件）
  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const articles = ((await res.json()).articles || [])
      .filter((a) => !a.draft)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .slice(0, 3);
    artEl.innerHTML = articles.length
      ? articles
          .map((a) => {
            const thumb =
              a.image && a.image.src
                ? `<img class="card-thumb" src="${esc(a.image.src)}" alt="" loading="lazy">`
                : "";
            return `
        <a class="card${thumb ? " card--thumb" : ""}" href="article.html?id=${encodeURIComponent(a.id)}">
          ${thumb}
          <div class="card-main">
            <p class="article-cat">${esc(a.category || "記事")}</p>
            <h3>${esc(a.title)}</h3>
            <p class="years">${esc(a.date || "")}</p>
            <p class="card-summary">${esc(a.summary || "")}</p>
          </div>
        </a>`;
          })
          .join("")
      : `<p class="muted">まだ記事がありません。</p>`;
  } catch (err) {
    artEl.innerHTML = `<p class="error">記事の読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }

  // 最新トピック（最大3件）
  if (topicsEl) {
    try {
      const res = await fetch("data/topics/index.json");
      if (!res.ok) throw new Error(res.status);
      const topics = ((await res.json()).topics || [])
        .filter((t) => !t.draft)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .slice(0, 3);
      topicsEl.innerHTML = topics.length
        ? topics
            .map((t) => {
              const meta = [];
              if (t.period && (t.period.from || t.period.to))
                meta.push(`会期：${esc(t.period.from || "")}〜${esc(t.period.to || "")}`);
              if (t.place && (t.place.name || t.place.prefecture))
                meta.push(`会場：${esc([t.place.prefecture, t.place.name].filter(Boolean).join(" "))}`);
              if (t.platform) meta.push(`対応：${esc(t.platform)}`);
              const timg =
                t.images && t.images.length && t.images[0].src
                  ? `<img class="card-thumb" src="${esc(t.images[0].src)}" alt="" loading="lazy">`
                  : "";
              return `
        <a class="topic-card topic-card--link${timg ? " topic-card--thumb" : ""}" href="topic.html?id=${encodeURIComponent(t.id)}">
          ${timg}
          <div class="topic-card-body">
            <div class="topic-head">
              <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
              <span class="topic-date">${esc(t.date || "")}</span>
            </div>
            <h3 class="topic-title">${esc(t.title)}</h3>
            ${t.summary ? `<p class="topic-summary">${esc(t.summary)}</p>` : ""}
            ${meta.length ? `<p class="topic-meta">${meta.join("　／　")}</p>` : ""}
            ${t.take ? `<div class="topic-take"><span class="take-label">ひとこと</span>${esc(t.take)}</div>` : ""}
            <span class="topic-more">詳しく見る →</span>
          </div>
        </a>`;
            })
            .join("")
        : `<p class="muted">まだトピックがありません。</p>`;
    } catch (err) {
      topicsEl.innerHTML = `<p class="error">トピックの読み込みに失敗しました。</p>`;
      console.error(err);
    }
  }
})();
