// 連載（data/articles/index.json の rensai）。1つの大きな問いを、表紙（総論の記事）と論点の記事で追うまとまり。
// トップ・考察一覧・記事・人物ページで共用する。
// 公開用の書き出しでは、公開日を迎えていない記事が index.json から外れるので、
// 番号・前後のリンクは index.json にある記事（下書きを除く）だけで組み、表紙が無い連載は出さない。
window.Rensai = (function () {
  // artData：index.json の中身。返すのは、表紙が出ている連載だけ（記事は並び順のまま、出ているものだけ）
  function list(artData) {
    const arts = new Map((artData.articles || []).filter((a) => !a.draft).map((a) => [a.id, a]));
    return (artData.rensai || [])
      .filter((r) => arts.has(r.hub))
      .map((r) => ({
        ...r,
        hubArticle: arts.get(r.hub),
        items: (r.articles || []).filter((id) => arts.has(id)).map((id) => arts.get(id)),
        extras: (r.extra || []).filter((id) => arts.has(id)).map((id) => arts.get(id)),
      }));
  }

  // 記事 id が属する連載と、その中の位置（role："hub"／"item"（no は1から）／"extra"）
  function of(artData, id) {
    for (const r of list(artData)) {
      if (r.hub === id) return { r, role: "hub" };
      const i = r.items.findIndex((a) => a.id === id);
      if (i >= 0) return { r, role: "item", no: i + 1 };
      if (r.extras.some((a) => a.id === id)) return { r, role: "extra" };
    }
    return null;
  }

  // 人物 id を主役にした連載
  function ofPerson(artData, personId) {
    return list(artData).find((r) => r.person_id === personId) || null;
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // トップと考察一覧のカード（表紙の記事へ）。表紙の題が連載の問い
  function cardHTML(r) {
    const h = r.hubArticle;
    const img = h.image && h.image.src ? `<img src="${esc(h.image.src)}" alt="" loading="lazy">` : "";
    const n = r.items.length;
    return `<a class="rensai-card" href="article.html?id=${encodeURIComponent(h.id)}">
        ${img}
        <div>
          <span class="rensai-card-label">連載</span>
          <h3 class="rensai-card-title">${esc(r.title)}</h3>
          <p class="rensai-card-q">${esc(h.title)}</p>
          ${r.description ? `<p class="rensai-card-desc">${esc(r.description)}</p>` : ""}
          <span class="rensai-card-count">表紙＋${n}本${r.extras.length ? `・番外${r.extras.length}本` : ""}</span>
        </div>
      </a>`;
  }

  return { list, of, ofPerson, cardHTML };
})();
