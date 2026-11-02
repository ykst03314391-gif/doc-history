// 人物一覧ページ（武将一覧 people.html／その他の人物 others.html で共用）
(async function () {
  const listEl = document.getElementById("list");
  const searchEl = document.getElementById("search");
  // 並べ方の切替（武将一覧だけにある）。50音順／地域別／家別
  const orderEl = document.getElementById("order");
  // 一覧の見出しの目次（.side-toc。いま開いている見出しの強調は js/toc.js）
  const tocEl = document.getElementById("list-toc");
  // data-category="other" なら武将ではない人物と脇役の武将、無指定なら武将を一覧する
  const category = listEl.dataset.category || "";
  let people = [];
  let otherCount = 0;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 西暦を先に書き、和暦の年があれば括弧で併記（例：1540年（天文9年） 〜 1591年（天正19年））
  function fmtYear(era, year) {
    const eraYear = era ? era.replace(/年.*$/, "年") : "";
    if (year) return `${year}年${eraYear ? `（${eraYear}）` : ""}`;
    return eraYear || "?";
  }

  function years(p) {
    return `${fmtYear(p.birthEra, p.birthYear)} 〜 ${fmtYear(p.deathEra, p.deathYear)}`;
  }

  function cardHTML(p) {
    const tags = (p.tags || [])
      .map((t) => `<span class="tag">${esc(t)}</span>`)
      .join("");
    // カード右上にサムネイル（名前・生没年の横の空きに回り込ませる）。肖像画が無ければ「画像なし」の絵
    const thumb = `<img class="person-thumb" src="${esc(p.thumb || "assets/img/portraits/noimage.svg")}" alt="" loading="lazy">`;
    return `
      <a class="card person-card" href="person.html?id=${encodeURIComponent(p.id)}">
        ${thumb}
        <h3>${esc(p.name)}</h3>
        <p class="kana">${esc(p.kana || "")}</p>
        <p class="years">${esc(years(p))}</p>
        <p class="card-summary">${esc(p.summary || "")}</p>
        <div class="tags">${tags}</div>
      </a>`;
  }

  // 「最近更新した人物」（people.html だけにある）。index.json の update（最後の更新の日付と、何を直したかの箇条）の新しい順に3人
  // 更新の中身は2つまで箇条書きにし、3つ以上なら「ほか」を添える
  function updateItemsHTML(items) {
    if (!items.length) return "";
    const lis = items.slice(0, 2).map((t) => `<li>${esc(t)}</li>`).join("");
    const more = items.length > 2 ? `<li class="recent-more">ほか</li>` : "";
    return `<ul class="recent-items">${lis}${more}</ul>`;
  }
  function renderRecent(all) {
    const box = document.getElementById("recent");
    if (!box) return;
    const recent = all
      .filter((p) => p.update && p.update.date)
      .sort((a, b) => b.update.date.localeCompare(a.update.date))
      .slice(0, 3);
    if (!recent.length) return;
    document.getElementById("recent-list").innerHTML = recent
      .map((p) => {
        const thumb = `<img class="person-thumb" src="${esc(p.thumb || "assets/img/portraits/noimage.svg")}" alt="" loading="lazy">`;
        return `
          <a class="card person-card recent-card" href="person.html?id=${encodeURIComponent(p.id)}">
            ${thumb}
            <p class="recent-date">${esc(p.update.date.replace(/-/g, "."))} 更新</p>
            <h3>${esc(p.name)}</h3>
            <p class="kana">${esc(p.kana || "")}</p>
            ${updateItemsHTML(p.update.items || [])}
          </a>`;
      })
      .join("");
    box.hidden = false;
  }

  const { kanaRow, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff } = window.ListOrder;
  const UNKNOWN = "出身国不明";

  // 出身国は各人物データの birthplace から取る（province があればそれ、なければ name 先頭の「〇〇国」）
  const provinceById = {};
  let provincesLoaded = null;
  function loadProvinces() {
    if (!provincesLoaded) {
      provincesLoaded = Promise.all(
        people.map((p) =>
          fetch(`data/people/${encodeURIComponent(p.id)}.json`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
            .then((d) => {
              const bp = (d && d.birthplace) || {};
              const m = (bp.name || "").match(/^(.{1,3}?国)/);
              const prov = bp.province || (m && m[1]);
              provinceById[p.id] = isProvince(prov) ? prov : null;
            })
        )
      );
    }
    return provincesLoaded;
  }

  // 家はタグから取る。「〇〇家」があればその家の一門、なければ「〇〇家臣」からその家の家臣とする
  // 家の並びは大名家データ（clans/index.json）の読みの50音順。データにない家は家名の順
  const clanKana = {};
  let clansLoaded = null;
  function loadClans() {
    if (!clansLoaded) {
      clansLoaded = fetch("data/clans/index.json")
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}))
        .then((d) => {
          for (const c of d.clans || []) clanKana[c.name] = { kana: c.kana || c.name, id: c.id };
        });
    }
    return clansLoaded;
  }
  const NO_CLAN = "家不明";
  function clanOf(p) {
    const tags = p.tags || [];
    const own = tags.find((t) => /家$/.test(t));
    if (own) return { clan: own, retainer: false };
    const served = tags.map((t) => t.match(/^(.+家)臣$/)).find(Boolean);
    if (served) return { clan: served[1], retainer: true };
    return null;
  }
  function clanLabel(p) {
    const c = clanOf(p);
    if (!c) return NO_CLAN;
    return c.retainer ? `${c.clan}の家臣` : c.clan;
  }
  // 家名の読み。大名家データにない家は、名字が家名と同じ一門の人物の読み（名字の部分）から取る
  function clanSortKey(name) {
    if (clanKana[name] && clanKana[name].kana) return clanKana[name].kana;
    const stem = name.replace(/家$/, "");
    const m = people.find((p) => (p.name || "").startsWith(stem) && p.kana);
    return m ? m.kana.split(/\s/)[0] + "け" : name;
  }

  // 並べ方ごとの見出しと順序
  function groupOf(p, order) {
    if (order === "kana") return kanaRow(p.kana);
    if (order === "clan") return clanLabel(p);
    return provinceById[p.id] || UNKNOWN;
  }
  // 見出しの上の段。地域別は国の上に地域、家別は家の上に家名の読みの行（あ行…）。
  // 出身国・家の分からない人は段を分けない
  function superOf(p, order) {
    if (order === "region") {
      const prov = provinceById[p.id];
      return prov ? regionOf(prov) : null;
    }
    if (order !== "clan") return null;
    const c = clanOf(p);
    return c ? kanaRow(clanSortKey(c.clan)) : null;
  }
  function sortFor(order, items) {
    if (order === "kana") return items;
    if (order === "clan") {
      // 家ごとにまとめ、一門のすぐ後ろにその家の家臣を置く。家のない人は末尾
      return [...items].sort((a, b) => {
        const ca = clanOf(a), cb = clanOf(b);
        if (!ca || !cb) return (ca ? 0 : 1) - (cb ? 0 : 1);
        return (
          clanSortKey(ca.clan).localeCompare(clanSortKey(cb.clan), "ja") ||
          ca.retainer - cb.retainer
        );
      });
    }
    // items は50音順なので、同順位のあいだは50音順のまま残る（sort は安定）
    const prov = (p) => provinceById[p.id];
    const byProvince = (a, b) => diff(provinceRank(prov(a)), provinceRank(prov(b)));
    const byRegion = (a, b) => diff(regionRank(prov(a)), regionRank(prov(b)));
    return [...items].sort(by(byRegion, byProvince));
  }

  // 武将一覧の末尾に置く「その他の人物」への入口カード
  function otherCardHTML() {
    return `
      <h3 class="kana-row-heading" id="row-other">その他</h3>
      <a class="card person-card card-more" href="others.html">
        <h3>その他の人物</h3>
        <p class="card-summary">武将ではない人物（武将の家族など）や、主な武将の周りの人物の一覧です。${otherCount ? `現在${otherCount}人。` : ""}</p>
      </a>`;
  }

  // 家別の見出しは、大名家データにある家ならその家のページへリンクする
  function headingHTML(row, order, p) {
    const c = order === "clan" && clanOf(p);
    const info = c && clanKana[c.clan];
    if (!info || !info.id) return esc(row);
    return `<a href="clan.html?id=${encodeURIComponent(info.id)}">${esc(row)}</a>`;
  }

  const OTHER_ROW = { id: "row-other", label: "その他" };
  // 目次は一覧の見出しから作るので、並べ方や検索で見出しが変わるたびに作り直す
  function tocGroupHTML(r) {
    const items = r.children.map((c) => `<li><a href="#${c.id}">${esc(c.label)}</a></li>`).join("");
    return `<li class="toc-group"><a class="toc-group-link" href="#${r.id}">${esc(r.label)}</a><ol>${items}</ol></li>`;
  }
  function renderToc(rows) {
    if (!tocEl) return;
    tocEl.hidden = !rows.length;
    tocEl.innerHTML = rows.length
      ? `<p class="toc-title">目次</p><ol>${rows
          .map((r) => (r.children ? tocGroupHTML(r) : `<li><a href="#${r.id}">${esc(r.label)}</a></li>`))
          .join("")}</ol>`
      : "";
  }

  function render(items, showOther) {
    const more = showOther && !category ? otherCardHTML() : "";
    if (!items.length) {
      listEl.innerHTML = `<p class="muted">該当する人物がいません。</p>` + more;
      renderToc(more ? [OTHER_ROW] : []);
      return;
    }
    // items は50音順に並んでいる前提。並べ方に従って並べ替え、グループが変わるところに見出しを挟む
    const order = currentOrder();
    let html = "";
    let current = null;
    let currentSuper = null;
    const rows = [];
    let n = 0;
    for (const p of sortFor(order, items)) {
      const row = groupOf(p, order);
      // 家別は家名の読みの50音順なので、行（あ行・か行…）の見出しの下に家の見出しを置く
      const sup = superOf(p, order);
      if (sup && sup !== currentSuper) {
        const id = `row-${n++}`;
        html += `<h3 class="kana-row-heading" id="${id}">${esc(sup)}</h3>`;
        rows.push({ id, label: sup, children: [] });
        currentSuper = sup;
        current = null;
      }
      if (row !== current) {
        const id = `row-${n++}`;
        const cls = sup ? "kana-row-heading group-subheading" : "kana-row-heading";
        html += `<h3 class="${cls}" id="${id}">${headingHTML(row, order, p)}</h3>`;
        (sup ? rows[rows.length - 1].children : rows).push({ id, label: row });
        current = row;
      }
      html += cardHTML(p);
    }
    if (more) rows.push(OTHER_ROW);
    listEl.innerHTML = html + more;
    renderToc(rows);
  }

  function filter(q) {
    q = q.trim().toLowerCase();
    if (!q) return render(people, true);
    render(
      people.filter((p) => {
        const hay = [p.name, p.kana, p.summary, ...(p.tags || [])]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
    );
  }

  // 並べ方を切り替える。地域別は各人物データを、家別は大名家データを読み終えてから描く
  const currentOrder = setupSwitch(orderEl, ["kana", "region", "clan"], applyOrder);
  async function applyOrder() {
    const order = currentOrder();
    if (order !== "kana") {
      listEl.innerHTML = `<p class="muted">読み込み中…</p>`;
      await (order === "clan" ? loadClans() : loadProvinces());
    }
    filter(searchEl.value);
  }

  try {
    const res = await fetch("data/people/index.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const all = data.people || [];
    renderRecent(all);
    otherCount = all.filter((p) => p.category === "other").length;
    // このページのカテゴリの人物だけを、読み（kana）の50音順に並べる
    people = all
      .filter((p) => (category === "other") === (p.category === "other"))
      .sort((a, b) =>
        (a.kana || a.name || "").localeCompare(b.kana || b.name || "", "ja")
      );
    searchEl.addEventListener("input", (e) => filter(e.target.value));
    await applyOrder();
  } catch (err) {
    listEl.innerHTML = `<p class="error">データの読み込みに失敗しました。ローカルで開いている場合は、簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
