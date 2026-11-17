// 連載（data/articles/index.json の rensai）。1つの大きな問いを、表紙（総論の記事）と論点の記事で追うまとまり。
// トップ・考察一覧・記事・人物ページで共用する。
// 公開用の書き出しでは、公開日を迎えていない記事が index.json から外れるので、
// 番号・前後のリンクは index.json にある記事（下書きを除く）だけで組み、表紙が無い連載は出さない。
window.Rensai = (function () {
  // artData：index.json の中身。返すのは、表紙が出ている連載だけ（記事は並び順のまま、出ているものだけ）
  function list(artData) {
    const arts = new Map((artData.articles || []).filter((a) => !a.draft).map((a) => [a.id, a]));
    const drafts = new Map((artData.articles || []).filter((a) => a.draft).map((a) => [a.id, a]));
    return (artData.rensai || [])
      .filter((r) => arts.has(r.hub))
      .map((r) => ({
        ...r,
        hubArticle: arts.get(r.hub),
        items: (r.articles || []).filter((id) => arts.has(id)).map((id) => arts.get(id)),
        extras: (r.extra || []).filter((id) => arts.has(id)).map((id) => arts.get(id)),
        // 執筆中（draft）の論点の記事。番号は付けず、表紙の一覧とカードに「執筆中」として予告だけ出す
        planned: (r.articles || []).map((id) => drafts.get(id)).filter(Boolean),
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

  // 人物 id を主役にした連載（1人に何本あってもよい。index.json の rensai の順）
  function ofPerson(artData, personId) {
    return list(artData).filter((r) => r.person_id === personId);
  }

  // 連載を主役の人物ごとにまとめる。人物の無い連載は1本で1組。組の順は、その組の最初の連載が出てくる順
  function groups(rens) {
    const out = [];
    const byPerson = new Map();
    for (const r of rens) {
      if (r.person_id && byPerson.has(r.person_id)) {
        byPerson.get(r.person_id).rens.push(r);
        continue;
      }
      const g = { person_id: r.person_id || null, rens: [r] };
      if (r.person_id) byPerson.set(r.person_id, g);
      out.push(g);
    }
    return out;
  }

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // トップと考察一覧のカード（表紙の記事へ）。表紙の題が連載の問い
  function cardHTML(r) {
    const h = r.hubArticle;
    const img = h.image && h.image.src ? `<img src="${esc(h.image.src)}" alt="" loading="lazy">` : "";
    return `<a class="rensai-card${img ? "" : " rensai-card--noimg"}" href="article.html?id=${encodeURIComponent(h.id)}">
        ${img}
        <div>
          <span class="rensai-card-label">連載</span>
          <h3 class="rensai-card-title">${esc(r.title)}</h3>
          <p class="rensai-card-q">${esc(h.title)}</p>
          ${r.description ? `<p class="rensai-card-desc">${esc(r.description)}</p>` : ""}
          <span class="rensai-card-count">${countText(r)}</span>
        </div>
      </a>`;
  }

  // 「表紙＋5本・番外1本」。執筆中の記事があれば「（ほかに執筆中3本）」を添える
  function countText(r) {
    return `表紙＋${r.items.length}本${r.extras.length ? `・番外${r.extras.length}本` : ""}${
      r.planned.length ? `（ほかに執筆中${r.planned.length}本）` : ""
    }`;
  }

  // 人物ごとの組の中の小さなカード（画像なし。組の頭に人物の顔を出すため）
  function miniCardHTML(r) {
    const h = r.hubArticle;
    return `<a class="rensai-card rensai-card--mini" href="article.html?id=${encodeURIComponent(h.id)}">
        <span class="rensai-card-label">連載</span>
        <h4 class="rensai-card-title">${esc(r.title)}</h4>
        <p class="rensai-card-q">${esc(h.title)}</p>
        ${r.description ? `<p class="rensai-card-desc">${esc(r.description)}</p>` : ""}
        <span class="rensai-card-count">${countText(r)}</span>
      </a>`;
  }

  // トップと考察一覧の連載の欄。同じ人物の連載が2本以上あれば、人物ごとの組にまとめる
  // （1人の連載が並ぶと、その人物のファンサイトのように見えるため）。people：data/people/index.json の people
  function sectionHTML(rens, people) {
    const person = (pid) => (people || []).find((p) => p.id === pid) || { id: pid, name: pid };
    return groups(rens)
      .map((g) => {
        if (!g.person_id || g.rens.length < 2) return g.rens.map(cardHTML).join("");
        const p = person(g.person_id);
        return `<section class="rensai-group">
            <div class="rensai-group-head">
              ${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : ""}
              <div>
                <span class="rensai-card-label">人物の連載</span>
                <h3 class="rensai-group-name">${esc(p.name)}</h3>
                <p class="rensai-group-note">${g.rens.length}本の連載で、${esc(p.name)}を別々の問いから追う。<a href="person.html?id=${encodeURIComponent(p.id)}">人物ページ（資料）</a></p>
              </div>
            </div>
            <div class="rensai-group-cards">${g.rens.map(miniCardHTML).join("")}</div>
          </section>`;
      })
      .join("");
  }

  return { list, of, ofPerson, groups, cardHTML, countText, sectionHTML };
})();
