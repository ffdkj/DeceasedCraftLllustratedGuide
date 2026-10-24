/* 自定义数据合入入口：新版基础数据之后、渲染入口之前执行。 */
(function () {
  const g = window.WZ_GUIDES || {};
  function apply(list, map) {
    if (!Array.isArray(list) || !map) return list;
    return list.map(function (x) { return (x && map[x.id]) ? Object.assign({}, x, map[x.id]) : x; });
  }
  g.monsters = apply(g.monsters, window.WZ_CUSTOM_MONSTERS);
  g.armor = apply(g.armor, window.WZ_CUSTOM_ARMOR);
  g.melee = apply(g.melee, window.WZ_CUSTOM_MELEE);
  window.WZ_GUIDES = g;
})();
