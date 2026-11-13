// トップページ：新着・更新と新着記事を表示
(async function () {
  const artEl = document.getElementById("latest-articles");

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
    const artData = await res.json();
    // 連載（js/rensai.js）
    const rens = window.Rensai ? window.Rensai.list(artData) : [];
    if (rens.length) {
      document.getElementById("rensai-cards").innerHTML = rens.map(window.Rensai.cardHTML).join("");
      document.getElementById("rensai-home").hidden = false;
    }
    const articles = (artData.articles || [])
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
})();
