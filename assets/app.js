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

/* =========================================================
   페이지 넘기기: 한 장씩 보여 주고 버튼·키보드·스와이프로 이동
   ========================================================= */
(function () {
  "use strict";
  var main = document.querySelector("main");
  var all = Array.prototype.slice.call(main.children).filter(function (el) { return el.tagName === "SECTION"; });
  var pages = [];
  var cur = 0;
  var offset = 0; /* 자료실은 번호 없이, 표지부터 1번 */
  function numOf(i) {
    if (i < offset) { var c = pages[i].classList; return c.contains("account") ? "계정" : c.contains("links") ? "사이트" : "자료"; }
    return String(i - offset + 1);
  }

  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var pgNow = document.getElementById("pgNow");
  var pgTotal = document.getElementById("pgTotal");
  var bar = document.getElementById("progressBar");
  var tocBtn = document.getElementById("tocBtn");
  var toc = document.getElementById("toc");
  var tocList = document.getElementById("tocList");

  function titleOf(sec) {
    if (sec.id === "cover") return "표지";
    if (sec.id === "thanks") return "감사합니다";
    var h = sec.querySelector("h2, h3");
    var t = h ? h.innerHTML.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() : "";
    if (sec.classList.contains("part-head")) {
      var n = sec.querySelector(".num");
      return (n ? n.textContent.trim() + " · " : "") + t;
    }
    return t;
  }

  function buildPages() {
    var only = document.body.classList.contains("only");
    pages = all.filter(function (s) {
      if (!only) return true;
      return s.classList.contains("has-prompt");
    });
    offset = pages.filter(function (s) { return s.classList.contains("files") || s.classList.contains("links") || s.classList.contains("account"); }).length;
    pgTotal.textContent = pages.length - offset;
    tocList.innerHTML = "";
    pages.forEach(function (s, i) {
      var li = document.createElement("li");
      if (s.classList.contains("part-head")) li.className = "part";
      var b = document.createElement("button");
      b.type = "button";
      b.innerHTML = '<span class="n">' + numOf(i) + "</span><span></span>";
      b.lastChild.textContent = titleOf(s);
      b.addEventListener("click", function () { closeToc(); go(i); });
      li.appendChild(b);
      tocList.appendChild(li);
    });
  }

  function go(i, dir, keepScroll) {
    if (!pages.length) return;
    i = Math.max(0, Math.min(pages.length - 1, i));
    if (dir === undefined) dir = i >= cur ? 1 : -1;
    all.forEach(function (s) { s.classList.remove("cur", "in-next", "in-prev"); });
    var s = pages[i];
    s.classList.add("cur");
    void s.offsetWidth;
    s.classList.add(dir < 0 ? "in-prev" : "in-next");
    cur = i;
    pgNow.textContent = numOf(i);
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === pages.length - 1;
    bar.style.width = ((i + 1) / pages.length * 100) + "%";
    Array.prototype.forEach.call(tocList.children, function (li, k) { li.classList.toggle("cur", k === i); });
    if (s.id && location.hash !== "#" + s.id) {
      try { history.replaceState(null, "", "#" + s.id); } catch (e) {}
    }
    if (!keepScroll) window.scrollTo({ top: 0, behavior: "auto" });
    markNav(s);
  }

  /* 상단 메뉴의 현재 부 표시 */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".topnav a"));
  function markNav(sec) {
    var idx = all.indexOf(sec), hit = -1;
    navLinks.forEach(function (a, k) {
      var t = document.querySelector(a.getAttribute("href"));
      if (t && all.indexOf(t) <= idx) hit = k;
    });
    navLinks.forEach(function (a, k) { a.classList.toggle("active", k === hit); });
  }

  /* id가 들어 있는 페이지 찾기 */
  function pageIndexForId(id) {
    var el = id && document.getElementById(id);
    if (!el) return -1;
    var sec = el.closest("main > section");
    var i = pages.indexOf(sec);
    if (i === -1 && document.body.classList.contains("only")) {
      document.getElementById("onlyPrompts").checked = false;
      document.getElementById("onlyPrompts").dispatchEvent(new Event("change"));
      i = pages.indexOf(sec);
    }
    return i;
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute("href").slice(1);
    var i = pageIndexForId(id);
    if (i === -1) return;
    e.preventDefault();
    go(i);
  });

  prevBtn.addEventListener("click", function () { go(cur - 1, -1); });
  nextBtn.addEventListener("click", function () { go(cur + 1, 1); });

  /* 키보드 */
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!toc.hidden) { if (e.key === "Escape") closeToc(); return; }
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(cur + 1, 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(cur - 1, -1); }
    else if (e.key === "Home") { go(0, -1); }
    else if (e.key === "End") { go(pages.length - 1, 1); }
  });

  /* 스와이프 (표·코드처럼 옆으로 스크롤되는 곳은 제외) */
  var sx = 0, sy = 0, st = 0, tracking = false;
  main.addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1 || e.target.closest(".table-wrap, pre, input, .url-diagram")) { tracking = false; return; }
    tracking = true;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
  }, { passive: true });
  main.addEventListener("touchend", function (e) {
    if (!tracking) return;
    tracking = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - st < 800) {
      if (dx < 0) go(cur + 1, 1); else go(cur - 1, -1);
    }
  }, { passive: true });

  /* 목차 */
  function openToc() {
    toc.hidden = false;
    tocBtn.setAttribute("aria-expanded", "true");
    var li = tocList.children[cur];
    if (li) { li.scrollIntoView({ block: "center" }); li.querySelector("button").focus(); }
  }
  function closeToc() {
    toc.hidden = true;
    tocBtn.setAttribute("aria-expanded", "false");
    tocBtn.focus();
  }
  tocBtn.addEventListener("click", openToc);
  document.getElementById("tocClose").addEventListener("click", closeToc);
  toc.addEventListener("click", function (e) { if (e.target === toc) closeToc(); });

  /* 프롬프트만 스위치를 바꾸면 페이지 목록을 다시 만듦 */
  document.getElementById("onlyPrompts").addEventListener("change", function () {
    var sec = pages[cur];
    buildPages();
    var i = pages.indexOf(sec);
    if (i === -1) {
      var idx = all.indexOf(sec);
      i = pages.length - 1;
      for (var k = pages.length - 1; k >= 0; k--) { if (all.indexOf(pages[k]) >= idx) i = k; }
    }
    go(i, 1);
  });

  window.addEventListener("hashchange", function () {
    var i = pageIndexForId(location.hash.slice(1));
    if (i !== -1 && i !== cur) go(i);
  });

  document.body.classList.add("paged");
  buildPages();
  var start = pageIndexForId(location.hash.slice(1));
  go(start === -1 ? 0 : start, 1, false);
})();

