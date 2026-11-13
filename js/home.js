// トップページ：連載と、新着・更新（記事も DB の更新も1つの表に）を表示
(async function () {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 新着・更新（記事・人物・城・合戦・大名家をまとめて、日付の新しい順に5件まで）。
  // 表にして、日付・区分（新規／更新と種別）・内容（名前と、中身が最低限わかる一言 note）を出す：
  // 更新は何を直したか（items）、新しい記事は要約（summary）、新しい DB の項目は items か要約
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
        if (a.date) events.push({ date: a.date, isNew: true, kind: "記事", name: a.title, href, note: a.summary || "", order: 0 });
        if (a.update && a.update.date && a.update.date !== a.date)
          events.push({ date: a.update.date, isNew: false, kind: "記事", name: a.title, href, note: (a.update.items || []).join("／"), order: 0 });
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
            events.push({ date: u.date, isNew: !!u.new, kind: k.label, name: x.name, href: k.href(x), note: (u.items || []).join("／") || x.summary || "", order: i + 1 });
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
          <td><a class="whats-new-name" href="${esc(e.href)}">${esc(e.name)}</a>${
            e.note ? `<span class="whats-new-note">${esc(String(e.note).replace(/\s*\n\s*/g, ""))}</span>` : ""
          }</td>
        </tr>`
      )
      .join("")}</tbody>`;
    box.hidden = false;
  })();

  // 連載（js/rensai.js）。表紙が出ている連載があるときだけ欄を出す
  try {
    const res = await fetch("data/articles/index.json");
    if (!res.ok) throw new Error(res.status);
    const rens = window.Rensai ? window.Rensai.list(await res.json()) : [];
    if (rens.length) {
      document.getElementById("rensai-cards").innerHTML = rens.map(window.Rensai.cardHTML).join("");
      document.getElementById("rensai-home").hidden = false;
    }
  } catch (err) {
    console.error(err);
  }
})();
