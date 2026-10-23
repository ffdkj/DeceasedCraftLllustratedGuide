/* 社区图片上传：聊天附图 + 照片墙 */
(function () {
  function q(sel, root) { return (root || document).querySelector(sel); }
  async function upload(file) {
    var fd = new FormData();
    fd.append("file", file);
    var r = await fetch("/api/upload", { method: "POST", body: fd });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || "上传失败");
    return d.url;
  }
  function reload() {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  function enhance() {
    var root = q("#community-root");
    if (!root || !q(".community-chat", root) || q(".community-photo-form", root)) return;

    // 聊天附图
    var form = q("#community-form", root);
    if (form && !q(".chat-upload", form)) {
      var label = document.createElement("label");
      label.className = "chat-upload";
      label.innerHTML = '<input type="file" accept="image/jpeg,image/png,image/webp" hidden><span>图片</span>';
      var input = q("input[type=file]", label);
      var selected = null;
      input.addEventListener("change", function () {
        selected = input.files && input.files[0] || null;
        label.classList.toggle("has-file", !!selected);
        q("#community-input", form).placeholder = selected ? "图片已选择，可加说明…" : "说点什么…";
      });
      form.insertBefore(label, q("button[type=submit]", form));
      form.addEventListener("submit", async function (e) {
        if (!selected) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var text = (q("#community-input", form).value || "").trim();
        try {
          var url = await upload(selected);
          var r = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: text, image: url }) });
          var d = await r.json().catch(function () { return {}; });
          if (!r.ok) throw new Error(d.error || "发送失败");
          reload();
        } catch (err) { alert(err.message || "发送失败"); }
      }, true);
    }

    // 照片墙上传
    var section = document.createElement("div");
    section.className = "section";
    section.innerHTML = '<div class="section-head"><div class="section-title">上传照片</div><div class="section-note">Exposure / 游戏截图</div></div>' +
      '<form class="community-photo-form"><input class="photo-caption" maxlength="120" placeholder="图片说明（可选）"><label class="photo-file">选择图片<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label><button class="btn primary" type="submit">上传到照片墙</button></form>';
    root.appendChild(section);
    var pform = q(".community-photo-form", section);
    var pfile = q("input[type=file]", pform);
    pform.addEventListener("submit", async function (e) {
      e.preventDefault();
      var file = pfile.files && pfile.files[0];
      if (!file) return alert("请选择图片");
      try {
        var url = await upload(file);
        var r = await fetch("/api/photos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: url, caption: q(".photo-caption", pform).value || "" }) });
        var d = await r.json().catch(function () { return {}; });
        if (!r.ok) throw new Error(d.error || "上传失败");
        reload();
      } catch (err) { alert(err.message || "上传失败"); }
    });
  }
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", enhance);
})();
