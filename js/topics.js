// 最新トピック（B＝最新情報）一覧：新着順フィード、ストリーム別フィルタ
(async function () {
  const listEl = document.getElementById("list");
  const filterEl = document.getElementById("filter");
  if (!listEl) return;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const byDateDesc = (a, b) =>
    String(b.date || "").localeCompare(String(a.date || ""));

  let topics = [];
  let current = "すべて";

  function metaLine(t) {
    const bits = [];
    if (t.period && (t.period.from || t.period.to)) {
      bits.push(`会期：${esc(t.period.from || "")}〜${esc(t.period.to || "")}`);
    }
    if (t.place && (t.place.name || t.place.prefecture)) {
      bits.push(`会場：${esc([t.place.prefecture, t.place.name].filter(Boolean).join(" "))}`);
    }
    if (t.platform) bits.push(`対応：${esc(t.platform)}`);
    return bits.length
      ? `<p class="topic-meta">${bits.join("　／　")}</p>`
      : "";
  }

  // 一覧カードはクリックで詳細ページ(topic.html)へ遷移するリンク。
  // 出どころ・関連リンクは詳細ページ側に置く（カード内でのリンク入れ子を避ける）。
  function card(t) {
    const thumb =
      t.images && t.images.length && t.images[0].src
        ? `<img class="card-thumb" src="${esc(t.images[0].src)}" alt="" loading="lazy">`
        : "";
    return `
      <a class="topic-card topic-card--link${thumb ? " topic-card--thumb" : ""}" href="topic.html?id=${encodeURIComponent(t.id)}">
        ${thumb}
        <div class="topic-card-body">
          <div class="topic-head">
            <span class="topic-stream stream-${esc(t.stream)}">${esc(t.stream || "情報")}</span>
            <span class="topic-date">${esc(t.date || "")}</span>
          </div>
          <h3 class="topic-title">${esc(t.title)}</h3>
          ${t.summary ? `<p class="topic-summary">${esc(t.summary)}</p>` : ""}
          ${metaLine(t)}
          ${t.take ? `<div class="topic-take"><span class="take-label">ひとこと</span>${esc(t.take)}</div>` : ""}
          <span class="topic-more">詳しく見る →</span>
        </div>
      </a>`;
  }

  function render() {
    const items = topics
      .filter((t) => !t.draft)
      .filter((t) => current === "すべて" || t.stream === current)
      .sort(byDateDesc);
    listEl.innerHTML = items.length
      ? items.map(card).join("")
      : `<p class="muted">この分類のトピックはまだありません。</p>`;
  }

  // 区分（ストリーム）の選択はプルダウン。選んだ区分の名前を行の左端（#order-current）に出す
  function buildFilter() {
    if (!filterEl) return;
    const streams = ["すべて", "新説", "お出かけ", "ゲーム"];
    const nameEl = document.getElementById("order-current");
    filterEl.innerHTML = streams
      .map((s) => `<option value="${esc(s)}"${s === current ? " selected" : ""}>${esc(s)}</option>`)
      .join("");
    filterEl.addEventListener("change", () => {
      current = filterEl.value;
      if (nameEl) nameEl.textContent = current;
      render();
    });
  }

  try {
    const res = await fetch("data/topics/index.json");
    if (!res.ok) throw new Error(res.status);
    topics = (await res.json()).topics || [];
    buildFilter();
    render();
  } catch (err) {
    listEl.innerHTML = `<p class="error">トピックの読み込みに失敗しました（README参照）。</p>`;
    console.error(err);
  }
})();
