// 地域から探す：全人物データを集約し、都道府県ごとに逆引き表示
(async function () {
  // 都道府県の選択ボックス（地域ごとの optgroup の中に県を並べる）
  const selectEl = document.getElementById("pref-select");
  const resultEl = document.getElementById("result");
  // 表示中の県の節（展示・人物・史跡）の目次（.side-toc。いま開いている節の強調は js/toc.js）
  const tocEl = document.getElementById("region-toc");

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  // 地方ごとの都道府県（都道府県コード順）。データのある県だけを選択ボックスに出す
  const PREF_GROUPS = [
    ["北海道", ["北海道"]],
    ["東北", ["青森県","岩手県","宮城県","秋田県","山形県","福島県"]],
    ["関東", ["茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県"]],
    ["中部", ["新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県"]],
    ["近畿", ["三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県"]],
    ["中国", ["鳥取県","島根県","岡山県","広島県","山口県"]],
    ["四国", ["徳島県","香川県","愛媛県","高知県"]],
    ["九州・沖縄", ["福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"]],
  ];
  const PREF_ORDER = PREF_GROUPS.flatMap(([, prefs]) => prefs);

  // regions[pref] = { people: Map<id,{name,reasons:Set}>, spots: [], exhibits: [] }
  const regions = {};
  function bucket(pref) {
    if (!regions[pref]) regions[pref] = { people: new Map(), spots: [], exhibits: [] };
    return regions[pref];
  }
  function addPerson(pref, id, name, reason) {
    if (!pref) return;
    const b = bucket(pref);
    if (!b.people.has(id)) b.people.set(id, { name, reasons: new Set() });
    b.people.get(id).reasons.add(reason);
  }

  try {
    const idxRes = await fetch("data/people/index.json");
    if (!idxRes.ok) throw new Error(idxRes.status);
    const ids = ((await idxRes.json()).people || []).map((p) => p.id);

    // 各人物データを取得して集約（件数が増えたら事前集約に切替予定）
    const people = await Promise.all(
      ids.map((id) =>
        fetch(`data/people/${encodeURIComponent(id)}.json`).then((r) =>
          r.ok ? r.json() : null
        )
      )
    );

    for (const p of people) {
      if (!p) continue;
      // 出身地
      if (p.birthplace && p.birthplace.prefecture) {
        addPerson(p.birthplace.prefecture, p.id, p.name, "出身");
      }
      // 領地
      for (const t of p.territories || []) {
        for (const pf of [].concat(t.prefecture || [])) addPerson(pf, p.id, p.name, "領地：" + (t.name || ""));
      }
      // 史跡・スポット
      for (const s of p.spots || []) {
        if (!s.prefecture) continue;
        bucket(s.prefecture).spots.push({
          type: s.type || "その他",
          name: s.name || "",
          city: s.city || "",
          description: s.description || "",
          personId: p.id,
          personName: p.name,
        });
      }
    }

    // お出かけトピック：会期が終わっていないものを会場の県に載せる（読めなくても人物側は出す）
    const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（ローカル日付）
    try {
      const tRes = await fetch("data/topics/index.json");
      if (tRes.ok) {
        for (const t of (await tRes.json()).topics || []) {
          if (t.stream !== "お出かけ" || !t.place || !t.place.prefecture) continue;
          const from = (t.period && t.period.from) || "";
          const to = (t.period && t.period.to) || "";
          if (to && to < today) continue;
          bucket(t.place.prefecture).exhibits.push({
            id: t.id,
            title: t.title || "",
            venue: [t.place.city, t.place.name].filter(Boolean).join(" "),
            from,
            to,
            upcoming: !!from && from > today,
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    for (const r of Object.values(regions)) {
      r.exhibits.sort((a, b) => (a.to || "9999").localeCompare(b.to || "9999"));
    }

    const activePrefs = PREF_ORDER.filter((pf) => regions[pf]);
    if (!activePrefs.length) {
      resultEl.innerHTML = `<p class="muted">まだ地域データがありません。</p>`;
      selectEl.innerHTML = "";
      return;
    }

    // 選択ボックス：地域を大分類（optgroup）、県を小分類にする。県名の後ろの数は載っている件数
    selectEl.innerHTML = PREF_GROUPS.map(([region, prefs]) => {
      const opts = prefs
        .filter((pf) => regions[pf])
        .map((pf) => {
          const r = regions[pf];
          const count = r.people.size + r.spots.length + r.exhibits.length;
          return `<option value="${esc(pf)}">${esc(pf)}（${count}）</option>`;
        })
        .join("");
      return opts ? `<optgroup label="${esc(region)}">${opts}</optgroup>` : "";
    }).join("");

    function renderPref(pf) {
      const r = regions[pf];
      // 人物
      let peopleHTML = "";
      if (r.people.size) {
        const items = [...r.people.entries()]
          .map(([id, v]) => {
            const reasons = [...v.reasons].filter(Boolean).map(esc).join("・");
            return `<a class="mini-card" href="person.html?id=${encodeURIComponent(id)}">
                <b>${esc(v.name)}</b>
                <span class="mini-reason">${reasons}</span>
              </a>`;
          })
          .join("");
        peopleHTML = `<section class="section" id="sec-people"><h2>ゆかりの人物</h2><div class="mini-grid">${items}</div></section>`;
      }
      // スポット
      let spotHTML = "";
      if (r.spots.length) {
        const items = r.spots
          .map((s) => {
            const place = s.city ? `<span class="spot-place">／ ${esc(s.city)}</span>` : "";
            return `<div class="spot-item">
                <span class="spot-type">${esc(s.type)}</span>
                <b>${esc(s.name)}</b>${place}
                <a class="spot-person" href="person.html?id=${encodeURIComponent(s.personId)}">＃${esc(s.personName)}</a>
                ${s.description ? `<div class="muted">${esc(s.description)}</div>` : ""}
              </div>`;
          })
          .join("");
        spotHTML = `<section class="section" id="sec-spots"><h2>史跡・スポット</h2>${items}</section>`;
      }
      // 開催中・開催予定の展示
      let exhibitHTML = "";
      if (r.exhibits.length) {
        const items = r.exhibits
          .map((x) => {
            const status = x.upcoming ? "開催予定" : "開催中";
            const period = x.from || x.to ? `${esc(x.from)} 〜 ${esc(x.to)}` : "";
            return `<div class="spot-item">
                <span class="spot-type">${status}</span>
                <a href="topic.html?id=${encodeURIComponent(x.id)}"><b>${esc(x.title)}</b></a>
                ${x.venue ? `<span class="spot-place">／ ${esc(x.venue)}</span>` : ""}
                ${period ? `<div class="muted">会期：${period}</div>` : ""}
              </div>`;
          })
          .join("");
        exhibitHTML = `<section class="section" id="sec-exhibits"><h2>今見られる展示・イベント</h2>${items}</section>`;
      }
      resultEl.innerHTML = `<h3 class="region-title">${esc(pf)}</h3>${exhibitHTML}${peopleHTML}${spotHTML}`;
      selectEl.value = pf;

      // 目次：この県に載っている節だけ（件数つき）
      const toc = [
        ["sec-exhibits", "今見られる展示・イベント", r.exhibits.length],
        ["sec-people", "ゆかりの人物", r.people.size],
        ["sec-spots", "史跡・スポット", r.spots.length],
      ].filter(([, , n]) => n);
      tocEl.hidden = !toc.length;
      tocEl.innerHTML = toc.length
        ? `<p class="toc-title">目次</p><ol>${toc
            .map(([id, label, n]) => `<li><a href="#${id}">${esc(label)}（${n}）</a></li>`)
            .join("")}</ol>`
        : "";
    }

    // 県を選んだら表示を替え、URL の ?pref= にも残す（再読み込み・共有しても同じ県を開く）
    selectEl.addEventListener("change", () => {
      const url = new URL(location.href);
      url.searchParams.set("pref", selectEl.value);
      history.replaceState(null, "", url);
      renderPref(selectEl.value);
    });

    // 初期表示：?pref= の県、なければ最初の県
    const want = new URLSearchParams(location.search).get("pref");
    renderPref(activePrefs.includes(want) ? want : activePrefs[0]);
  } catch (err) {
    resultEl.innerHTML = `<p class="error">地域データの読み込みに失敗しました。ローカルで開いている場合は簡易サーバー経由で表示してください（README参照）。</p>`;
    console.error(err);
  }
})();
