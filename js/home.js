// トップページ：連載と、新着・更新（記事も DB の更新も1つの表に）を表示
(async function () {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 新着・更新（記事・人物・城・合戦・大名家をまとめて、日付の新しい順に5件まで）。
  // 表にして、日付・区分（新規／更新と種別）・内容（名前と、中身が最低限わかる一言 note）を出す：
  // 更新は何を直したか（items）、新しい記事は要約（summary）、新しい DB の項目は items か要約
  // 内容の欄の頭にサムネを出す（記事は冒頭画像 image、人物は thumb〔無ければ noimage〕、城・合戦は photo.thumb、大名家は家紋の絵）。
  // 権利表記の要る絵（人物の肖像を除く。人物一覧と同じ扱い）は、表の下に「写真・絵の出典」として小さく並べる。
  // 記事は公開日（date）を「新規」、update を「更新」として別々に数える。
  // DB の項目は update だけを見て、update.new が true なら「新規」、ほかは「更新」
  await (async function renderWhatsNew() {
    const box = document.getElementById("whats-new");
    const listEl = document.getElementById("whats-new-list");
    if (!box || !listEl) return;
    const KINDS = [
      { key: "people", file: "data/people/index.json", label: "人物", href: (x) => `person.html?id=${encodeURIComponent(x.id)}`,
        thumb: (x) => x.thumb || "assets/img/portraits/noimage.svg", credit: () => "", caption: () => "" },
      { key: "castles", file: "data/castles/index.json", label: "城", href: (x) => `castle.html?id=${encodeURIComponent(x.id)}`,
        thumb: (x) => x.photo && x.photo.thumb, credit: (x) => (x.photo ? photoCredit(x.photo) : ""), caption: (x) => (x.photo && x.photo.caption) || "" },
      { key: "battles", file: "data/battles/index.json", label: "合戦", href: (x) => `battle.html?id=${encodeURIComponent(x.id)}`,
        thumb: (x) => x.photo && x.photo.thumb, credit: (x) => (x.photo ? photoCredit(x.photo) : ""), caption: (x) => (x.photo && x.photo.caption) || "" },
      { key: "clans", file: "data/clans/index.json", label: "大名家", href: (x) => `clan.html?id=${encodeURIComponent(x.id)}`,
        thumb: (x) => x.kamonImage && x.kamonImage.src, credit: (x) => (x.kamonImage ? drawCredit(x.kamonImage) : ""),
        caption: (x) => `${x.name}の家紋（${x.kamon || ""}）`, isKamon: true },
    ];
    const link = (text, url) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text));
    const photoCredit = (ph) => (window.PhotoCredit ? window.PhotoCredit.credit(ph) : "");
    // 家紋の絵（大名家一覧と同じ書き方：作者・ライセンス・出典）
    const drawCredit = (k) =>
      [k.author ? `作者：${esc(k.author)}` : "", k.license ? link(k.license, k.licenseUrl) : "", k.source ? `出典：${link(k.source.name, k.source.url)}` : ""]
        .filter(Boolean)
        .join(" ／ ");
    // 記事の冒頭画像（credit は「撮影：…」まで書いた文）
    const imageCredit = (im) =>
      [esc(im.credit || ""), im.license ? link(im.license, im.licenseUrl) : "", im.sourceUrl ? `出典：${link("元の画像", im.sourceUrl)}` : ""]
        .filter(Boolean)
        .join(" ／ ");
    const events = [];
    try {
      const arts = ((await (await fetch("data/articles/index.json")).json()).articles || []).filter((a) => !a.draft);
      for (const a of arts) {
        const href = `article.html?id=${encodeURIComponent(a.id)}`;
        const im = a.image && a.image.src ? a.image : null;
        const pic = { thumb: im && im.src, credit: im ? imageCredit(im) : "", caption: (im && im.caption) || "" };
        if (a.date) events.push({ date: a.date, isNew: true, kind: "記事", name: a.title, href, note: a.summary || "", order: 0, ...pic });
        if (a.update && a.update.date && a.update.date !== a.date)
          events.push({ date: a.update.date, isNew: false, kind: "記事", name: a.title, href, note: (a.update.items || []).join("／"), order: 0, ...pic });
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
            events.push({ date: u.date, isNew: !!u.new, kind: k.label, name: x.name, href: k.href(x), note: (u.items || []).join("／") || x.summary || "", order: i + 1,
              thumb: k.thumb(x), credit: k.credit(x), caption: k.caption(x), isKamon: !!k.isKamon });
          }
        } catch (err) {
          console.error(err);
        }
      })
    );
    // 日付の新しい順。同じ日は記事→人物→城→合戦→大名家、その中は新規を先に
    events.sort((a, b) => b.date.localeCompare(a.date) || a.order - b.order || b.isNew - a.isNew);
    const shown = events.slice(0, 5);
    if (!shown.length) return;
    // 表：日付｜区分（新規／更新の札と種別）｜内容（名前と、中身が最低限わかる一言）
    listEl.innerHTML = `<thead><tr><th>日付</th><th>区分</th><th>内容</th></tr></thead><tbody>${shown
      .map(
        (e) => `
        <tr>
          <td class="whats-new-date">${esc(e.date.replace(/-/g, "."))}</td>
          <td class="whats-new-type"><span class="whats-new-badge ${e.isNew ? "is-new" : "is-update"}">${e.isNew ? "新規" : "更新"}</span><span class="whats-new-kind">${esc(e.kind)}</span></td>
          <td class="whats-new-body">${
            e.thumb
              ? `<a class="whats-new-thumb${e.isKamon ? " is-kamon" : ""}" href="${esc(e.href)}" tabindex="-1" aria-hidden="true"><img src="${esc(e.thumb)}" alt="" loading="lazy"></a>`
              : ""
          }<div class="whats-new-text"><a class="whats-new-name" href="${esc(e.href)}">${esc(e.name)}</a>${
            e.note ? `<span class="whats-new-note">${esc(String(e.note).replace(/\s*\n\s*/g, ""))}</span>` : ""
          }</div></td>
        </tr>`
      )
      .join("")}</tbody>`;
    // 写真・絵の出典（同じ絵は1回だけ）
    const credEl = document.getElementById("whats-new-credits");
    const seen = new Set();
    const rows = shown
      .filter((e) => e.thumb && e.credit && !seen.has(e.thumb) && seen.add(e.thumb))
      .map((e) => `<li><span class="credit-name">${esc(e.caption || e.name)}</span>${e.credit}</li>`)
      .join("");
    if (credEl && rows) credEl.innerHTML = `<p class="whats-new-credits-title">写真・絵の出典</p><ul class="photo-credit-list">${rows}</ul>`;
    box.hidden = false;
  })();

  // 連載（js/rensai.js）。表紙が出ている連載があるときだけ欄を出す
  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const rens = window.Rensai ? window.Rensai.list(await res.json()) : [];
    if (rens.length) {
      // 人物ごとの組の頭に名前と顔を出すため、人物の一覧も読む
      const pr = await fetch("data/people/index.json");
      const people = pr.ok ? (await pr.json()).people || [] : [];
      document.getElementById("rensai-cards").innerHTML = window.Rensai.sectionHTML(rens, people);
      document.getElementById("rensai-home").hidden = false;
    }
  } catch (err) {
    console.error(err);
  }
})();
