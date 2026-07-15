/* =====================================================================
   PickMe 聚餐盲盒 — App logic
   - Master list: restaurants.json (committed, shared, survives deploys)
   - Temporary list: localStorage (per-device, merged into the picker)
   ===================================================================== */
(function () {
  "use strict";

  var MASTER_URL = "restaurants.json";
  var TEMP_KEY = "pickme.temp.v1";
  var HIDDEN_KEY = "pickme.hidden.v1";

  var CATEGORIES = [
    { id: "hotpot",  label: "火锅", bg: "var(--cat-hotpot-bg)",  fg: "var(--cat-hotpot-fg)" },
    { id: "jp",      label: "日料", bg: "var(--cat-jp-bg)",      fg: "var(--cat-jp-fg)" },
    { id: "bbq",     label: "烧烤", bg: "var(--cat-bbq-bg)",     fg: "var(--cat-bbq-fg)" },
    { id: "fishhot", label: "鱼火锅", bg: "var(--cat-fishhot-bg)", fg: "var(--cat-fishhot-fg)" },
    { id: "sichuan", label: "川菜", bg: "var(--cat-sichuan-bg)", fg: "var(--cat-sichuan-fg)" },
    { id: "west",    label: "西餐", bg: "var(--cat-west-bg)",    fg: "var(--cat-west-fg)" },
    { id: "tea",     label: "奶茶", bg: "var(--cat-tea-bg)",     fg: "var(--cat-tea-fg)" },
    { id: "other",   label: "其他", bg: "var(--cat-other-bg)",   fg: "var(--cat-other-fg)" }
  ];

  var PIN_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>';
  var EYE_OFF_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.2A9.7 9.7 0 0 1 12 4c7 0 10 8 10 8a17 17 0 0 1-3 3.8M6.2 6.2A17 17 0 0 0 2 12s3 8 10 8a9.6 9.6 0 0 0 4-.9"/><path d="M3 3l18 18"/><path d="M9.5 9.5a3 3 0 0 0 4.2 4.2"/></svg>';
  var EDIT_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>';
  var TRASH_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>';

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- state ---------- */
  var master = [];   // from restaurants.json (source: "seed")
  var temp = [];      // from localStorage (source: "temp")
  var hidden = [];    // hidden seed names (localStorage)
  var activeCat = "all";
  var searchTerm = "";

  /* ---------- dom ---------- */
  var el = {
    viewPick: document.getElementById("view-pick"),
    viewLibrary: document.getElementById("view-library"),
    blindbox: document.getElementById("blindbox"),
    pickMeta: document.getElementById("pickMeta"),
    catFilter: document.getElementById("catFilter"),
    openBtn: document.getElementById("openBtn"),
    result: document.getElementById("result"),
    resultTag: document.getElementById("resultTag"),
    resultCat: document.getElementById("resultCat"),
    resultName: document.getElementById("resultName"),
    resultNote: document.getElementById("resultNote"),
    resultLoc: document.getElementById("resultLoc"),
    rerollBtn: document.getElementById("rerollBtn"),
    confirmBtn: document.getElementById("confirmBtn"),
    restGrid: document.getElementById("restGrid"),
    libEmpty: document.getElementById("libEmpty"),
    statTotal: document.getElementById("statTotal"),
    statCats: document.getElementById("statCats"),
    searchInput: document.getElementById("searchInput"),
    addBtn: document.getElementById("addBtn"),
    emptyAddBtn: document.getElementById("emptyAddBtn"),
    modal: document.getElementById("modal"),
    modalTitle: document.getElementById("modalTitle"),
    modalClose: document.getElementById("modalClose"),
    restForm: document.getElementById("restForm"),
    fId: document.getElementById("restId"),
    fName: document.getElementById("f-name"),
    fCat: document.getElementById("f-cat"),
    fNote: document.getElementById("f-note"),
    fLoc: document.getElementById("f-loc"),
    errName: document.getElementById("err-name"),
    aboutBtn: document.getElementById("aboutBtn"),
    aboutModal: document.getElementById("aboutModal"),
    aboutClose: document.getElementById("aboutClose"),
    toast: document.getElementById("toast"),
    navBtns: Array.prototype.slice.call(document.querySelectorAll(".nav-btn"))
  };

  /* ---------- persistence ---------- */
  function loadTemp() {
    try { return JSON.parse(localStorage.getItem(TEMP_KEY)) || []; } catch (e) { return []; }
  }
  function saveTemp() { try { localStorage.setItem(TEMP_KEY, JSON.stringify(temp)); } catch (e) {} }
  function loadHidden() {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY)) || []; } catch (e) { return []; }
  }
  function saveHidden() { try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)); } catch (e) {} }

  function loadMaster() {
    return fetch(MASTER_URL, { cache: "no-cache" })
      .then(function (res) { if (!res.ok) throw new Error("http"); return res.json(); })
      .then(function (data) {
        var arr = Array.isArray(data) ? data : (data.restaurants || []);
        return arr.map(function (r, i) {
          return {
            id: "s-" + i,
            source: "seed",
            name: r.name || "",
            category: r.category || "other",
            note: r.note || "",
            location: r.location || ""
          };
        });
      })
      .catch(function () { return []; });
  }

  function catById(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i];
    return CATEGORIES[CATEGORIES.length - 1];
  }
  function withIdTemp(r) {
    return {
      id: "t-" + ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + Math.random().toString(16).slice(2)),
      source: "temp",
      name: r.name || "", category: r.category || "other",
      note: r.note || "", location: r.location || ""
    };
  }

  /* ---------- combined view ---------- */
  function combined() {
    var visible = master.filter(function (r) { return hidden.indexOf(r.name) === -1; });
    return visible.concat(temp);
  }
  function pool() {
    return combined().filter(function (r) {
      return activeCat === "all" || r.category === activeCat;
    });
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- render: pick meta + category filter ---------- */
  function renderPickMeta() {
    var total = combined().length;
    var n = pool().length;
    if (total === 0) {
      el.pickMeta.innerHTML = '餐厅库还是空的，先去 <b>添加</b> 几家吧';
      el.openBtn.disabled = true;
      return;
    }
    el.openBtn.disabled = false;
    if (activeCat === "all") {
      el.pickMeta.innerHTML = '已收录 <b>' + total + '</b> 家餐厅 · 随便抽一家';
    } else {
      el.pickMeta.innerHTML = catById(activeCat).label + ' 分类下 <b>' + n + '</b> 家 · 抽一家试试';
    }
  }

  function renderCatFilter() {
    var list = combined();
    var present = {};
    list.forEach(function (r) { present[r.category] = true; });
    var html = chipHtml("all", "全部", null, activeCat === "all");
    CATEGORIES.forEach(function (c) {
      if (present[c.id]) html += chipHtml(c.id, c.label, c.fg, activeCat === c.id);
    });
    el.catFilter.innerHTML = html;
    Array.prototype.forEach.call(el.catFilter.querySelectorAll(".chip"), function (chip) {
      chip.addEventListener("click", function () {
        activeCat = chip.getAttribute("data-cat");
        hideResult();
        renderCatFilter();
        renderPickMeta();
      });
    });
  }
  function chipHtml(id, label, dot, active) {
    var d = dot ? '<span class="chip-dot" style="background:' + dot + '"></span>' : "";
    return '<button class="chip' + (active ? " is-active" : "") + '" type="button" data-cat="' + id + '">' + d + esc(label) + "</button>";
  }

  /* ---------- render: library ---------- */
  function renderLibrary() {
    var list = combined();
    var term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(function (r) {
        return (r.name + " " + (r.note || "") + " " + (r.location || "")).toLowerCase().indexOf(term) !== -1;
      });
    }

    var catCount = {};
    combined().forEach(function (r) { catCount[r.category] = true; });
    el.statTotal.textContent = combined().length;
    el.statCats.textContent = Object.keys(catCount).length;

    if (combined().length === 0) {
      el.libEmpty.hidden = false;
      el.restGrid.innerHTML = "";
      return;
    }
    el.libEmpty.hidden = true;

    if (list.length === 0) {
      el.restGrid.innerHTML = '<p class="empty-state" style="padding:32px 0;color:var(--muted)">没有匹配的餐厅，换个关键词试试。</p>';
      return;
    }

    el.restGrid.innerHTML = list.map(function (r, i) {
      var c = catById(r.category);
      var srcHtml = r.source === "seed"
        ? '<span class="src src-seed">数据文件</span>'
        : '<span class="src src-temp">本机临时</span>';
      var note = r.note ? '<p class="rest-note">' + esc(r.note) + "</p>" : "";
      var loc = r.location ? '<p class="rest-loc">' + PIN_SVG + esc(r.location) + "</p>" : "";
      var ops = r.source === "seed"
        ? '<button class="op-btn danger" type="button" data-hide="' + esc(r.name) + '" aria-label="隐藏 ' + esc(r.name) + '">' + EYE_OFF_SVG + "</button>"
        : '<button class="op-btn" type="button" data-edit="' + r.id + '" aria-label="编辑 ' + esc(r.name) + '">' + EDIT_SVG + '</button>' +
          '<button class="op-btn danger" type="button" data-del="' + r.id + '" aria-label="删除 ' + esc(r.name) + '">' + TRASH_SVG + "</button>";
      return '' +
        '<div class="rest-card" style="animation-delay:' + (i * 40) + 'ms">' +
          '<div class="rest-main">' +
            '<div class="rest-name">' + esc(r.name) +
              '<span class="rest-cat" style="background:' + c.bg + ';color:' + c.fg + '">' + esc(c.label) + "</span>" +
              srcHtml +
            "</div>" +
            note + loc +
          "</div>" +
          '<div class="rest-ops">' + ops + "</div>" +
        "</div>";
    }).join("");

    Array.prototype.forEach.call(el.restGrid.querySelectorAll("[data-edit]"), function (b) {
      b.addEventListener("click", function () { openModal(b.getAttribute("data-edit")); });
    });
    Array.prototype.forEach.call(el.restGrid.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () { removeTemp(b.getAttribute("data-del")); });
    });
    Array.prototype.forEach.call(el.restGrid.querySelectorAll("[data-hide]"), function (b) {
      b.addEventListener("click", function () { hideSeed(b.getAttribute("data-hide")); });
    });
  }

  /* ---------- pick flow ---------- */
  function hideResult() {
    el.result.hidden = true;
    el.blindbox.classList.remove("is-open");
  }

  function pickRandom() {
    var list = combined();
    if (list.length === 0) {
      showToast("餐厅库还是空的，先去添加几家吧");
      switchView("library");
      return;
    }
    var p = pool();
    if (p.length === 0) {
      showToast(catById(activeCat).label + " 分类下还没有餐厅");
      return;
    }
    var pick = p[Math.floor(Math.random() * p.length)];
    el.openBtn.disabled = true;

    var reveal = function () { showResult(pick); el.openBtn.disabled = false; };

    if (reducedMotion) {
      el.blindbox.classList.add("is-open");
      reveal();
      return;
    }
    el.blindbox.classList.remove("is-open");
    el.blindbox.classList.add("is-opening");
    setTimeout(function () {
      el.blindbox.classList.remove("is-opening");
      el.blindbox.classList.add("is-open");
      reveal();
    }, 620);
  }

  function showResult(r) {
    var c = catById(r.category);
    el.resultCat.textContent = c.label;
    el.resultCat.style.background = c.bg;
    el.resultCat.style.color = c.fg;
    el.resultName.textContent = r.name;
    el.resultNote.textContent = r.note || "";
    el.resultNote.style.display = r.note ? "" : "none";
    if (r.location) {
      el.resultLoc.innerHTML = PIN_SVG + esc(r.location);
      el.resultLoc.style.display = "";
    } else {
      el.resultLoc.style.display = "none";
    }
    el.result.hidden = false;
    el.result.style.animation = "none";
    void el.result.offsetWidth;
    el.result.style.animation = "";
  }

  /* ---------- modal (add / edit temp) ---------- */
  function fillCatSelect() {
    el.fCat.innerHTML = CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) + "</option>";
    }).join("");
  }

  var lastFocused = null;
  function openModal(id) {
    lastFocused = document.activeElement;
    hideResult();
    fillCatSelect();
    if (id) {
      var r = temp.filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      el.modalTitle.textContent = "编辑餐厅（本机）";
      el.fId.value = r.id;
      el.fName.value = r.name;
      el.fCat.value = r.category;
      el.fNote.value = r.note || "";
      el.fLoc.value = r.location || "";
    } else {
      el.modalTitle.textContent = "添加餐厅（本机临时）";
      el.fId.value = "";
      el.restForm.reset();
    }
    el.errName.hidden = true;
    el.fName.closest(".field").classList.remove("has-error");
    el.modal.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { el.fName.focus(); }, 60);
  }
  function closeModal() {
    el.modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function submitForm(e) {
    e.preventDefault();
    var name = el.fName.value.trim();
    if (!name) {
      el.errName.hidden = false;
      el.fName.closest(".field").classList.add("has-error");
      el.fName.focus();
      return;
    }
    var data = {
      name: name,
      category: el.fCat.value || "other",
      note: el.fNote.value.trim(),
      location: el.fLoc.value.trim()
    };
    var id = el.fId.value;
    if (id) {
      temp = temp.map(function (r) { return r.id === id ? Object.assign({}, r, data) : r; });
      showToast("已更新「" + name + "」（本机）");
    } else {
      temp.push(withIdTemp(data));
      showToast("已临时添加「" + name + "」，盲盒现在能抽到它");
    }
    saveTemp();
    closeModal();
    renderAll();
  }

  /* ---------- temp delete (with undo) ---------- */
  function removeTemp(id) {
    var idx = -1;
    for (var i = 0; i < temp.length; i++) if (temp[i].id === id) { idx = i; break; }
    if (idx === -1) return;
    var removed = temp[idx];
    temp.splice(idx, 1);
    saveTemp();
    renderAll();
    showToast("已删除「" + removed.name + "」", {
      label: "撤销",
      fn: function () {
        temp.push(removed);
        saveTemp();
        renderAll();
        showToast("已恢复");
      }
    });
  }

  /* ---------- seed hide (with undo) ---------- */
  function hideSeed(name) {
    if (hidden.indexOf(name) !== -1) return;
    hidden.push(name);
    saveHidden();
    renderAll();
    showToast("已隐藏「" + name + "」（仅本机，文件里仍保留）", {
      label: "撤销",
      fn: function () {
        var i = hidden.indexOf(name);
        if (i !== -1) hidden.splice(i, 1);
        saveHidden();
        renderAll();
        showToast("已恢复显示");
      }
    });
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function showToast(msg, action) {
    var t = el.toast;
    t.hidden = false;
    t.innerHTML = "";
    var span = document.createElement("span");
    span.textContent = msg;
    t.appendChild(span);
    if (action) {
      var b = document.createElement("button");
      b.className = "toast-action";
      b.type = "button";
      b.textContent = action.label;
      b.addEventListener("click", function () {
        clearTimeout(toastTimer);
        action.fn();
        hideToast();
      });
      t.appendChild(b);
    }
    requestAnimationFrame(function () { t.classList.add("is-show"); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 5000 : 2600);
  }
  function hideToast() {
    el.toast.classList.remove("is-show");
    setTimeout(function () { el.toast.hidden = true; }, 260);
  }

  /* ---------- view switching ---------- */
  function switchView(name) {
    var isPick = name === "pick";
    el.viewPick.hidden = !isPick;
    el.viewLibrary.hidden = isPick;
    el.navBtns.forEach(function (b) {
      var active = b.getAttribute("data-view") === name;
      b.classList.toggle("is-active", active);
      if (active) { b.setAttribute("aria-current", "page"); } else { b.removeAttribute("aria-current"); }
    });
    if (!isPick) hideResult();
  }

  function renderAll() {
    renderCatFilter();
    renderPickMeta();
    renderLibrary();
  }

  /* ---------- events ---------- */
  el.openBtn.addEventListener("click", pickRandom);
  el.rerollBtn.addEventListener("click", pickRandom);
  el.confirmBtn.addEventListener("click", function () { showToast("就这家！祝大家聚餐愉快～"); });

  el.addBtn.addEventListener("click", function () { openModal(null); });
  el.emptyAddBtn.addEventListener("click", function () { openModal(null); });
  el.restForm.addEventListener("submit", submitForm);
  el.fName.addEventListener("input", function () {
    if (el.fName.value.trim()) {
      el.errName.hidden = true;
      el.fName.closest(".field").classList.remove("has-error");
    }
  });

  el.searchInput.addEventListener("input", function () {
    searchTerm = el.searchInput.value;
    renderLibrary();
  });

  el.modalClose.addEventListener("click", closeModal);
  Array.prototype.forEach.call(el.modal.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", closeModal);
  });

  el.aboutBtn.addEventListener("click", function () {
    el.aboutModal.hidden = false;
    document.body.style.overflow = "hidden";
  });
  el.aboutClose.addEventListener("click", function () {
    el.aboutModal.hidden = true;
    document.body.style.overflow = "";
  });
  Array.prototype.forEach.call(el.aboutModal.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", function () {
      el.aboutModal.hidden = true;
      document.body.style.overflow = "";
    });
  });

  el.navBtns.forEach(function (b) {
    b.addEventListener("click", function () { switchView(b.getAttribute("data-view")); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!el.modal.hidden) closeModal();
      if (!el.aboutModal.hidden) { el.aboutModal.hidden = true; document.body.style.overflow = ""; }
    }
  });

  /* ---------- init ---------- */
  temp = loadTemp();
  hidden = loadHidden();
  loadMaster().then(function (data) {
    master = data;
    renderAll();
  });
})();
