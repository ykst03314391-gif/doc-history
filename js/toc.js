// 目次（.side-toc）で、いま画面に開いている節の項目を強調する（記事・人物・大名家・合戦・城で共通）。
// 目次は各ページの js が fetch の後に作るので、出てくるのを MutationObserver で待つ。
// 一覧ページは並べ方・検索のたびに目次を作り直すので、目次の中身が変わったら拾い直す。
(function () {
  // 画面の上からこの位置より上に見出しが来ていたら、その節を読んでいるとみなす
  const LINE = 120;
  let nav = null;
  let links = [];
  let current = null;
  let ticking = false;

  function setup() {
    nav = document.querySelector(".side-toc");
    if (!nav) return false;
    current = null;
    // 組の見出し（人物ページの .toc-group-link）は強調の対象にせず、中の項目が強調されたときに一緒に色を変える
    links = Array.from(nav.querySelectorAll('a[href^="#"]:not(.toc-group-link)'))
      .map((a) => ({ a, target: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
      .filter((l) => l.target);
    update();
    return true;
  }

  function update() {
    ticking = false;
    if (!links.length) return;
    let active = null;
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) active = links[links.length - 1];
    else {
      for (const l of links) {
        if (l.target.getBoundingClientRect().top <= LINE) active = l;
        else break;
      }
    }
    if (active === current) return;
    if (current) {
      current.a.classList.remove("is-current");
      const grp = current.a.closest(".toc-group");
      if (grp) grp.classList.remove("has-current");
    }
    current = active;
    if (!current) return;
    current.a.classList.add("is-current");
    const grp = current.a.closest(".toc-group");
    if (grp) grp.classList.add("has-current");
    // サイドレールが縦にスクロールするときは、強調した項目がレールの中で見えるように送る（ページ自体は動かさない）
    if (nav.scrollHeight > nav.clientHeight) {
      const li = current.a.closest("li") || current.a;
      const top = li.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      if (top < nav.scrollTop || top + li.offsetHeight > nav.scrollTop + nav.clientHeight) {
        nav.scrollTop = top - nav.clientHeight / 3;
      }
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  if (!setup()) {
    const mo = new MutationObserver(() => {
      if (setup()) {
        mo.disconnect();
        watch();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } else watch();

  function watch() {
    new MutationObserver(setup).observe(nav, { childList: true });
  }
})();