/* =========================================================
   내 계정 확인: 이름+학교로 암호화된 계정 정보를 풀어 보여 줌
   ========================================================= */
(function () {
  "use strict";
  var form = document.getElementById("acctForm");
  if (!form) return;
  var nameEl = document.getElementById("acctName");
  var schoolEl = document.getElementById("acctSchool");
  var btn = document.getElementById("acctBtn");
  var out = document.getElementById("acctResult");
  var dataP = null;

  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function normName(s) { return s.normalize("NFC").replace(/\s+/g, ""); }
  function normSchool(s) {
    s = s.normalize("NFC").replace(/\s+/g, "");
    [["고등학교", "고"], ["중학교", "중"], ["여자", "여"], ["상업", "상"]].forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    return s;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function show(html, err) {
    out.hidden = false;
    out.className = "acct-result" + (err ? " err" : "");
    out.innerHTML = html;
  }

  function copyBtn(b, text) {
    b.addEventListener("click", function () {
      var done = function () { b.classList.add("done"); b.textContent = "복사됨"; setTimeout(function () { b.classList.remove("done"); b.textContent = "복사"; }, 1500); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () {});
      else { var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); done(); } catch (e) {} document.body.removeChild(t); }
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = normName(nameEl.value), school = normSchool(schoolEl.value);
    if (!name || !school) return;
    if (!window.crypto || !crypto.subtle) { show("이 브라우저에서는 확인할 수 없습니다. 크롬이나 엣지로 열어 주세요.", true); return; }
    btn.disabled = true; btn.textContent = "확인 중…";
    dataP = dataP || fetch("assets/accounts.json?v=1", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); });
    dataP.then(function (data) {
      var enc = new TextEncoder();
      return crypto.subtle.importKey("raw", enc.encode(name + "|" + school), "PBKDF2", false, ["deriveBits"])
        .then(function (base) {
          return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64(data.salt), iterations: data.iter }, base, 384);
        })
        .then(function (bits) {
          var all = new Uint8Array(bits);
          var tag = btoa(String.fromCharCode.apply(null, all.slice(32)));
          var hit = data.entries.filter(function (x) { return x.t === tag; })[0];
          if (!hit) return null;
          return crypto.subtle.importKey("raw", all.slice(0, 32), "AES-GCM", false, ["decrypt"])
            .then(function (k) { return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(hit.iv) }, k, b64(hit.c)); })
            .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
        });
    }).then(function (acc) {
      if (!acc) { show("일치하는 계정이 없습니다. 이름과 학교 이름을 다시 확인해 주세요. 계속 안 되면 강사에게 알려 주세요.", true); return; }
      show('<div class="acct-row"><span class="k">아이디</span><span class="v">' + esc(acc.id) + '</span><button type="button">복사</button></div>' +
           '<div class="acct-row"><span class="k">비밀번호</span><span class="v">' + esc(acc.pw) + '</span><button type="button">복사</button></div>' +
           '<a class="acct-go" href="https://claude.ai/login" target="_blank" rel="noopener">claude.ai 로그인하러 가기 →</a>');
      var bs = out.querySelectorAll(".acct-row button");
      copyBtn(bs[0], acc.id); copyBtn(bs[1], acc.pw);
    }).catch(function () {
      show("계정 정보를 불러오지 못했습니다. 잠시 뒤 다시 눌러 주세요.", true);
    }).then(function () { btn.disabled = false; btn.textContent = "계정 확인"; });
  });
})();
