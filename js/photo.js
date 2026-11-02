// 写真・肖像の権利表記（城・合戦の photo、人物の portrait）。城・合戦の一覧と詳細、記事の本文画像で共用する
window.PhotoCredit = (function () {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const link = (text, url) =>
    url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text);

  // 撮影日 "2026-11" / "2026-11-02" → 「2026年11月」「2026年11月2日」
  function fmtTaken(t) {
    const m = String(t || "").match(/^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/);
    return m ? `${m[1]}年${Number(m[2])}月${m[3] ? Number(m[3]) + "日" : ""}` : String(t || "");
  }

  // 自分で撮った写真（own: true）は撮影者（省略時はサイト名）と撮影日だけを出し、ライセンスは書いてあれば出す。
  // それ以外（Commons など）は作者・ライセンス・出典を出し、CCの写真は縮小・トリミングしたことを書き添える
  function credit(ph) {
    const who = ph.own
      ? `撮影：${esc(ph.author || "戦国クロニクル")}${ph.taken ? `（${esc(fmtTaken(ph.taken))}）` : ""}`
      : ph.author ? `撮影：${esc(ph.author)}` : "";
    const src = ph.source && ph.source.name ? `出典：${link(ph.source.name, ph.source.url)}` : "";
    return [
      ph.holder ? `所蔵：${esc(ph.holder)}` : "",
      who,
      ph.license ? link(ph.license, ph.licenseUrl) : "",
      src,
      ph.licenseUrl && !ph.own ? "縮小・トリミングして使用" : "",
    ].filter(Boolean).join(" ／ ");
  }

  return { credit };
})();
