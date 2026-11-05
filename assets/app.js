(function () {
  "use strict";

  var REPO = "joongki-J/mathai";
  var FILE_DIR = "files";

  /* ---------- copy helpers ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1600);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject();
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
  var CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  /* ---------- prompt blocks ---------- */
  document.querySelectorAll(".prompt, .code").forEach(function (box) {
    var pre = box.querySelector("pre");
    if (!pre) return;
    var raw = pre.textContent.replace(/^\n+/, "").replace(/\s+$/, "");
    var isPrompt = box.classList.contains("prompt");

    if (isPrompt) {
      pre.innerHTML = escapeHtml(raw).replace(/\[[^\]\n]+\]/g, function (m) {
        return '<mark class="ph">' + m + "</mark>";
      });
    }

    var head = document.createElement("div");
    head.className = "prompt-head";
    var title = document.createElement("span");
    title.className = "prompt-title";
    title.textContent = box.getAttribute("data-title") || (isPrompt ? "프롬프트" : "코드");
    head.appendChild(title);

    if (isPrompt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.innerHTML = COPY_ICON + "<span>복사</span>";
      btn.setAttribute("aria-label", title.textContent + " 복사");
      btn.addEventListener("click", function () {
        copyText(raw).then(function () {
          btn.classList.add("done");
          btn.innerHTML = CHECK_ICON + "<span>복사됨</span>";
          toast(/\[[^\]]+\]/.test(raw) ? "복사했습니다 · [대괄호] 부분을 바꿔서 보내세요" : "복사했습니다 · Claude 입력창에 붙여넣으세요");
          setTimeout(function () {
            btn.classList.remove("done");
            btn.innerHTML = COPY_ICON + "<span>복사</span>";
          }, 1800);
        }, function () {
          toast("복사하지 못했습니다. 글자를 길게 눌러 직접 복사하세요");
        });
      });
      head.appendChild(btn);
    }
    box.insertBefore(head, pre);
  });

  document.querySelectorAll(".chip[data-copy]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      copyText(chip.getAttribute("data-copy")).then(function () {
        chip.classList.add("done");
        toast("복사했습니다");
        setTimeout(function () { chip.classList.remove("done"); }, 1400);
      });
    });
  });

  /* ---------- prompts-only mode ---------- */
  function markNonPrompt(el) {
    Array.prototype.forEach.call(el.children, function (child) {
      if (child.classList.contains("prompt") || child.classList.contains("chips")) return;
      if (child.classList.contains("label") || child.tagName === "H3") return;
      if (child.querySelector(".prompt")) { markNonPrompt(child); return; }
      child.classList.add("np");
    });
  }
  document.querySelectorAll(".block").forEach(function (b) {
    if (b.querySelector(".prompt, .chips")) {
      b.classList.add("has-prompt");
      markNonPrompt(b);
    }
  });

  var toggle = document.getElementById("onlyPrompts");
  function applyOnly(on) {
    document.body.classList.toggle("only", on);
    try { localStorage.setItem("onlyPrompts", on ? "1" : "0"); } catch (e) {}
  }
  try { if (localStorage.getItem("onlyPrompts") === "1") { toggle.checked = true; applyOnly(true); } } catch (e) {}
  toggle.addEventListener("change", function () { applyOnly(toggle.checked); });

  /* ---------- active nav ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".topnav a"));
  var targets = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); });
  function onScroll() {
    var y = window.scrollY + 120;
    var idx = -1;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= y) idx = i; });
    navLinks.forEach(function (a, i) { a.classList.toggle("active", i === idx); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 자료실 ---------- */
  var listEl = document.getElementById("fileList");
  var searchEl = document.getElementById("fileSearch");
  var allFiles = [];

  function fmtSize(n) {
    if (n == null) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }
  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d)) return "";
    return d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() + ".";
  }
  function displayName(name) {
    var base = name.replace(/^\d+[_\-\s.]+/, "");
    var dot = base.lastIndexOf(".");
    var stem = dot > 0 ? base.slice(0, dot) : base;
    return stem.replace(/_/g, " ");
  }
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name);
    return m ? m[1].toLowerCase() : "file";
  }

  function render() {
    var q = (searchEl.value || "").trim().toLowerCase();
    var items = allFiles.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) !== -1; });
    if (!allFiles.length) {
      listEl.innerHTML = '<li class="file-empty">아직 올린 자료가 없습니다.</li>';
      return;
    }
    if (!items.length) {
      listEl.innerHTML = '<li class="file-empty">찾는 파일이 없습니다.</li>';
      return;
    }
    listEl.innerHTML = "";
    items.forEach(function (f) {
      var e = ext(f.name);
      var li = document.createElement("li");
      li.className = "file";
      var href = FILE_DIR + "/" + encodeURIComponent(f.name);
      var meta = [e.toUpperCase(), fmtSize(f.size), fmtDate(f.updated)].filter(Boolean).join(" · ");
      li.innerHTML =
        '<span class="file-ico ' + e + '">' + escapeHtml(e.slice(0, 4).toUpperCase()) + "</span>" +
        '<div class="file-main"><div class="file-name"></div><div class="file-meta"></div></div>' +
        '<a class="file-dl" download>내려받기</a>';
      li.querySelector(".file-name").textContent = displayName(f.name);
      li.querySelector(".file-meta").textContent = meta;
      var a = li.querySelector(".file-dl");
      a.href = href;
      a.setAttribute("download", f.name);
      a.setAttribute("aria-label", displayName(f.name) + " 내려받기");
      listEl.appendChild(li);
    });
  }

  function sortFiles(arr) {
    return arr
      .filter(function (f) { return f.name && f.name.charAt(0) !== "." && f.name !== "index.json" && f.name !== "README.md"; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, "ko", { numeric: true }); });
  }

  function loadFromApi() {
    return fetch("https://api.github.com/repos/" + REPO + "/contents/" + FILE_DIR + "?ref=main")
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (arr) {
        return arr.filter(function (x) { return x.type === "file"; })
          .map(function (x) { return { name: x.name, size: x.size }; });
      });
  }

  fetch(FILE_DIR + "/index.json?t=" + Date.now(), { cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) { return data.files || data; })
    .catch(loadFromApi)
    .then(function (files) { allFiles = sortFiles(files || []); render(); })
    .catch(function () {
      listEl.innerHTML = '<li class="file-empty">자료 목록을 불러오지 못했습니다. <a href="https://github.com/' + REPO + '/tree/main/' + FILE_DIR + '" target="_blank" rel="noopener">GitHub에서 바로 보기</a></li>';
    });

  searchEl.addEventListener("input", render);
})();
