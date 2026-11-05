// 一覧ページの並べ方切替で共用する表と処理（人物一覧 list.js・城一覧 castles.js）
window.ListOrder = (function () {
  // 50音の行見出し。かなの先頭1文字から行を判定する（濁音・半濁音・小書きも同じ行）
  const ROWS = [
    ["あ行", "ぁあぃいぅうゔぇえぉお"],
    ["か行", "かがきぎくぐけげこご"],
    ["さ行", "さざしじすずせぜそぞ"],
    ["た行", "ただちぢっつづてでとど"],
    ["な行", "なにぬねの"],
    ["は行", "はばぱひびぴふぶぷへべぺほぼぽ"],
    ["ま行", "まみむめも"],
    ["や行", "ゃやゅゆょよ"],
    ["ら行", "らりるれろ"],
    ["わ行", "ゎわゐゑをん"],
  ];
  function kanaRow(kana) {
    const c = (kana || "").trim().charAt(0);
    const row = ROWS.find(([, chars]) => chars.includes(c));
    return row ? row[0] : "その他";
  }

  // 令制国を北から並べたもの（国界データの重心の緯度順）と、その国が属する地方
  const PROVINCES = [
    ["出羽国","東北"],["陸奥国","東北"],["佐渡国","中部"],["越後国","中部"],["能登国","中部"],
    ["下野国","関東"],["越中国","中部"],["上野国","関東"],["加賀国","中部"],["常陸国","関東"],
    ["隠岐国","中国"],["信濃国","中部"],["飛騨国","中部"],["越前国","中部"],["下総国","関東"],
    ["武蔵国","関東"],["甲斐国","中部"],["丹後国","近畿"],["美濃国","中部"],["若狭国","中部"],
    ["但馬国","近畿"],["上総国","関東"],["因幡国","中国"],["出雲国","中国"],["相模国","関東"],
    ["伯耆国","中国"],["近江国","近畿"],["駿河国","中部"],["丹波国","近畿"],["美作国","中国"],
    ["尾張国","中部"],["安房国","関東"],["山城国","近畿"],["遠江国","中部"],["三河国","中部"],
    ["播磨国","近畿"],["摂津国","近畿"],["石見国","中国"],["伊賀国","近畿"],["備前国","中国"],
    ["備中国","中国"],["河内国","近畿"],["伊勢国","近畿"],["備後国","中国"],["対馬国","九州"],
    ["志摩国","近畿"],["和泉国","近畿"],["讃岐国","四国"],["淡路国","近畿"],["長門国","中国"],
    ["大和国","近畿"],["伊豆国","中部"],["安芸国","中国"],["周防国","中国"],["阿波国","四国"],
    ["紀伊国","近畿"],["壱岐国","九州"],["筑前国","九州"],["豊前国","九州"],["伊予国","四国"],
    ["土佐国","四国"],["筑後国","九州"],["豊後国","九州"],["肥前国","九州"],["肥後国","九州"],
    ["日向国","九州"],["薩摩国","九州"],["大隅国","九州"],
  ];
  const REGIONS = ["東北", "関東", "中部", "近畿", "中国", "四国", "九州"];
  const provinceIndex = new Map(PROVINCES.map(([n], i) => [n, i]));
  const regionMap = new Map(PROVINCES);
  const isProvince = (name) => provinceIndex.has(name);
  const provinceRank = (name) => (provinceIndex.has(name) ? provinceIndex.get(name) : Infinity);
  const regionOf = (name) => regionMap.get(name);
  const regionRank = (name) => (regionMap.has(name) ? REGIONS.indexOf(regionMap.get(name)) : Infinity);

  // 並べ方の切替（<fieldset id="order"> のラジオボタン）。選んだ並べ方は URL（?order=）に残す
  function setupSwitch(orderEl, orders, onChange) {
    if (!orderEl) return () => orders[0];
    // 並べ方はプルダウン（<select id="order">）。ラジオボタンの組（<fieldset>）でも動く
    const isSelect = orderEl.tagName === "SELECT";
    const current = () => {
      if (isSelect) return orders.includes(orderEl.value) ? orderEl.value : orders[0];
      const v = orderEl.querySelector("input:checked");
      return v ? v.value : orders[0];
    };
    const initial = new URLSearchParams(location.search).get("order");
    if (orders.includes(initial)) {
      if (isSelect) orderEl.value = initial;
      else orderEl.querySelector(`input[value="${initial}"]`).checked = true;
    }
    // 並べ方の行の左端（#order-current）に、選んでいる並べ方の名前を出す
    const nameEl = document.getElementById("order-current");
    const showName = () => {
      if (!nameEl || !isSelect) return;
      const opt = orderEl.options[orderEl.selectedIndex];
      nameEl.textContent = opt ? opt.textContent : "";
    };
    showName();
    orderEl.addEventListener("change", () => {
      const url = new URL(location.href);
      if (current() === orders[0]) url.searchParams.delete("order");
      else url.searchParams.set("order", current());
      history.replaceState(null, "", url);
      showName();
      onChange(current());
    });
    return current;
  }

  // 比較関数を順に試す（先に差がついたものを採る）
  const by = (...cmps) => (a, b) => {
    for (const f of cmps) {
      const d = f(a, b);
      if (d) return d;
    }
    return 0;
  };
  // 数値の差。両方 Infinity（不明）のときは NaN にならないよう 0 を返す
  const diff = (x, y) => (x === y ? 0 : x - y);

  return { kanaRow, REGIONS, isProvince, provinceRank, regionOf, regionRank, setupSwitch, by, diff };
})();
