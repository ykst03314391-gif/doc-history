// 人物詳細ページ
(function () {
  const contentEl = document.getElementById("content");

  // 出典バッジ：資料の区分ごとの塗り色（style.css）と、出典欄の頭に置く凡例
  const SRC_CLASS = { "一次資料": "src-primary1", "二次資料": "src-primary2", "研究": "src-research" };
  const SRC_LEGEND = `<p class="src-legend muted">塗りつぶしは資料の区分：
    <span class="src-primary src-primary1">一次資料</span>同時代の日記・書状など
    <span class="src-primary src-primary2">二次資料</span>後世の軍記・編纂物
    <span class="src-primary src-research">研究</span>研究者の解釈（説の典拠）
    ／枠だけは資料の種別：<span class="src-type">史料</span><span class="src-type">研究書</span><span class="src-type">寄稿</span>など。区分の無いものは概要（Wikipediaなど）</p>`;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 本文中の語をサイト内ページへのリンクにする。links: [{ text, person_id | battle_id | castle_id }]
  // 各語は最初に出てきた1か所だけをリンクにする
  function linkText(text, links) {
    const s = String(text ?? "");
    if (!links || !links.length) return esc(s);
    const hrefOf = (l) =>
      l.person_id ? `person.html?id=${encodeURIComponent(l.person_id)}`
      : l.battle_id ? `battle.html?id=${encodeURIComponent(l.battle_id)}`
      : l.castle_id ? `castle.html?id=${encodeURIComponent(l.castle_id)}`
      : "";
    const hits = links
      .filter((l) => l.text && hrefOf(l))
      .map((l) => ({ l, at: s.indexOf(l.text) }))
      .filter((h) => h.at >= 0)
      .sort((a, b) => a.at - b.at);
    let out = "";
    let pos = 0;
    for (const { l, at } of hits) {
      if (at < pos) continue;
      out += esc(s.slice(pos, at)) + `<a href="${hrefOf(l)}">${esc(l.text)}</a>`;
      pos = at + l.text.length;
    }
    return out + esc(s.slice(pos));
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    contentEl.innerHTML = `<p class="error">人物IDが指定されていません。</p>`;
    return;
  }

  // 年月日を表示用文字列に。西暦を先に書き、和暦があれば括弧で併記（例：1591年2月15日（天正19年1月22日））
  function fmtDate(d) {
    if (!d) return "不明";
    const parts = [];
    if (d.year) parts.push(d.year + "年");
    if (d.year && d.month) parts.push(d.month + "月");
    if (d.year && d.month && d.day) parts.push(d.day + "日");
    if (!parts.length) return d.era ? esc(d.era) : "不明";
    return parts.join("") + (d.era ? `（${esc(d.era)}）` : "");
  }

  // 一時点の年の見出し（例：1585年（天正13年10月） ）。年が無ければ和暦や「幼少期」などをそのまま
  function whenLabel(year, era) {
    if (year) return `${esc(year)}年${era ? `（${esc(era)}）` : ""} `;
    return era ? `${esc(era)} ` : "";
  }

  function uncertain(flag) {
    return flag ? `<span class="uncertain-badge">諸説あり</span>` : "";
  }

  // 説明文を句点ごとに改行する（かっこの中の句点では切らない）。tail（出典マーカーなど）は最後の文の末尾に付ける
  // links があれば、注記の中の語もサイト内ページへのリンクにする（年表の説明と同じ）
  // データの改行（\n）は文の中でもそこで改行し、空行（\n\n）は少し間をあけて次の文・行を始める
  function sentences(text, tail = "", links) {
    const html = links && links.length;
    return sentSpans(splitSentences(html ? linkText(text, links) : String(text ?? "")), html ? (t) => t : esc, tail);
  }
  // 文の並び（splitSentences の結果）を1文ずつの span にする。conv は文字列を HTML にする関数（esc など）
  function sentSpans(list, conv, tail = "") {
    return list
      .map((t, i, a) => {
        const gap = i > 0 && /^[ \t]*\n[ \t]*\n/.test(t);
        const body = lineBreaks(fmtText(conv(t.replace(/^\s+/, ""))));
        return `<span class="sent${gap ? " sent-gap" : ""}">${body}${i === a.length - 1 ? tail : ""}</span>`;
      })
      .join("");
  }
  // 文の中の改行（\n）を <br> に、空行（\n\n）を間をあけた改行にする
  const lineBreaks = (html) =>
    String(html).replace(/\s*\n[ \t]*\n\s*/g, '<span class="text-gap"></span>').replace(/\s*\n\s*/g, "<br>");
  // 説明文の表示を整える：引用（「」の中）の色を変え、文末が数文字だけ次の行に残らないようにする
  const fmtText = (html) => keepTail(markQuotes(html));
  // 史料の原文の引用は、データでは {{…}} と書く。表示では「…」で括り、色を変えて地の文・ほかの「」と見分ける
  function markQuotes(html) {
    return html.replace(/\{\{([^{}]*)\}\}/g, (m, q) => `<span class="quote">「${q}」</span>`);
  }
  // 文末の数文字を改行させない（「る。」だけが次の行に残るのを防ぐ）。
  // タグ・文字参照は文字に数えず、区切りが要素の途中に来るときはその要素の前で区切る
  function keepTail(html, n = 6) {
    const tokens = html.match(/<[^>]*>|&[^;\s]+;|[\s\S]/g) || [];
    let split = tokens.length, count = 0;
    while (split > 0 && count < n) if (!tokens[--split].startsWith("<")) count++;
    const open = [];
    for (let i = 0; i < split; i++) {
      const t = tokens[i];
      if (/^<\//.test(t)) open.pop();
      else if (/^<[^!/]/.test(t) && !/\/>$/.test(t)) open.push(i);
    }
    if (open.length) split = open[0];
    // 長い引用やリンクごと折り返せなくなると行からはみ出すので、そのときは要素の後ろの文字だけをまとめる
    const kept = tokens.slice(split).filter((t) => !t.startsWith("<")).length;
    if (kept > 16) {
      split = tokens.length;
      while (split > 0 && !tokens[split - 1].startsWith("<")) split--;
      if (split === tokens.length) return html;
    }
    if (split === 0) return html;
    return `${tokens.slice(0, split).join("")}<span class="nobr">${tokens.slice(split).join("")}</span>`;
  }
  // 文の区切り。HTML（linkText の結果など）を渡しても、タグに句点やかっこは無いのでそのまま使える
  function splitSentences(s) {
    const out = [];
    let depth = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ("「『（(【{".includes(c)) depth++;
      else if ("」』）)】}".includes(c)) depth = Math.max(0, depth - 1);
      else if (c === "。" && depth === 0) {
        out.push(s.slice(start, i + 1));
        start = i + 1;
      }
    }
    if (start < s.length) out.push(s.slice(start));
    return out.filter((t) => t.trim());
  }

  // 一覧の1項目：見出し行（年などのラベル＋名前）と、その下の説明（句点ごとに改行）に分ける
  function entry({ when = "", main = "", after = "", note = "", tail = "", extra = "", links }) {
    const head = `<div class="entry-head">${when ? `<span class="entry-when">${when}</span>` : ""}<span class="entry-main">${main}</span>${after}</div>`;
    const body = note
      ? `<div class="entry-note">${sentences(note, tail, links)}</div>`
      : tail ? `<div class="entry-note">${tail}</div>` : "";
    return `<li class="entry">${head}${body}${extra}</li>`;
  }

  // 人物リンク（サイト内にページがあれば a、無ければテキスト）
  function personLink(rel) {
    const label = esc(rel.name || rel.person_id || "");
    if (rel.person_id) {
      return `<a href="person.html?id=${encodeURIComponent(rel.person_id)}">${label}</a>`;
    }
    return label;
  }

  // 欄の組と並び。考察が主役なので「捉え直す」を先頭に、出典と調査メモを最後に置く
  const GROUPS = [
    { title: "捉え直す", sub: "本当にそうか？", keys: ["lens", "lensSide", "reputation", "questions", "articles"] },
    { title: "どんな人だっけ？", sub: "事績と生涯", keys: ["achievements", "timeline", "territories", "episodes"] },
    { title: "誰だっけ？", sub: "家系・主従・呼び名", keys: ["family", "lords", "retainers", "yoriki", "ranks", "nameHistory"] },
    { title: "もっと知りたい！", sub: "読む本・行く現地", keys: ["references", "spots"] },
    { title: "出典と確認状況", sub: "", keys: ["sources", "toVerify", "imageCredits"] },
  ];

  // 欄の中身をいったん集め、最後に GROUPS の順で組み立てる
  const S = {};
  function put(key, title, inner) {
    if (inner) S[key] = { title, inner };
  }

  // 目次（TOC）用に組と欄の見出しを収集
  const tocGroups = [];
  let secCount = 0;
  function section(title, inner) {
    if (!inner) return "";
    const secId = "sec-" + ++secCount;
    tocGroups[tocGroups.length - 1].items.push({ id: secId, title });
    return `<section class="section" id="${secId}"><h2>${esc(title)}</h2>${inner}</section>`;
  }

  function tocHTML() {
    if (secCount < 2) return "";
    const groups = tocGroups
      .map((grp) => `<li class="toc-group"><a class="toc-group-link" href="#${grp.id}">${esc(grp.title)}</a>
          <ol>${grp.items.map((t) => `<li><a href="#${t.id}">${esc(t.title)}</a></li>`).join("")}</ol>
        </li>`)
      .join("");
    return `<nav class="side-toc" aria-label="目次">
      <p class="toc-title">目次</p>
      <ol>${groups}</ol>
    </nav>`;
  }

  function render(p, articles, kamonImages = {}) {
    document.title = `${p.name} ｜ ぱぱねこの戦国見立て`;
    const html = [];

    // 出典を1つずつ確かめた人物（sourcesChecked）は、冒頭の仮置きの注記を出さず、確認状況の案内を「要確認（調査メモ）」の冒頭に置く
    const notice = document.querySelector(".provisional-notice");
    if (notice && p.sourcesChecked) notice.remove();
    // 凍結中（role: "frozen"）の人物は、主役ではないので書き足していないことを仮置きの注記の前に断る
    if (notice && p.role === "frozen")
      notice.insertAdjacentHTML(
        "afterbegin",
        `<p class="frozen-note"><strong>この人物は詳しく書き足していません</strong>：このサイトは考察記事の主役になる人物だけを詳しく書いています。この人物は記事や主役のページに出てくる脇役で、下の年表・家系などは以前に書いたまま、書き足しや出典の確認をしていません。中身は仮置きです。</p>`
      );

    // 出典マーカー：項目の sourceId を、末尾「出典」欄の該当典拠に対応づけて小さく表示
    const srcMap = new Map((p.sources || []).map((s) => [s.id, s]));
    function srcMark(sourceId) {
      if (!sourceId) return "";
      const s = srcMap.get(sourceId);
      const label = s ? s.title || sourceId : sourceId;
      const prim = s && s.primary ? `（${s.primary}）` : "";
      return ` <span class="src-mark" title="出典${prim}：${esc(label)}">出典: ${esc(label)}</span>`;
    }
    // 典拠が複数ある項目用（sourceId に配列も書ける）
    const srcMarks = (ids) => [].concat(ids || []).map(srcMark).join("");
    // 空行（\n\n）で段落に分け、段落の中の改行（\n）はそこで改行する。tail（出典マーカーなど）は最後の段落の末尾に付ける
    const paras = (text, tail = "", links) => {
      const ps = String(text ?? "").split(/\n[ \t]*\n+/).filter((t) => t.trim());
      return ps.map((t, i) => `<p>${lineBreaks(fmtText(links && links.length ? linkText(t.trim(), links) : esc(t.trim())))}${i === ps.length - 1 ? tail : ""}</p>`).join("");
    };
    // ゆかりの地・墓所の名前（url があれば外部リンク）
    const spotName = (s) =>
      s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name);
    // リンク先がその場所自体のページでなければ urlLabel でリンク先を示す
    const spotLinkNote = (s) =>
      s.url && s.urlLabel ? `<span class="entry-link-note">［リンク先：${esc(s.urlLabel)}］</span>` : "";

    // ヘッダー
    const birth = fmtDate(p.birth);
    const death = fmtDate(p.death);
    // 冒頭の肖像画・家紋の絵の権利表記（所蔵・作者・ライセンス・出典）は、絵の横に置かず、ページ末尾の「画像の出典」にまとめる
    const imageCredits = [];
    // 肖像画（パブリックドメインの画像のみ。所蔵と出典を必ず添える）
    let portrait = "";
    if (p.portrait && p.portrait.src) {
      const pt = p.portrait;
      const src = pt.source && pt.source.url
        ? `<a href="${esc(pt.source.url)}" target="_blank" rel="noopener">${esc(pt.source.name || "出典")}</a>`
        : esc((pt.source && pt.source.name) || "");
      const credit = [
        pt.holder ? `所蔵：${esc(pt.holder)}` : "",
        src ? `出典：${src}${pt.license ? `（${esc(pt.license)}）` : ""}` : "",
      ].filter(Boolean).join(" ／ ");
      if (credit) imageCredits.push([pt.caption || "肖像画", credit]);
      portrait = `<figure class="person-portrait">
          <img src="${esc(pt.src)}" alt="${esc(pt.caption || p.name + "の肖像")}" loading="lazy">
          <figcaption>
            ${pt.caption ? `<span class="portrait-title">${esc(pt.caption)}</span>` : ""}
            ${pt.note ? `<span class="portrait-note">${lineBreaks(esc(pt.note))}</span>` : ""}
          </figcaption>
        </figure>`;
    } else {
      // 肖像画が見つかっていない人物は「画像なし」の絵を置く（レイアウトを揃えるため）
      portrait = `<figure class="person-portrait person-portrait--none">
          <img src="assets/img/portraits/noimage.svg" alt="肖像画なし">
          <figcaption><span class="portrait-note">肖像画は未発見</span></figcaption>
        </figure>`;
    }
    // ぱぱねこ版の絵（papaneko）：肖像画の右に並べる。キャプションは「（イメージ）」、表記はページ末尾の「画像の出典」へ
    if (p.papaneko && p.papaneko.src) {
      const pn = p.papaneko;
      imageCredits.push([pn.caption || "ぱぱねこ版の絵", esc(pn.credit || "イラスト：ぱぱねこの戦国見立て（AIで作成）")]);
      portrait = `<div class="person-figs">${portrait}
        <figure class="person-portrait person-portrait--papaneko">
          <img src="${esc(pn.src)}" alt="${esc(pn.caption || "ぱぱねこ版の" + p.name)}" loading="lazy">
          <figcaption>
            ${pn.caption ? `<span class="portrait-title">${esc(pn.caption)}</span>` : ""}
            ${pn.note ? `<span class="portrait-note">${esc(pn.note)}</span>` : ""}
          </figcaption>
        </figure></div>`;
    }
    // 基本情報（別名・家紋など。見出しは立てず、ヘッダー枠内に置く）
    const facts = [];
    // 改名：名乗りを改めた順に矢印でつなぎ、改めた年を（）で添える（データは古い順に並べる）
    if (p.aliases && p.aliases.length) {
      facts.push([
        "改名",
        p.aliases
          .map((a) => `${esc(a.value)}${a.year ? `<span class="muted">（${esc(a.year)}）</span>` : ""}`)
          .join(`<span class="rename-arrow">→</span>`),
      ]);
    }
    // 家紋：kamon.clan_id があれば、その大名家の家紋の絵（data/clans/index.json の kamonImage）を名前の前に出し、権利表記を添える
    if (p.kamon) {
      const k = p.kamon.clan_id && kamonImages[p.kamon.clan_id];
      if (k) {
        const lic = k.licenseUrl
          ? `<a href="${esc(k.licenseUrl)}" target="_blank" rel="noopener">${esc(k.license)}</a>`
          : esc(k.license || "");
        const csrc = k.source ? `出典：<a href="${esc(k.source.url)}" target="_blank" rel="noopener">${esc(k.source.name)}</a>` : "";
        const kcredit = [k.author ? `作者：${esc(k.author)}` : "", lic, csrc, k.note ? esc(k.note) : ""].filter(Boolean).join(" ／ ");
        imageCredits.push([`家紋（${p.kamon.name}）`, kcredit]);
        facts.push([
          "家紋",
          `<span class="kamon-fact"><img class="kamon-fact-img" src="${esc(k.src)}" alt="家紋：${esc(p.kamon.name)}" loading="lazy">` +
            `<span><span>${esc(p.kamon.name)}</span>` +
            (p.kamon.note ? `<span class="kamon-fact-note">${linkText(p.kamon.note, p.kamon.links)}</span>` : "") +
            `</span></span>`,
        ]);
      } else {
        facts.push(["家紋", esc(p.kamon.name) + (p.kamon.note ? `<span class="muted">（${linkText(p.kamon.note, p.kamon.links)}）</span>` : "")]);
      }
    }
    if (p.birthplace) {
      const bp = p.birthplace;
      const place = [bp.name, bp.prefecture].filter(Boolean).map(esc).join(" / ");
      facts.push(["出生地", place]);
    }
    if (p.tags && p.tags.length) {
      facts.push(["分類", p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(" ")]);
    }
    const factsHTML = facts.length
      ? `<dl class="facts head-facts">${facts
          .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)
          .join("")}</dl>`
      : "";
    html.push(`
      <div class="person-head${portrait ? " has-portrait" : ""}">
        ${portrait}
        <div class="person-head-main">
          <h1>${esc(p.name)}${uncertain(p.birth && p.birth.uncertain)}</h1>
          <p class="kana">${esc(p.kana || "")}</p>
          <p><span class="years">${birth} 〜 ${death}</span></p>
          ${p.summary ? `<p class="summary">${lineBreaks(fmtText(esc(p.summary)))}</p>` : ""}
          ${factsHTML}
        </div>
      </div>
    `);

    // 呼び名の変遷
    if (p.nameHistory && p.nameHistory.length) {
      const items = p.nameHistory
        .map((n) => entry({ when: whenLabel(n.year, n.era).trim(), main: esc(n.value), after: uncertain(n.uncertain), note: n.note, links: n.links, tail: srcMarks(n.sourceId) }))
        .join("");
      put("nameHistory", "呼び名の変遷", `<ul class="entry-list">${items}</ul>`);
    }

    // 官位変遷
    if (p.ranks && p.ranks.length) {
      const items = p.ranks
        .map((r) => entry({ when: whenLabel(r.year, r.era).trim(), main: esc(r.title), note: r.note, links: r.links, tail: srcMarks(r.sourceId) }))
        .join("");
      put("ranks", "官位", `<ul class="entry-list">${items}</ul>`);
    }

    // 年表イベント・家系に紐付けて表示した記事は、末尾の関連記事から除外する
    const usedArticleIds = new Set();
    // 年代順に並べた年表（年表の地図でも同じ順・番号を使う）
    let timeline = [];

    // 家系（article_id があれば注記の横に考察リンクを出す。下書きの記事はリンクにせず「執筆中」と予告する）
    const articleLink = (id) => {
      const a = id && (articles || []).find((x) => x.id === id);
      if (!a) return "";
      if (a.draft) {
        return ` <span class="inline-article is-pending">
          <span class="inline-article-label">考察（執筆中）</span>${esc(a.title)}
        </span>`;
      }
      usedArticleIds.add(a.id);
      return ` <a class="inline-article" href="article.html?id=${encodeURIComponent(a.id)}">
          <span class="inline-article-label">考察</span>${esc(a.title)}
        </a>`;
    };
    if (p.family && p.family.length) {
      const items = p.family
        .map((r) => entry({ when: esc(r.relation), main: personLink(r), note: r.note, links: r.links, tail: srcMarks(r.sourceId), extra: articleLink(r.article_id) }))
        .join("");
      put("family", "家系・親族", `<ul class="entry-list">${items}</ul>`);
    }

    // 仕えた・仕えられた期間（例：（1573〜1591年）（〜1591年）（1576年〜））
    const period = (r) => {
      if (!r.from && !r.to) return "";
      const text = r.from && r.to ? `${esc(r.from)}〜${esc(r.to)}年` : r.from ? `${esc(r.from)}年〜` : `〜${esc(r.to)}年`;
      return ` <span class="muted">（${text}）</span>`;
    };

    // 仕えた主君
    if (p.lords && p.lords.length) {
      const items = p.lords
        .map((s) => entry({ main: personLink(s), after: period(s), note: s.note, links: s.links, tail: srcMarks(s.sourceId) }))
        .join("");
      put("lords", "仕えた人", `<ul class="entry-list">${items}</ul>`);
    }

    // 家臣団
    if (p.retainers && p.retainers.length) {
      const items = p.retainers
        .map((r) => entry({ main: personLink(r), after: period(r), note: r.note, links: r.links, tail: srcMarks(r.sourceId) }))
        .join("");
      put("retainers", "家臣団", `<ul class="entry-list">${items}</ul>`);
    }

    // 与力（主君から付けられた大名。家臣ではないので家臣団と分ける）
    if (p.yoriki && p.yoriki.length) {
      const items = p.yoriki
        .map((r) => entry({ main: personLink(r), after: period(r), note: r.note, links: r.links, tail: srcMarks(r.sourceId) }))
        .join("");
      const yn = p.yorikiNote;
      const note = yn ? `<p class="entry-note">${sentences(yn.text, srcMarks(yn.sourceId), yn.links)}</p>` : "";
      put("yoriki", "与力", `<ul class="entry-list">${items}</ul>${note}`);
    }

    // 領地変遷
    if (p.territories && p.territories.length) {
      // 座標（lat/lng）か令制国名（province）のある領地は地図にも番号付きで示す
      const hasMap = p.territories.some(onMap);
      const items = p.territories
        .map((t, i) => {
          const num = hasMap && onMap(t) ? `<span class="terr-num" style="background:${terrColor(i)}">${i + 1}</span>` : "";
          const pref = t.prefecture ? `<span class="muted">（${[].concat(t.prefecture).map(esc).join("・")}）</span>` : "";
          const until = t.untilNote
            ? `<div class="entry-note terr-until"><span class="terr-until-label">→ ${t.until ? esc(t.until) + "年" : "その後"}</span>${sentences(t.untilNote, "", t.links)}</div>`
            : "";
          const snap = hasMap && onMap(t) ? `<div class="terr-snap" data-i="${i}" role="img" aria-label="${esc(terrYears(t) + t.name)}の時点の領地"></div><p class="terr-snap-caption muted" data-i="${i}"></p>` : "";
          const head = `<div class="entry-head">${num}<span class="entry-when">${terrYears(t).trim()}</span><span class="entry-main">${esc(t.name)}</span>${pref}</div>`;
          const note = t.note || t.sourceId ? `<div class="entry-note">${sentences(t.note, srcMarks(t.sourceId), t.links) || srcMarks(t.sourceId)}</div>` : "";
          return `<li class="entry">${head}${note}${until}${snap}</li>`;
        })
        .join("");
      const mapHTML = hasMap
        ? `<div id="territory-map" class="territory-map" role="img" aria-label="領地の変遷の地図"></div>           <p class="territory-map-note muted">色は領地の範囲で、国の一部だけを領したときは郡の範囲を塗っています。色と番号は下の一覧と対応し、淡く点線で囲んだ範囲はのちに手放した領地です。一覧の各項目の下の地図は、その時点で持っていた領地だけを示します。線は年代順につないだもの、ピンは城など代表地点です。国界は1868年時点、郡界は1920年時点の境界による近似で、戦国期の境界とは細部で違います。</p>`
        : "";
      put("territories", "領地の変遷", `${mapHTML}<ul class="entry-list terr-list">${items}</ul>`);
    }

    // 指定の合戦に関連する記事（この人物に関連するもの）を探す
    function articlesForBattle(battleId) {
      if (!battleId) return [];
      return (articles || []).filter(
        (a) =>
          !a.draft &&
          (a.relatedPeople || []).includes(p.id) &&
          (a.relatedBattles || []).includes(battleId)
      );
    }
    function inlineArticleHTML(list) {
      if (!list.length) return "";
      return list
        .map((a) => {
          usedArticleIds.add(a.id);
          return `<a class="inline-article" href="article.html?id=${encodeURIComponent(a.id)}">
              <span class="inline-article-label">考察</span>${esc(a.title)}
            </a>`;
        })
        .join("");
    }

    // 欄の挿絵（illusts）の figure。記事の挿絵と同じ形で、表記は図の下に出す
    const illustFig = (il) => {
      const cap = il.caption || "";
      return `<figure class="article-figure article-figure--illust person-illust">
          <img src="${esc(il.src)}" alt="${esc(cap)}" loading="lazy"><figcaption>
          ${cap ? `<span class="portrait-title">${lineBreaks(esc(cap))}</span>` : ""}
          <span class="img-credit">${esc(il.credit || "イラスト：ぱぱねこの戦国見立て（AIで作成）")}</span>
        </figcaption></figure>`;
    };
    // 年表の項目に添える挿絵（key が timeline で item がその項目の title のもの）は、その項目の説明の下に置く
    const itemIllusts = (key, title) =>
      (p.illusts || []).filter((il) => il.key === key && il.item && il.item === title && il.src).map(illustFig).join("");

    // 年表
    if (p.timeline && p.timeline.length) {
      // 同じ年で月の無い出来事は、データに書いた順のまま置く（月が無いからといって年の初めに回さない）
      timeline = p.timeline.slice().sort((a, b) => (a.year - b.year) || (a.month && b.month ? a.month - b.month : 0));
      // 場所の分かる出来事（合戦・城のページがあるか、座標がある）は、年表の上の地図に番号付きで示す
      const hasMap = timeline.some(hasEventPlace);
      const items = timeline
        .map((e, i) => {
          const num = hasMap && hasEventPlace(e) ? `<span class="terr-num">${i + 1}</span>` : "";
          const related = inlineArticleHTML(articlesForBattle(e.battle_id));
          // battle_id があれば合戦ページへ、castle_id があれば城ページへ、見出しをリンクにする
          const title = e.battle_id
            ? `<a class="t-battle-link" href="battle.html?id=${encodeURIComponent(e.battle_id)}">${esc(e.title)}</a>`
            : e.castle_id
            ? `<a class="t-battle-link" href="castle.html?id=${encodeURIComponent(e.castle_id)}">${esc(e.title)}</a>`
            : esc(e.title);
          // 説明は見出しの下に字下げして線を引く（他の一覧と同じ）。出典は説明の最後の文の末尾に付ける
          const desc = e.description
            ? sentSpans(splitSentences(linkText(e.description, e.links)), (t) => t, srcMarks(e.sourceId))
            : srcMarks(e.sourceId);
          // toYear のある項目は、出来事ではなく期間についての注記（記録の空白など）として控えめに出す
          return `<li${e.toYear ? ' class="t-span"' : ""}>
            <span class="t-year">${e.toYear ? `<span>${esc(e.year)}〜</span><span>${esc(e.toYear)}年</span>` : `<span>${esc(e.year)}年</span>${e.month ? `<span>${esc(e.month)}月</span>` : ""}`}</span>
            <div>
              <div class="entry-head"><span class="t-title">${num}${title}</span></div>
              ${desc ? `<div class="entry-note">${desc}</div>` : ""}
              ${related ? `<div class="t-related">${related}</div>` : ""}
              ${itemIllusts("timeline", e.title)}
            </div>
          </li>`;
        })
        .join("");
      const mapHTML = hasMap
        ? `<div id="timeline-map" class="territory-map" role="img" aria-label="年表の出来事の地図"></div>
           <p class="territory-map-note muted">番号は下の年表と対応しています。合戦・城の項目はそのページの地点に、ほかは出来事の場所に置いています。近い地点の出来事は1本のピンにまとめ、拡大すると分かれます。</p>`
        : "";
      put("timeline", "年表", `${mapHTML}<ul class="timeline">${items}</ul>`);
    }

    // 成し遂げたこと
    if (p.achievements && p.achievements.length) {
      const items = p.achievements
        .map((a) => entry({ main: esc(a.title), note: a.description, links: a.links, tail: srcMarks(a.sourceId) }))
        .join("");
      put("achievements", "成し遂げたこと", `<ul class="entry-list">${items}</ul>`);
    }

    // 人物評価（時代別。同じ era が続くときはラベルを最初の1つだけ出す）
    if (p.reputation && p.reputation.length) {
      const items = p.reputation
        .map((r, i) => {
          // 見出し：title があればそれ、無ければ本文の最初の一文（「〜と見られていた。」の要約）。残りを字下げした説明にする
          const body = String(r.body ?? "");
          const first = r.title ? "" : splitSentences(body.split("\n")[0])[0] || "";
          const head = r.title || first;
          const rest = body.slice(first.length).replace(/^\n+/, "");
          const mark = srcMarks(r.sourceId);
          return `<div class="rep-item">
            ${i > 0 && p.reputation[i - 1].era === r.era ? "<span></span>" : `<span class="rep-era">${esc(r.era)}</span>`}
            <div class="rep-body">
              <div class="entry-head"><span class="entry-main">${markQuotes(esc(head))}</span>${rest ? "" : mark}</div>
              ${rest ? `<div class="entry-note">${paras(rest, mark, r.links)}</div>` : ""}
            </div>
          </div>`;
        })
        .join("");
      put("reputation", "人物評価", `<div class="rep-list">${items}</div>`);
    }

    // 逸話
    if (p.episodes && p.episodes.length) {
      const items = p.episodes
        .map((e) => entry({ main: esc(e.title), after: uncertain(e.uncertain), note: e.body, links: e.links, tail: srcMarks(e.sourceId) }))
        .join("");
      put("episodes", "逸話・エピソード", `<ul class="entry-list">${items}</ul>`);
    }

    // 諸説・疑問（題名と短い説明だけを出し、詳しくは考察記事へリンクする）。
    // place があれば置き場所を変える：lens は冒頭の「この人物への問い」の下、family・nameHistory などはその欄の末尾。
    // 置き場所の欄が無ければ、ふつうの「諸説・疑問」に出す
    const lens = p.lens && p.lens.question ? p.lens : null;
    const qItems = (list) =>
      list
        .map((q) => entry({ main: esc(q.title), note: q.text, links: q.links, tail: srcMarks(q.sourceId), extra: articleLink(q.article_id) }))
        .join("");
    const qPlace = (q) =>
      q.place === "lens" || q.place === "lensSide" ? (lens ? q.place : "") : q.place && S[q.place] ? q.place : "";
    const qs = p.questions || [];
    for (const place of new Set(qs.map(qPlace))) {
      if (!place || place === "lens" || place === "lensSide") continue;
      S[place].inner += `<div class="sec-questions"><p class="sec-questions-title">この欄をめぐる疑問</p><ul class="entry-list">${qItems(qs.filter((q) => qPlace(q) === place))}</ul></div>`;
    }
    const restQs = qs.filter((q) => !qPlace(q));
    if (restQs.length) put("questions", "諸説・疑問", `<ul class="entry-list">${qItems(restQs)}</ul>`);

    // この人物への問い：ページ全体で捉え直す大きな問い。その下に place: "lens" の論点を並べ、
    // 最後に論点を束ねた答え（answer）を「まとめ」の開閉ボタンに入れる（ふだんは閉じる）。
    // 見立て（view。史料の外へ出る管理人の私見）は、管理人が書いたときだけ、まとめの下に閉じずに囲みで出す
    const lensSummary = (lens) =>
      (lens.answer
        ? `<details class="lens-summary"><summary class="lens-summary-label">まとめ</summary>
          <div class="lens-summary-body">${paras(lens.answer)}</div></details>`
        : "") +
      (lens.view ? `<div class="lens-summary-view"><span class="my-view-label">ぱぱねこの見立て</span>${paras(lens.view)}</div>` : "");
    // 総論の記事（lens.article_id）があるときは、論点・まとめの全文・見立てはその記事に任せ、
    // ここには問いと記事への入口だけを出す（人物 → 総論の記事 → 各論点の記事）。答えも管理人の判断なので記事の側に置く
    const lensArticle = lens && lens.article_id ? (articles || []).find((x) => x.id === lens.article_id) : null;
    if (lens && lensArticle && !lensArticle.draft) {
      usedArticleIds.add(lensArticle.id);
      put("lens", lens.title || "この人物への問い", `<div class="lens">
          <p class="lens-question">${lineBreaks(fmtText(esc(lens.question)))}</p>
        </div>
        <a class="lens-go" href="article.html?id=${encodeURIComponent(lensArticle.id)}">
          <span class="lens-go-label">この問いを捉え直す</span>
          <span class="lens-go-title">${esc(lensArticle.title)}</span>
          <span class="lens-go-note">五つの面から確かめた答えと、ぱぱねこの見立て。各論点の考察記事へもここから</span>
        </a>`);
    } else if (lens) {
      const lensQs = qs.filter((q) => qPlace(q) === "lens");
      const lensLabel = (q, i) => `論点${i + 1}${q.aspect ? `：${esc(q.aspect)}` : ""}`;
      put("lens", lens.title || "この人物への問い", `<div class="lens">
          <p class="lens-question">${lineBreaks(fmtText(esc(lens.question)))}</p>
        </div>
        ${lensQs.length ? `<div class="lens-subs">
          <p class="lens-subs-title">この問いを${lensQs.length}つの論点に分けて考える</p>
          <ol class="entry-list lens-subs-list">${lensQs
            .map((q, i) => entry({ when: lensLabel(q, i), main: esc(q.title), note: q.text, links: q.links, tail: srcMarks(q.sourceId), extra: articleLink(q.article_id) }))
            .join("")}</ol>
        </div>` : ""}
        ${lensSummary(lens)}`);
      // 大きな問いと並ぶ問い（place: "lensSide"）。論点に分けず、問いごとに大きな問いと同じ高さの欄を立てる
      qs.filter((q) => qPlace(q) === "lensSide").forEach((q, i) => {
        put(`lensSide:${i}`, q.title, `<div class="lens">
            <p class="lens-question">${lineBreaks(fmtText(linkText(q.text, q.links)))}</p>
          </div>
          <p class="lens-side-foot">${srcMarks(q.sourceId)}${articleLink(q.article_id)}</p>`);
      });
    }

    // ゆかりの地・史跡（墓所もここにまとめる。墓所の状態は不明・なしも必ず明示）
    // 地点の分かる場所（座標か城のページがある）は、欄の上の地図に番号付きで示す。番号は墓所→ゆかりの地の表示順
    const spotPts = [];
    const spotItem = (s, type) => {
      const place = [s.prefecture, s.city].filter(Boolean).map(esc).join(" ");
      let num = "";
      if (hasCoords(s) || s.castle_id) {
        spotPts.push({ s, type, n: spotPts.length + 1 });
        num = `<span class="terr-num">${spotPts.length}</span>`;
      }
      // castle_id があれば城ページへ、url があれば公式サイトなどへのリンクにする
      const name = s.castle_id
        ? `<a href="castle.html?id=${encodeURIComponent(s.castle_id)}">${esc(s.name)}</a>`
        : spotName(s);
      return `<div class="spot-item">
            <div class="entry-head">${num}<span class="spot-type">${esc(type)}</span><b>${name}</b>${place ? `<span class="spot-place">／ ${place}</span>` : ""}${s.castle_id ? "" : spotLinkNote(s)}</div>
            ${s.description || s.sourceId ? `<div class="entry-note">${sentences(s.description, srcMarks(s.sourceId), s.links) || srcMarks(s.sourceId)}</div>` : ""}
          </div>`;
    };
    const g = p.graves;
    const gravePlaces = (g && g.places) || [];
    // 墓所と同じ場所が spots にもあれば、墓所の側だけを出す
    const graveNames = new Set(gravePlaces.map((pl) => pl.name));
    const spots = (p.spots || []).filter((s) => !graveNames.has(s.name));
    if (g || spots.length) {
      const grave = g
        ? `<div class="grave-block">
            <div class="grave-status">墓所：<b>${esc(g.status || "不明")}</b>
              ${g.note || g.sourceId ? `<div class="entry-note">${sentences(g.note, srcMarks(g.sourceId), g.links) || srcMarks(g.sourceId)}</div>` : ""}
            </div>
            ${gravePlaces.map((pl) => spotItem(pl, "墓所")).join("")}
          </div>`
        : "";
      const list = spots.map((s) => spotItem(s, s.type)).join("");
      const mapHTML = spotPts.length
        ? `<div id="spot-map" class="territory-map" role="img" aria-label="ゆかりの地・史跡の地図"></div>
           <p class="territory-map-note muted">番号は下の一覧と対応しています。城跡は城のページの地点に置いています。近い場所は1本のピンにまとめ、拡大すると分かれます。</p>`
        : "";
      put("spots", "ゆかりの地・史跡", mapHTML + grave + list);
    }

    // 関連する考察・記事（年表イベントに紐付け済みのものは除外）
    const relArticles = (articles || [])
      .filter(
        (a) =>
          !a.draft &&
          (a.relatedPeople || []).includes(p.id) &&
          !usedArticleIds.has(a.id)
      )
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (relArticles.length) {
      const items = relArticles
        .map(
          (a) => `<div class="ref-item">
            <span class="article-cat">${esc(a.category || "記事")}</span>
            <a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a>
            ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
          </div>`
        )
        .join("");
      put("articles", "関連する考察・記事", items);
    }

    // 参考書籍
    if (p.references && p.references.length) {
      const items = p.references
        .map((r) => {
          const title = r.affiliateUrl
            ? `<a href="${esc(r.affiliateUrl)}" target="_blank" rel="noopener">${esc(r.title)}</a>`
            : esc(r.title);
          // リンク先が Amazon のときはその旨を添える
          const shop = /(^|\.)amazon\.co\.jp$/.test(new URL(r.affiliateUrl || "about:blank").hostname)
            ? `<span class="entry-link-note">［リンク先：Amazon］</span>`
            : "";
          const meta = [r.author, r.publisher, r.year].filter(Boolean).map(esc).join(" / ");
          // 1行目：書名・著者・出版社・年・リンク先、その下に紹介（句点ごとに改行）
          return `<li class="entry">
            <div class="entry-head"><span class="entry-main">${title}</span>${meta ? `<span class="entry-meta">${meta}</span>` : ""}${shop}</div>
            ${r.note ? `<div class="entry-note">${sentences(r.note, "", r.links)}</div>` : ""}
          </li>`;
        })
        .join("");
      put("references", "参考書籍", `<ul class="entry-list">${items}</ul>`);
    }

    // 出典（種別・一次/二次を明示）
    if (p.sources && p.sources.length) {
      const items = p.sources
        .map((s) => {
          const meta = [s.author, s.publisher, s.year, s.page].filter(Boolean).map(esc).join(" / ");
          const title = s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>`
            : esc(s.title);
          // リンク先が資料そのものでないとき（書誌・刊本・紹介ページなど）はその旨を添える
          const linkNote = s.url && s.urlLabel
            ? `<span class="entry-link-note">［リンク先：${esc(s.urlLabel)}］</span>`
            : "";
          // 塗りつぶし＝区分（色は SRC_CLASS）、枠だけ＝種別
          const badges =
            (s.primary ? `<span class="src-primary ${SRC_CLASS[s.primary] || ""}">${esc(s.primary)}</span>` : "") +
            (s.type ? `<span class="src-type">${esc(s.type)}</span>` : "");
          // 左の列にバッジ、右の列に題名（横にリンク先）とその下の著者・出版社・年・頁。題名と著者の頭をそろえる
          return `<li class="entry src-entry">
            <span class="src-badges">${badges}</span>
            <div>
              <div class="entry-head"><span class="entry-main">${title}</span>${meta ? `<span class="entry-meta">${meta}</span>` : ""}${linkNote}</div>
              ${s.note ? `<div class="entry-note">${sentences(s.note, "", s.links)}</div>` : ""}
            </div>
          </li>`;
        })
        .join("");
      put("sources", "出典", `${SRC_LEGEND}<ul class="entry-list src-list">${items}</ul>`);
    }

    // 要確認（調査メモ）：まだ確かめられていない事柄と、確かめるのに当たる資料。ページの最後に備考として出す
    if (p.toVerify && p.toVerify.length) {
      const items = p.toVerify
        .map((v) =>
          entry({
            when: esc(v.section || ""),
            main: esc(v.title),
            note: v.text,
            links: v.links,
            extra: v.checkWith && v.checkWith.length
              ? `<div class="entry-note verify-with">確認先：${[].concat(v.checkWith).map((c) => fmtText(esc(c))).join("／")}</div>`
              : "",
          })
        )
        .join("");
      const checkedNote = p.sourcesChecked
        ? `<p class="muted"><strong>出典の確認状況</strong>：出典ごとの確認状況は、すぐ上の「出典」欄の各出典の説明に記しています。「原典未確認」とした記述は、研究書などからの孫引きです。</p>`
        : "";
      put("toVerify", "要確認（調査メモ）", `${checkedNote}<p class="muted">ページの記述のうち、まだ原典や原本で確かめられていない事柄と、確かめるのに当たる資料の控えです。</p><ul class="entry-list verify-list">${items}</ul>`);
    }

    // 欄の挿絵（illusts）：key の欄の見出しのすぐ下に置く。大きな問い（lens）だけは、問いの文の下に置く。
    // item（年表の項目の title）があるものは、上の年表の組み立てでその項目の下に置いたので、ここでは扱わない。
    // 置き場所の欄が無いときは出さない。同じ欄に2枚以上あるときはデータの順に並ぶよう、後ろから順に先頭へ差し込む
    for (const il of [...(p.illusts || [])].reverse()) {
      const sec = S[il.key];
      if (!sec || !il.src || il.item) continue;
      const fig = illustFig(il);
      if (il.key === "lens") sec.inner = sec.inner.replace(/(<div class="lens">[\s\S]*?<\/div>)/, `$1${fig}`);
      else sec.inner = fig + sec.inner;
    }

    // 画像の出典：冒頭の肖像画・家紋の絵の権利表記。ページの最後に置く
    if (imageCredits.length) {
      put(
        "imageCredits",
        "画像の出典",
        `<ul class="photo-credit-list">${imageCredits
          .map(([name, c]) => `<li><span class="credit-name">${esc(name)}</span>${c}</li>`)
          .join("")}</ul>`
      );
    }

    // 欄を組ごとに並べる（組の見出しは README の人物データベースの問いかけ）。中身のない組は出さない
    let gn = 0;
    for (const grp of GROUPS) {
      // lensSide は、大きな問いと並ぶ問いの欄（lensSide:0, lensSide:1 …）をまとめて指す
      const keys = grp.keys
        .flatMap((k) => (k === "lensSide" ? Object.keys(S).filter((x) => x.startsWith("lensSide:")) : [k]))
        .filter((k) => S[k]);
      if (!keys.length) continue;
      const gid = "grp-" + ++gn;
      tocGroups.push({ id: gid, title: grp.title, items: [] });
      html.push(`<div class="sec-group-head" id="${gid}" role="heading" aria-level="2">
          <span class="sec-group-title">${esc(grp.title)}</span>${grp.sub ? `<span class="sec-group-sub">${esc(grp.sub)}</span>` : ""}
        </div>`);
      for (const k of keys) html.push(section(S[k].title, S[k].inner));
    }

    // 目次をヘッダー（html[0]）の直後に挿入
    html.splice(1, 0, tocHTML());

    contentEl.innerHTML = html.join("");
    if (document.getElementById("territory-map")) initTerritoryMap(p.territories);
    if (document.getElementById("timeline-map")) initTimelineMap(timeline);
    if (document.getElementById("spot-map")) initSpotMap(spotPts);
  }

  // 年表の出来事の場所：座標があればそこ、無ければ城、合戦のページの地点
  function hasEventPlace(e) {
    return hasCoords(e) || !!e.castle_id || !!e.battle_id;
  }

  // 年表の地図：出来事ごとの番号付きピン
  function initTimelineMap(events) {
    const el = document.getElementById("timeline-map");
    const index = (url, key) =>
      fetch(url)
        .then((res) => (res.ok ? res.json() : {}))
        .catch(() => ({}))
        .then((d) => new Map((d[key] || []).map((x) => [x.id, x])));
    Promise.all([loadLeaflet(), index("data/battles/index.json", "battles"), index("data/castles/index.json", "castles")])
      .then(([L, battles, castles]) => {
        const pts = events
          .map((e, i) => {
            const at = hasCoords(e) ? e : castles.get(e.castle_id) || battles.get(e.battle_id);
            if (!hasCoords(at)) return null;
            const where = e.place || (at === e ? "" : at.name);
            return { e, n: i + 1, ll: [Number(at.lat), Number(at.lng)], where };
          })
          .filter(Boolean);
        pinMap(L, el, pts, ({ e, n, where }) => {
          const when = `${esc(e.year)}年${e.month ? esc(e.month) + "月" : ""}`;
          const place = where ? `地図の位置：${esc(where)}${e.approx ? "（おおよそ）" : ""}` : "";
          return `<div class="terr-popup"><b>${n}. ${when} ${esc(e.title)}</b>${place ? `<div class="muted">${place}</div>` : ""}</div>`;
        });
      })
      .catch((err) => {
        console.error(err);
        el.outerHTML = `<p class="muted">地図を読み込めませんでした。</p>`;
      });
  }

  // ゆかりの地・史跡の地図：場所ごとの番号付きピン（座標が無ければ城のページの地点）
  function initSpotMap(spotPts) {
    const el = document.getElementById("spot-map");
    Promise.all([
      loadLeaflet(),
      fetch("data/castles/index.json")
        .then((res) => (res.ok ? res.json() : {}))
        .catch(() => ({}))
        .then((d) => new Map((d.castles || []).map((x) => [x.id, x]))),
    ])
      .then(([L, castles]) => {
        const pts = spotPts
          .map((x) => {
            const at = hasCoords(x.s) ? x.s : castles.get(x.s.castle_id);
            return hasCoords(at) ? { ...x, ll: [Number(at.lat), Number(at.lng)] } : null;
          })
          .filter(Boolean);
        pinMap(L, el, pts, ({ s, type, n }) =>
          `<div class="terr-popup"><b>${n}. ${esc(s.name)}</b><div class="muted">${esc(type)}${s.approx ? "（地図の位置はおおよそ）" : ""}</div></div>`
        );
      })
      .catch((err) => {
        console.error(err);
        el.outerHTML = `<p class="muted">地図を読み込めませんでした。</p>`;
      });
  }

  // 番号付きピンの地図（年表・ゆかりの地で共通）。pts は { n, ll }、popupOf はピンの吹き出しの HTML
  function pinMap(L, el, pts, popupOf) {
    if (!pts.length) {
      el.remove();
      return;
    }
    const map = L.map(el, { scrollWheelZoom: false }).setView([35, 136], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // 画面上で重なるほど近い地点は 1 本のピンにまとめる（例：「2・3」）。拡大・縮小のたびにまとめ直す
    const markers = L.layerGroup().addTo(map);
    const drawPins = () => {
      markers.clearLayers();
      const groups = [];
      for (const x of pts) {
        const px = map.latLngToContainerPoint(x.ll);
        const g = groups.find((g) => g.px.distanceTo(px) < 28);
        if (g) g.list.push(x);
        else groups.push({ px, list: [x] });
      }
      for (const { list } of groups) {
        const label = list.map((x) => x.n).join("・");
        const icon = L.divIcon({ className: "terr-marker", html: `<span>${esc(label)}</span>`, iconSize: null });
        L.marker(list[0].ll, { icon, title: label }).bindPopup(list.map(popupOf).join("")).addTo(markers);
      }
    };

    map.invalidateSize();
    if (pts.length === 1) map.setView(pts[0].ll, 10);
    else map.fitBounds(L.latLngBounds(pts.map((x) => x.ll)), { padding: [24, 24] });
    drawPins();
    map.on("zoomend", drawPins);
  }

  function hasCoords(t) {
    return t && isFinite(Number(t.lat)) && isFinite(Number(t.lng)) && t.lat != null && t.lng != null;
  }

  // Leaflet は地図がある人物ページでだけ読み込む
  const LEAFLET = "https://unpkg.com/leaflet@1.9.4/dist/";
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return new Promise((resolve, reject) => {
      // CSS が効く前に地図を作ると大きさを読み違えるので、CSS と JS の両方を待つ
      let pending = 2;
      const done = () => --pending === 0 && resolve(window.L);
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET + "leaflet.css";
      css.onload = done;
      css.onerror = reject;
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = LEAFLET + "leaflet.js";
      js.onload = done;
      js.onerror = reject;
      document.head.appendChild(js);
    });
  }

  function onMap(t) {
    return hasCoords(t) || areasOf(t).length > 0;
  }

  const asList = (v) => (!v ? [] : Array.isArray(v) ? v : [v]);

  // 塗る範囲。国の一部だけなら district（"但馬国朝来郡" か配列）で郡を、国全体なら province（"大和国" か配列）で国を塗る。
  // 郡と国全体が混じるときは district に国名も並べる（例 ["伊勢国安濃郡", "伊賀国"]）
  function areasOf(t) {
    if (!t) return [];
    const d = asList(t.district);
    return d.length ? d : asList(t.province);
  }
  const isDistrict = (name) => /郡$/.test(name);

  // 国界（tools/build-provinces.py）と郡界（tools/build-districts.py）。塗る範囲がある人物ページでだけ、要る方を読み込む
  function loadAreas(territories) {
    const names = territories.flatMap(areasOf);
    const get = (url) =>
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
    return Promise.all([
      names.some((n) => !isDistrict(n)) ? get("assets/geo/provinces.geojson") : null,
      names.some(isDistrict) ? get("assets/geo/districts.geojson") : null,
    ]).then(([prov, dist]) => ({
      features: [...(prov ? prov.features : []), ...(dist ? dist.features : [])],
      prov: !!prov,
      dist: !!dist,
    }));
  }

  // 領地の項目ごとに色を変える（一覧の番号・ピン・塗りを同じ色にして対応を分かりやすくする）
  const TERR_COLORS = ["#d64545", "#2f7fc1", "#e38b1d", "#3a9a4f", "#8a52b0", "#0f9a9a", "#c2477f", "#7a5a3a"];
  const terrColor = (i) => TERR_COLORS[i % TERR_COLORS.length];

  // 「1580〜1585年 」。until（手放した・移った年）が無ければ「1585年 」
  function terrYears(t) {
    if (!t.year) return t.until ? `〜${esc(t.until)}年 ` : "";
    return t.until ? `${esc(t.year)}〜${esc(t.until)}年 ` : `${esc(t.year)}年 `;
  }

  // その項目の年に持っていた領地の項目番号。年より前に得て、まだ手放していない（until がその年より後）もの
  function heldAt(territories, i) {
    const y = territories[i].year;
    if (!y) return [i];
    return territories
      .map((t, j) => j)
      .filter((j) => {
        const t = territories[j];
        return j === i || (onMap(t) && t.year && t.year <= y && (!t.until || t.until > y));
      });
  }

  const SNAP_MAX_ZOOM = 8;

  // 一覧の各項目の下に置く、その時点の領地だけの地図。その項目の範囲は濃く、同時に持っていた他の領地は淡く塗る
  function initSnapshotMap(L, geo, territories, i, el) {
    const held = heldAt(territories, i);
    const map = L.map(el, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: false }).setView([35, 136], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // 国・郡ごとに、塗る色を決める項目（この項目を優先、無ければ最初に挙げた項目）
    const areas = new Map();
    for (const j of held) {
      for (const name of areasOf(territories[j])) {
        if (!areas.has(name) || j === i) areas.set(name, j);
      }
    }
    const layers = [];
    const order = [...areas].sort(([a], [b]) => isDistrict(a) - isDistrict(b));
    for (const [name, j] of order) {
      const f = geo.features.find((x) => x.properties.name === name);
      if (!f) continue;
      const color = terrColor(j);
      const style = j === i
        ? { color, weight: 2, opacity: 1, fillColor: color, fillOpacity: 0.45 }
        : { color, weight: 1, opacity: 0.7, fillColor: color, fillOpacity: 0.18 };
      layers.push(L.geoJSON(f, { style }).bindPopup(`<div class="terr-popup"><b>${esc(name)}</b></div>`).addTo(map));
    }

    const pts = [];
    for (const j of held) {
      const t = territories[j];
      if (!hasCoords(t)) continue;
      const ll = [Number(t.lat), Number(t.lng)];
      if (pts.some((p) => p[0] === ll[0] && p[1] === ll[1])) continue;
      pts.push(ll);
      const icon = L.divIcon({
        className: "terr-marker" + (j === i ? "" : " is-sub"),
        html: `<span style="background:${terrColor(j)}">${j + 1}</span>`,
        iconSize: null,
      });
      L.marker(ll, { icon, title: t.place || t.name }).addTo(map);
    }

    const caption = document.querySelector(`.terr-snap-caption[data-i="${i}"]`);
    if (caption) {
      const names = [...areas.keys()].filter((n) => !isDistrict(n) || ![...areas.keys()].some((m) => !isDistrict(m) && n.startsWith(m)));
      caption.textContent = `${territories[i].year ? territories[i].year + "年の時点の領地" : "この時点の領地"}：${names.join("・") || territories[i].name}${territories[i].mapNote ? `（${territories[i].mapNote}）` : ""}`;
    }

    map.invalidateSize();
    const bounds = L.latLngBounds(pts);
    for (const layer of layers) bounds.extend(layer.getBounds());
    return { map, bounds };
  }

  // その時点の地図を並べたとき、続く項目の範囲が重なるあいだは同じ表示範囲にして、移り変わりを見比べやすくする
  function fitSnapshotMaps(snaps) {
    const groups = [];
    for (const snap of snaps) {
      if (!snap.bounds.isValid()) continue;
      const last = groups[groups.length - 1];
      if (last && last.bounds.intersects(snap.bounds)) {
        last.bounds.extend(snap.bounds);
        last.snaps.push(snap);
      } else {
        groups.push({ bounds: L.latLngBounds(snap.bounds.getSouthWest(), snap.bounds.getNorthEast()), snaps: [snap] });
      }
    }
    // 郡ひとつなどの小さな範囲でも、どの地方かが分かる程度より寄せない
    for (const g of groups) {
      for (const { map } of g.snaps) map.fitBounds(g.bounds, { padding: [24, 24], maxZoom: SNAP_MAX_ZOOM });
    }
  }

  // 領地の変遷の地図：国の塗りつぶし＋番号付きピン＋年代順の線
  function initTerritoryMap(territories) {
    const el = document.getElementById("territory-map");
    Promise.all([loadLeaflet(), loadAreas(territories)])
      .then(([L, geo]) => {
        // ベクター図形を足す前に表示範囲を決めておく（未設定だと描画で落ちる）。最後に fitBounds で合わせ直す
        const map = L.map(el, { scrollWheelZoom: false }).setView([35, 136], 6);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
            (geo.prov ? ' | 国界: <a href="https://github.com/Asukana/Ryoseikoku_20230626_TSV">令制国データ</a> (CC0)' : "") +
            (geo.dist ? ' | 郡界: <a href="https://nlftp.mlit.go.jp/ksj/">国土数値情報 行政区域 1920年</a> (国土交通省, CC BY 4.0)' : ""),
        }).addTo(map);

        // 国・郡ごとに、最初に領地として出てくる年と該当する項目をまとめる
        const provs = new Map();
        territories.forEach((t, i) => {
          for (const name of areasOf(t)) {
            if (!provs.has(name)) provs.set(name, { first: i, items: [] });
            provs.get(name).items.push({ t, n: i + 1 });
          }
        });

        const provLayers = new Map();
        // 国を先に、郡を後に描いて、国の中の郡が隠れないようにする
        const order = [...provs].sort(([a], [b]) => isDistrict(a) - isDistrict(b));
        for (const [name, info] of order) {
          const f = geo.features.find((x) => x.properties.name === name);
          if (!f) continue;
          const color = terrColor(info.first);
          // その国・郡を挙げた項目がすべて until 付きなら、のちに手放した領地として淡く点線で描く
          const lost = info.items.every(({ t }) => t.until);
          const popup = `<div class="terr-popup"><b>${esc(name)}</b>${info.items
            .map(({ t, n }) => `<div>${n}. ${terrYears(t)}${esc(t.name)}</div>`)
            .join("")}</div>`;
          const layer = L.geoJSON(f, {
            style: lost
              ? { color, weight: 1.5, opacity: 0.9, dashArray: "5 4", fillColor: color, fillOpacity: 0.14 }
              : { color, weight: 1.5, opacity: 0.9, fillColor: color, fillOpacity: 0.38 },
          })
            .bindPopup(popup)
            .addTo(map);
          provLayers.set(name, layer);
        }

        // ピンの位置：座標があればそこ、無ければ国の範囲の中心
        const pts = territories
          .map((t, i) => {
            if (hasCoords(t)) return { t, n: i + 1, ll: [Number(t.lat), Number(t.lng)] };
            const layer = provLayers.get(areasOf(t)[0]);
            if (!layer) return null;
            const c = layer.getBounds().getCenter();
            return { t, n: i + 1, ll: [c.lat, c.lng] };
          })
          .filter(Boolean);

        L.polyline(pts.map((x) => x.ll), { color: "#9b2d20", weight: 2, opacity: 0.7, dashArray: "6 6" }).addTo(map);

        // 同じ地点の領地は 1 本のピンにまとめる（例：「1・2」）
        const groups = new Map();
        for (const x of pts) {
          const key = x.ll.join(",");
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(x);
        }
        for (const list of groups.values()) {
          const label = list.map((x) => x.n).join("・");
          const icon = L.divIcon({
            className: "terr-marker",
            html: `<span style="background:${terrColor(list[0].n - 1)}">${esc(label)}</span>`,
            iconSize: null,
          });
          const popup = list
            .map(({ t, n }) => {
              const where = t.place ? `地図の位置：${esc(t.place)}${t.approx ? "（おおよそ）" : ""}` : t.approx ? "位置はおおよそ" : "";
              return `<div class="terr-popup"><b>${n}. ${terrYears(t)}${esc(t.name)}</b>${t.note ? `<div>${markQuotes(esc(t.note))}</div>` : ""}${where ? `<div class="muted">${where}</div>` : ""}</div>`;
            })
            .join("");
          L.marker(list[0].ll, { icon, title: label }).bindPopup(popup).addTo(map);
        }

        map.invalidateSize();
        const bounds = L.latLngBounds(pts.map((x) => x.ll));
        for (const layer of provLayers.values()) bounds.extend(layer.getBounds());
        if (pts.length === 1 && !provLayers.size) map.setView(pts[0].ll, 10);
        else if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });

        fitSnapshotMaps(
          [...document.querySelectorAll(".terr-snap")].map((snapEl) => initSnapshotMap(L, geo, territories, Number(snapEl.dataset.i), snapEl))
        );
      })
      .catch((err) => {
        console.error(err);
        el.outerHTML = `<p class="muted">地図を読み込めませんでした。</p>`;
      });
  }

  Promise.all([
    fetch(`data/people/${encodeURIComponent(id)}.json`).then((res) => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    }),
    // 記事一覧は補助情報。取得できなくても人物ページは表示する
    fetch("data/articles/index.json")
      .then((res) => (res.ok ? res.json() : { articles: [] }))
      .catch(() => ({ articles: [] })),
    // 家紋の絵は大名家一覧のデータを使う（取得できなくても名前だけ出す）
    fetch("data/clans/index.json")
      .then((res) => (res.ok ? res.json() : { clans: [] }))
      .catch(() => ({ clans: [] })),
  ])
    .then(([p, adata, cdata]) => {
      const kamonImages = {};
      ((cdata && cdata.clans) || []).forEach((c) => { if (c.kamonImage) kamonImages[c.id] = c.kamonImage; });
      render(p, (adata && adata.articles) || [], kamonImages);
    })
    .catch((err) => {
      contentEl.innerHTML = `<p class="error">人物データを読み込めませんでした（ID: ${esc(id)}）。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
      console.error(err);
    });
})();
