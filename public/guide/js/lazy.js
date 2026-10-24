/* 长列表的滚动加载：先渲染一块，滚到哨兵再追加下一块。
   guide 里枪械 177 条、套装/近战/载具都在百条量级，整表塞进 DOM 会让首屏变慢。
   行直接插进容器（不加包裹层），因为 .list / .gs-gun-grid 是 flex/grid，隔一层会丢掉 gap 与列数。
   IntersectionObserver 不可用时退回一次全渲染。 */
(function () {
  "use strict";
  var CHUNK = 40;

  function list(container, items, htmlOf, chunk) {
    if (!container) return;
    var limit = chunk && chunk > 0 ? chunk : CHUNK;
    var supportsLazy = typeof IntersectionObserver === "function";
    container.innerHTML = "";
    if (!supportsLazy || items.length <= limit) {
      container.innerHTML = items.map(htmlOf).join("");
      return;
    }

    var shown = 0;
    var sentinel = document.createElement("div");
    sentinel.className = "lazy-sentinel";
    sentinel.setAttribute("aria-hidden", "true");

    var observer = null;
    var done = false;

    function more() {
      var slice = items.slice(shown, shown + limit);
      if (!slice.length) {
        if (observer) observer.disconnect();
        return;
      }
      shown += slice.length;
      var frag = document.createElement("div");
      frag.innerHTML = slice.map(htmlOf).join("");
      while (frag.firstChild) container.insertBefore(frag.firstChild, sentinel);
      if (shown >= items.length && !done) {
        done = true;
        if (observer) observer.disconnect();
        if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);
      }
    }

    observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i += 1) {
        if (entries[i].isIntersecting) {
          more();
          return;
        }
      }
    }, { rootMargin: "600px 0px" });

    container.appendChild(sentinel);
    observer.observe(sentinel);
    more();
  }

  window.WZ_LAZY = { list: list, CHUNK: CHUNK };
})();
