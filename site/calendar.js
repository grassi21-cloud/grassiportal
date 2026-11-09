// Calendário da família — visão "Casa" (nativa, lê /data/calendar.json) e visão "Google" (iframe, opcional).
// JavaScript puro, sem dependências e sem requisições externas na visão Casa.
//
// Datas: "dia" é um número inteiro (dias desde 1970-01-01 no calendário civil, sem fuso).
// Strings "YYYY-MM-DD" são lidas manualmente (new Date("YYYY-MM-DD") seria UTC e desloca o dia em -03:00).
// Instantes com offset (ISO 8601) são lidos com new Date() e convertidos para America/Sao_Paulo via Intl.
(function () {
  "use strict";

  var TZ = "America/Sao_Paulo";
  var DAY = 864e5;
  var RANGE_STEP = 14;
  var STALE_MS = 24 * 3600 * 1000;
  var REFRESH_MS = 5 * 60 * 1000;
  var VIEW_KEY = "portal.calendar.view";
  var WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

  // ---------- utilidades de data ----------
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayNum(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }
  function parts(n) {
    var dt = new Date(n * DAY);
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
  }
  function parseDateOnly(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
    return m ? dayNum(+m[1], +m[2], +m[3]) : NaN;
  }
  function firstOfMonth(n) { var p = parts(n); return dayNum(p.y, p.m, 1); }
  function addMonths(n, k) {
    var p = parts(n), t = p.y * 12 + (p.m - 1) + k;
    return dayNum(Math.floor(t / 12), (t % 12) + 1, 1);
  }
  function daysInMonth(n) { var p = parts(n); return new Date(Date.UTC(p.y, p.m, 0)).getUTCDate(); }

  var fmtInstant = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  // Instante -> { ms, day, hm } no fuso de São Paulo.
  function instant(iso) {
    var dt = new Date(String(iso || "").replace(" ", "T"));
    if (isNaN(dt.getTime())) return null;
    var o = {};
    fmtInstant.formatToParts(dt).forEach(function (p) { o[p.type] = p.value; });
    return { ms: dt.getTime(), day: dayNum(+o.year, +o.month, +o.day), hm: o.hour + ":" + o.minute };
  }
  function todayNum() {
    var i = instant(new Date().toISOString());
    return i.day;
  }

  // Formata um "dia" com Intl em America/Sao_Paulo (usa 12:00 UTC = 09:00 em São Paulo, mesmo dia).
  function fmtDay(opts) {
    var f = new Intl.DateTimeFormat("pt-BR", Object.assign({ timeZone: TZ }, opts));
    return function (n) { return f.format(new Date(n * DAY + 12 * 3600 * 1000)); };
  }
  var fLong = fmtDay({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var fWeekdayLong = fmtDay({ weekday: "long", day: "numeric", month: "long" });
  var fShort = fmtDay({ weekday: "short", day: "numeric", month: "short" });
  var fMonth = fmtDay({ month: "long", year: "numeric" });
  var fDM = fmtDay({ day: "2-digit", month: "2-digit" });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // ---------- DOM ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function btn(cls, text, label) {
    var b = el("button", cls, text);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    return b;
  }
  function setColor(node, color) {
    node.style.setProperty("--c", color.c);
    node.style.setProperty("--cd", color.cd);
  }
  function storageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* modo privado do Safari */ } }

  // ---------- montagem ----------
  function mount(root, cfg) {
    var qs = new URLSearchParams(location.search);
    var demoParam = qs.get("demo");
    var demo = demoParam !== null;
    var demoMode = demoParam === "" ? "1" : demoParam; // 1 | empty | error | stale
    var wide = window.matchMedia ? window.matchMedia("(min-width: 768px)") : { matches: false };

    var calId = cfg.id;
    var gcalOpen = "https://calendar.google.com/calendar/u/0/r/agenda?cid=" + encodeURIComponent(calId);
    var gcalNew = "https://calendar.google.com/calendar/render?action=TEMPLATE&src=" + encodeURIComponent(calId);

    var people = (cfg.people || []).map(function (p) {
      return { name: p.name, c: p.color, cd: p.colorDark || p.color, match: (p.match || []).map(norm) };
    });
    var fallback = { name: cfg.defaultName || "Família", c: cfg.defaultColor || "#5f6b64",
      cd: cfg.defaultColorDark || cfg.defaultColor || "#a3b0a8", match: [], isDefault: true };

    var st = {
      view: "casa",
      today: todayNum(),
      selected: 0,
      expanded: false,
      range: RANGE_STEP,
      filter: null,
      data: null,
      events: [],
      byDay: {},
      loading: true,
      error: false,
      refreshFailed: false,
      lastFetch: 0
    };
    if (demo && /^\d{4}-\d{2}-\d{2}$/.test(qs.get("today") || "")) st.today = parseDateOnly(qs.get("today"));
    st.selected = st.today;

    // ----- estrutura fixa -----
    root.textContent = "";
    var tabs = el("div", "cal-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Visão do calendário");
    var tabCasa = tab("casa", "Casa");
    var tabGoogle = tab("google", "Google");
    tabs.appendChild(tabCasa);
    tabs.appendChild(tabGoogle);
    var panelCasa = el("div", "cal-panel");
    panelCasa.id = "cal-panel-casa";
    panelCasa.setAttribute("role", "tabpanel");
    panelCasa.setAttribute("aria-labelledby", "cal-tab-casa");
    var panelGoogle = el("div", "cal-panel");
    panelGoogle.id = "cal-panel-google";
    panelGoogle.setAttribute("role", "tabpanel");
    panelGoogle.setAttribute("aria-labelledby", "cal-tab-google");
    panelGoogle.hidden = true;
    var links = el("p", "cal-links");
    var aNew = link("+ Novo evento", gcalNew);
    var aOpen = link("Abrir no Google Agenda", gcalOpen);
    links.appendChild(aNew);
    links.appendChild(aOpen);
    root.appendChild(tabs);
    root.appendChild(panelCasa);
    root.appendChild(panelGoogle);
    root.appendChild(links);

    function tab(id, label) {
      var b = btn("cal-tab", label);
      b.id = "cal-tab-" + id;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "cal-panel-" + id);
      b.addEventListener("click", function () { setView(id, true); });
      return b;
    }
    function link(text, href) {
      var a = el("a", "cal-btn", text);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      return a;
    }

    tabs.addEventListener("keydown", function (ev) {
      var order = ["casa", "google"], i = order.indexOf(st.view), n = null;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") n = order[(i + 1) % 2];
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") n = order[(i + 1) % 2];
      else if (ev.key === "Home") n = "casa";
      else if (ev.key === "End") n = "google";
      if (n) { ev.preventDefault(); setView(n, true); (n === "casa" ? tabCasa : tabGoogle).focus(); }
    });

    // ----- visão Casa / Google -----
    var googleBuilt = false;
    function setView(v, persist) {
      st.view = v;
      if (persist) storageSet(VIEW_KEY, v);
      var g = v === "google";
      [[tabCasa, !g], [tabGoogle, g]].forEach(function (x) {
        x[0].setAttribute("aria-selected", x[1] ? "true" : "false");
        x[0].tabIndex = x[1] ? 0 : -1;
      });
      panelCasa.hidden = g;
      panelGoogle.hidden = !g;
      if (g && !googleBuilt) buildGoogle();
      if (!g) render();
    }
    function buildGoogle() {
      googleBuilt = true; // o iframe só nasce aqui: na visão Casa não há nenhum pedido ao Google
      var q = "src=" + encodeURIComponent(calId) + "&ctz=" + encodeURIComponent(TZ) +
        "&hl=pt_BR&mode=AGENDA&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0";
      var f = el("iframe", "cal-frame");
      f.src = "https://calendar.google.com/calendar/embed?" + q;
      f.title = "Google Agenda — calendário da família";
      panelGoogle.appendChild(f);
      panelGoogle.appendChild(el("p", "cal-hint",
        "Não aparece? O Safari do iPhone bloqueia o login do Google aqui. Use “Abrir no Google Agenda” ou volte para a visão Casa."));
    }

    // ----- dados -----
    function personFor(title) {
      var t = " " + norm(title).replace(/[^a-z0-9]+/g, " ") + " ";
      for (var i = 0; i < people.length; i++) {
        for (var j = 0; j < people[i].match.length; j++) {
          var k = people[i].match[j].replace(/[^a-z0-9]+/g, " ").trim();
          if (k && t.indexOf(" " + k + " ") !== -1) return people[i];
        }
      }
      return fallback;
    }

    function normalize(raw) {
      if (!raw || typeof raw !== "object") return null;
      var title = String(raw.title || "").trim() || "(sem título)";
      var o = { id: String(raw.id || title + raw.start), title: title, allDay: !!raw.allDay,
        location: String(raw.location || "").trim(), description: String(raw.description || "").trim() };
      if (o.allDay) {
        var s = parseDateOnly(raw.start), e = parseDateOnly(raw.end);
        if (isNaN(s)) return null;
        o.first = s;
        o.last = isNaN(e) || e <= s ? s : e - 1; // fim exclusivo no iCal
        o.sortMs = s * DAY - 1;
      } else {
        var a = instant(raw.start), b = raw.end ? instant(raw.end) : a;
        if (!a) return null;
        if (!b) b = a;
        o.first = a.day;
        o.last = b.day;
        if (b.ms > a.ms && b.hm === "00:00" && b.day > a.day) o.last = b.day - 1; // termina à meia-noite
        o.startHM = a.hm;
        o.endHM = b.hm;
        o.sortMs = a.ms;
        o.endMs = b.ms;
      }
      o.person = personFor(title);
      return o;
    }

    function index(data) {
      var evs = [];
      (data.events || []).forEach(function (r) { var n = normalize(r); if (n) evs.push(n); });
      evs.sort(function (a, b) { return a.sortMs - b.sortMs || (a.title < b.title ? -1 : 1); });
      var by = {};
      evs.forEach(function (e) {
        var last = Math.min(e.last, e.first + 400);
        for (var n = e.first; n <= last; n++) (by[n] = by[n] || []).push(e);
      });
      st.events = evs;
      st.byDay = by;
    }

    function eventsOn(n) {
      var l = st.byDay[n] || [];
      if (st.filter) l = l.filter(function (e) { return e.person.name === st.filter; });
      return l;
    }

    function peopleInUse() {
      var seen = {}, out = [];
      st.events.forEach(function (e) {
        if (!seen[e.person.name]) { seen[e.person.name] = 1; out.push(e.person); }
      });
      return out;
    }

    function demoTransform(data) {
      var d = JSON.parse(JSON.stringify(data));
      if (demoMode !== "stale") d.generatedAt = new Date().toISOString();
      else d.generatedAt = new Date(Date.now() - 3 * DAY).toISOString();
      if (demoMode === "empty") d.events = [];
      return d;
    }

    var timer = null;
    function load() {
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 10000) : null;
      var p;
      if (demo && demoMode === "error") p = Promise.reject(new Error("demo"));
      else p = fetch(demo ? "demo/calendar.sample.json" : "/data/calendar.json",
        { cache: "no-store", signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        });
      return p.then(function (data) {
        if (to) clearTimeout(to);
        if (!data || !Array.isArray(data.events)) throw new Error("formato");
        if (demo) data = demoTransform(data);
        st.data = data;
        index(data);
        st.error = false;
        st.refreshFailed = false;
      }).catch(function () {
        if (to) clearTimeout(to);
        if (st.data) st.refreshFailed = true; else st.error = true;
      }).then(function () {
        st.loading = false;
        st.lastFetch = Date.now();
        render();
      });
    }

    // ----- navegação -----
    function isMonthMode() { return st.expanded || wide.matches; }

    function select(n, opts) {
      opts = opts || {};
      st.selected = n;
      st.range = RANGE_STEP;
      if (opts.collapse && !wide.matches) st.expanded = false;
      render(opts.focus);
    }
    function shift(dir) {
      if (isMonthMode()) {
        var m = addMonths(st.selected, dir);
        select(firstOfMonth(m) === firstOfMonth(st.today) ? st.today : m);
      } else {
        select(st.selected + 7 * dir);
      }
    }
    function goToday() { st.expanded = false; select(st.today); }

    // Gesto de deslizar (melhoria; os botões continuam sendo a navegação principal).
    // Ignora gestos que começam a ~24px das bordas (conflitam com voltar/avançar do Safari).
    function swipeable(node, onSwipe) {
      var s = null, swallow = 0;
      node.style.touchAction = "pan-y";
      node.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse") return;
        var w = window.innerWidth;
        if (e.clientX < 24 || e.clientX > w - 24) { s = null; return; }
        s = { x: e.clientX, y: e.clientY, t: Date.now() };
      });
      node.addEventListener("pointerup", function (e) {
        if (!s) return;
        var dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t;
        s = null;
        if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy) && dt < 800) {
          swallow = Date.now();
          onSwipe(dx < 0 ? 1 : -1);
        }
      });
      node.addEventListener("pointercancel", function () { s = null; });
      node.addEventListener("click", function (e) {
        if (Date.now() - swallow < 400) { e.stopPropagation(); e.preventDefault(); }
      }, true);
    }

    // ----- renderização -----
    function render(focusId) {
      var active = document.activeElement;
      var keep = focusId || (active && panelCasa.contains(active) && active.getAttribute("data-fid")) || null;
      if (st.view !== "casa") return;
      panelCasa.textContent = "";
      if (st.loading) {
        var sk = el("div", "cal-skeleton");
        sk.setAttribute("aria-busy", "true");
        sk.setAttribute("aria-label", "Carregando o calendário");
        panelCasa.appendChild(sk);
        return;
      }
      if (st.error) {
        var box = el("div", "cal-card cal-error");
        box.setAttribute("role", "alert");
        box.appendChild(el("p", "cal-msg", "Não consegui carregar o calendário agora."));
        var retry = btn("cal-btn", "Tentar de novo");
        retry.setAttribute("data-fid", "retry");
        retry.addEventListener("click", function () { st.loading = true; render(); load(); });
        box.appendChild(retry);
        panelCasa.appendChild(box);
        panelCasa.appendChild(buildUpdated());
        return;
      }
      var card = el("div", "cal-card");
      var native = el("div", "cal-native");
      var left = el("div", "cal-left");
      var right = el("div", "cal-right");
      left.appendChild(buildHead());
      var monthMode = isMonthMode();
      var grid = monthMode ? buildMonth() : buildStrip();
      swipeable(grid, function (dir) { shift(dir); });
      left.appendChild(grid);
      if (!wide.matches) left.appendChild(buildToggle());
      var chips = buildChips();
      if (chips) right.appendChild(chips);
      right.appendChild(buildAgenda());
      native.appendChild(left);
      native.appendChild(right);
      card.appendChild(native);
      panelCasa.appendChild(card);
      panelCasa.appendChild(buildUpdated());
      if (keep) {
        var t = panelCasa.querySelector('[data-fid="' + keep + '"]');
        if (t) t.focus({ preventScroll: false });
      }
    }

    function buildHead() {
      var head = el("div", "cal-head");
      var title = el("h3", "cal-month", cap(fMonth(st.selected)));
      var nav = el("div", "cal-nav");
      var month = isMonthMode();
      var prev = btn("cal-icon", "‹", month ? "Mês anterior" : "Semana anterior");
      var next = btn("cal-icon", "›", month ? "Próximo mês" : "Próxima semana");
      var today = btn("cal-today", "Hoje", "Ir para hoje");
      prev.setAttribute("data-fid", "prev");
      next.setAttribute("data-fid", "next");
      today.setAttribute("data-fid", "today");
      prev.addEventListener("click", function () { shift(-1); });
      next.addEventListener("click", function () { shift(1); });
      today.addEventListener("click", goToday);
      nav.appendChild(prev);
      nav.appendChild(today);
      nav.appendChild(next);
      head.appendChild(title);
      head.appendChild(nav);
      return head;
    }

    function dayLabel(n) {
      var c = eventsOn(n).length;
      var s = fWeekdayLong(n) + (n === st.today ? ", hoje" : "");
      return s + ", " + (c === 0 ? "sem eventos" : c === 1 ? "1 evento" : c + " eventos");
    }

    function dayCell(n, month) {
      var p = parts(n);
      var cell = el("div", "cal-cell");
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-selected", n === st.selected ? "true" : "false");
      var b = btn("cal-day", "");
      b.setAttribute("data-fid", "d" + n + (month ? "m" : "w"));
      b.setAttribute("data-day", n);
      b.setAttribute("aria-label", dayLabel(n));
      b.tabIndex = n === st.selected ? 0 : -1;
      if (n === st.today) b.classList.add("is-today");
      if (n === st.selected) b.classList.add("is-sel");
      if (month && parts(firstOfMonth(st.selected)).m !== p.m) b.classList.add("is-other");
      var dn = el("span", "dn", String(p.d));
      dn.setAttribute("aria-hidden", "true");
      var dots = el("span", "dots");
      dots.setAttribute("aria-hidden", "true");
      var list = eventsOn(n), seen = {}, shown = 0;
      list.forEach(function (e) {
        if (seen[e.person.name] || shown >= 3) return;
        seen[e.person.name] = 1;
        shown++;
        var d = el("span", "dot");
        setColor(d, e.person);
        dots.appendChild(d);
      });
      b.appendChild(dn);
      b.appendChild(dots);
      if (month && list.length) {
        var cnt = el("span", "cnt", String(list.length));
        cnt.setAttribute("aria-hidden", "true");
        b.appendChild(cnt);
      }
      b.addEventListener("click", function () { select(n, { collapse: true }); });
      cell.appendChild(b);
      return cell;
    }

    function gridShell(label) {
      var g = el("div", "cal-grid");
      g.setAttribute("role", "grid");
      g.setAttribute("aria-label", label);
      var hdr = el("div", "cal-row cal-wd");
      hdr.setAttribute("role", "row");
      WD.forEach(function (w) {
        var c = el("div", "cal-wdc", w);
        c.setAttribute("role", "columnheader");
        hdr.appendChild(c);
      });
      g.appendChild(hdr);
      g.addEventListener("keydown", gridKeys);
      return g;
    }

    function buildStrip() {
      var g = gridShell("Semana");
      var start = st.selected - parts(st.selected).wd;
      var row = el("div", "cal-row");
      row.setAttribute("role", "row");
      for (var i = 0; i < 7; i++) row.appendChild(dayCell(start + i, false));
      g.appendChild(row);
      return g;
    }

    function buildMonth() {
      var g = gridShell("Mês de " + fMonth(st.selected));
      g.classList.add("is-month");
      var first = firstOfMonth(st.selected);
      var start = first - parts(first).wd;
      var end = first + daysInMonth(first) - 1;
      var rows = Math.ceil((end - start + 1) / 7);
      for (var r = 0; r < rows; r++) {
        var row = el("div", "cal-row");
        row.setAttribute("role", "row");
        for (var i = 0; i < 7; i++) row.appendChild(dayCell(start + r * 7 + i, true));
        g.appendChild(row);
      }
      return g;
    }

    function gridKeys(e) {
      var n = st.selected, k = e.key, t = null;
      if (k === "ArrowLeft") t = n - 1;
      else if (k === "ArrowRight") t = n + 1;
      else if (k === "ArrowUp") t = n - 7;
      else if (k === "ArrowDown") t = n + 7;
      else if (k === "Home") t = n - parts(n).wd;
      else if (k === "End") t = n + (6 - parts(n).wd);
      else if (k === "PageUp" || k === "PageDown") {
        var dir = k === "PageUp" ? -1 : 1, p = parts(n);
        t = addMonths(n, dir) + Math.min(p.d, daysInMonth(addMonths(n, dir))) - 1;
      }
      if (t === null) return;
      e.preventDefault();
      select(t, { focus: "d" + t + (isMonthMode() ? "m" : "w") });
    }

    function buildToggle() {
      var b = btn("cal-toggle", st.expanded ? "Ver semana ▴" : "Ver mês ▾");
      b.setAttribute("aria-expanded", st.expanded ? "true" : "false");
      b.setAttribute("data-fid", "toggle");
      b.addEventListener("click", function () { st.expanded = !st.expanded; render("toggle"); });
      return b;
    }

    function buildChips() {
      var used = peopleInUse();
      if (used.length < 2) { st.filter = null; return null; }
      var bar = el("div", "cal-chips");
      bar.setAttribute("role", "group");
      bar.setAttribute("aria-label", "Filtrar por pessoa");
      function chip(name, person) {
        var on = (st.filter || null) === name;
        var b = btn("cal-chip" + (on ? " is-on" : ""), "");
        b.setAttribute("aria-pressed", on ? "true" : "false");
        b.setAttribute("data-fid", "chip-" + (name || "todos"));
        if (person) {
          var ini = el("span", "ini", person.name.charAt(0).toUpperCase());
          ini.setAttribute("aria-hidden", "true");
          setColor(ini, person);
          b.appendChild(ini);
        }
        b.appendChild(document.createTextNode(person ? person.name : "Todos"));
        b.addEventListener("click", function () {
          st.filter = name;
          st.range = RANGE_STEP;
          render("chip-" + (name || "todos"));
        });
        return b;
      }
      bar.appendChild(chip(null, null));
      used.forEach(function (p) { bar.appendChild(chip(p.name, p)); });
      return bar;
    }

    function headingFor(n) {
      var d = n - st.today;
      var name = d === 0 ? "Hoje" : d === 1 ? "Amanhã" : d === -1 ? "Ontem" : null;
      return { main: name || cap(fShort(n)), sub: name ? fShort(n) : "" };
    }

    function timeChip(e, n) {
      var t = el("div", "ev-time");
      if (e.allDay) {
        t.appendChild(el("span", "chip", "Dia todo"));
      } else if (n > e.first) {
        t.appendChild(el("span", "chip", "Continua"));
      } else {
        t.appendChild(el("span", "t1", e.startHM));
        if (e.endHM && e.endMs > e.sortMs && e.last === e.first) t.appendChild(el("span", "t2", e.endHM));
      }
      return t;
    }

    function eventRow(e, n) {
      var li = el("li", "cal-li");
      var b = el("button", "ev");
      b.type = "button";
      setColor(b, e.person);
      var id = "ev-" + n + "-" + e.id.replace(/[^A-Za-z0-9_-]/g, "_");
      b.setAttribute("data-fid", id);
      b.appendChild(timeChip(e, n));
      var main = el("div", "ev-main");
      main.appendChild(el("div", "ev-title", e.title));
      var meta = [];
      if (!e.person.isDefault) meta.push(e.person.name);
      if (e.location) meta.push(e.location);
      if (e.last > e.first) meta.push("dia " + (n - e.first + 1) + " de " + (e.last - e.first + 1));
      if (meta.length) main.appendChild(el("div", "ev-meta", meta.join(" · ")));
      b.appendChild(main);
      b.addEventListener("click", function () { openSheet(e, n, id); });
      li.appendChild(b);
      return li;
    }

    function buildAgenda() {
      var wrap = el("div", "cal-agenda");
      var from = st.selected, to = from + st.range - 1, total = 0, n;
      for (n = from; n <= to; n++) total += eventsOn(n).length;
      if (total === 0) {
        var empty = el("p", "cal-empty", from === st.today && st.range === RANGE_STEP
          ? "Nenhum evento nos próximos " + st.range + " dias" : "Nenhum evento neste período");
        wrap.appendChild(empty);
      } else {
        for (n = from; n <= to; n++) {
          var list = eventsOn(n);
          if (n !== from && !list.length) continue;
          var sec = el("section", "cal-day-sec");
          var h = headingFor(n);
          var hd = el("h4", "cal-dh");
          hd.appendChild(el("span", "cal-dh-main", h.main));
          if (h.sub) hd.appendChild(el("span", "cal-dh-sub", h.sub));
          sec.appendChild(hd);
          if (!list.length) {
            sec.appendChild(el("p", "cal-empty", n === st.today ? "Nada agendado para hoje 🎉" : "Nada agendado neste dia"));
          } else {
            var ul = el("ul", "cal-list");
            list.forEach(function (e) { ul.appendChild(eventRow(e, n)); });
            sec.appendChild(ul);
          }
          wrap.appendChild(sec);
        }
      }
      var winEnd = st.data && parseDateOnly(st.data.windowEnd);
      if (!winEnd || to < winEnd) {
        var more = btn("cal-btn cal-more", "Ver mais");
        more.setAttribute("data-fid", "more");
        more.addEventListener("click", function () { st.range += RANGE_STEP; render("more"); });
        wrap.appendChild(more);
      }
      return wrap;
    }

    function buildUpdated() {
      var wrap = el("div", "cal-updated");
      var line = el("p", "cal-upd");
      line.setAttribute("aria-live", "polite");
      var gen = st.data && instant(st.data.generatedAt);
      if (gen) {
        var s = gen.day === st.today || (demo && demoMode !== "stale") ? "Atualizado às " + gen.hm
          : "Atualizado em " + fDM(gen.day) + " às " + gen.hm;
        if (st.refreshFailed) s += " — não consegui atualizar agora";
        line.textContent = s;
        if (Date.now() - gen.ms > STALE_MS) {
          var w = el("p", "cal-warn", "⚠️ Calendário desatualizado — verifique o serviço de sincronização");
          w.setAttribute("role", "status");
          wrap.appendChild(w);
        }
      } else if (st.error) {
        line.textContent = "Sem dados do calendário.";
      }
      wrap.insertBefore(line, wrap.firstChild);
      return wrap;
    }

    // ----- painel de detalhes (bottom sheet) -----
    var sheet = null;
    function whenText(e, n) {
      if (e.allDay) {
        return e.last > e.first
          ? cap(fShort(e.first)) + " a " + fShort(e.last) + " · Dia todo"
          : cap(fLong(e.first)) + " · Dia todo";
      }
      if (e.last > e.first) return cap(fShort(e.first)) + ", " + e.startHM + " → " + fShort(e.last) + ", " + e.endHM;
      return cap(fLong(e.first)) + " · " + e.startHM + (e.endMs > e.sortMs ? " – " + e.endHM : "");
    }
    function mapsUrl(q) {
      var apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;
      return apple
        ? "https://maps.apple.com/?q=" + encodeURIComponent(q)
        : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
    }
    function linkify(text, into) {
      var re = /https?:\/\/[^\s<>"]+/g, last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) into.appendChild(document.createTextNode(text.slice(last, m.index)));
        var url = m[0].replace(/[.,;:!?)]+$/, "");
        var a = el("a", null, url);
        a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
        into.appendChild(a);
        last = m.index + url.length;
        re.lastIndex = last;
      }
      if (last < text.length) into.appendChild(document.createTextNode(text.slice(last)));
    }

    function openSheet(e, n, openerFid) {
      closeSheet(true);
      var overlay = el("div", "sheet-overlay");
      var box = el("div", "sheet");
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      box.tabIndex = -1;
      setColor(box, e.person);
      var tid = "sheet-title-" + Date.now();
      box.setAttribute("aria-labelledby", tid);

      var head = el("div", "sheet-head");
      head.appendChild(el("div", "sheet-handle"));
      var h = el("h3", "sheet-title", e.title);
      h.id = tid;
      head.appendChild(h);
      var body = el("div", "sheet-body");
      body.appendChild(el("p", "sheet-when", whenText(e, n)));
      if (!e.person.isDefault) body.appendChild(el("p", "sheet-who", "Pessoa: " + e.person.name));
      if (e.location) {
        var p = el("p", "sheet-where", e.location);
        var a = el("a", "cal-btn", "Abrir no Maps");
        a.href = mapsUrl(e.location); a.target = "_blank"; a.rel = "noopener";
        body.appendChild(p);
        body.appendChild(a);
      }
      if (cfg.showDescription === true && e.description) {
        var d = el("p", "sheet-desc");
        linkify(e.description, d);
        body.appendChild(d);
      }
      var g = el("a", "cal-btn", "Abrir no Google Agenda");
      g.href = gcalOpen; g.target = "_blank"; g.rel = "noopener";
      body.appendChild(g);
      var foot = el("div", "sheet-foot");
      var close = btn("cal-btn cal-close", "Fechar");
      foot.appendChild(close);
      box.appendChild(head);
      box.appendChild(body);
      box.appendChild(foot);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      document.documentElement.classList.add("cal-lock");

      var s = { overlay: overlay, box: box, opener: openerFid, prevFocus: document.activeElement, closing: false };
      sheet = s;
      close.addEventListener("click", function () { closeSheet(); });
      overlay.addEventListener("click", function (ev) { if (ev.target === overlay) closeSheet(); });
      overlay.addEventListener("keydown", function (ev) {
        if (ev.key === "Escape") { ev.preventDefault(); closeSheet(); return; }
        if (ev.key !== "Tab") return;
        var f = box.querySelectorAll("a[href], button");
        if (!f.length) return;
        var first = f[0], lastEl = f[f.length - 1];
        if (ev.shiftKey && (document.activeElement === first || document.activeElement === box)) {
          ev.preventDefault(); lastEl.focus();
        } else if (!ev.shiftKey && document.activeElement === lastEl) {
          ev.preventDefault(); first.focus();
        }
      });
      // Evita que o fundo role quando o gesto não está na área rolável (iOS antigo).
      overlay.addEventListener("touchmove", function (ev) {
        if (!body.contains(ev.target) || body.scrollHeight <= body.clientHeight) ev.preventDefault();
      }, { passive: false });
      dragToClose(head, box);
      requestAnimationFrame(function () { overlay.classList.add("open"); });
      box.focus();
    }

    // Arrastar o cabeçalho para baixo fecha o painel.
    function dragToClose(handle, box) {
      var sy = null, dy = 0;
      handle.style.touchAction = "none";
      handle.addEventListener("pointerdown", function (e) {
        sy = e.clientY; dy = 0;
        box.style.transition = "none";
        try { handle.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      });
      handle.addEventListener("pointermove", function (e) {
        if (sy === null) return;
        dy = Math.max(0, e.clientY - sy);
        box.style.transform = "translateY(" + dy + "px)";
      });
      function end() {
        if (sy === null) return;
        sy = null;
        box.style.transition = "";
        if (dy > 90) { closeSheet(); } else { box.style.transform = ""; }
      }
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    }

    function closeSheet(immediate) {
      var s = sheet;
      if (!s || s.closing) return;
      s.closing = true;
      sheet = null;
      var done = function () {
        if (s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
        document.documentElement.classList.remove("cal-lock");
        if (immediate) return;
        var t = (s.opener && panelCasa.querySelector('[data-fid="' + s.opener + '"]')) || s.prevFocus;
        if (t && t.focus) t.focus();
      };
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (immediate || reduce) { done(); return; }
      s.overlay.classList.remove("open");
      s.box.style.transform = "translateY(100%)";
      setTimeout(done, 230);
    }

    // ----- início -----
    var want = qs.get("view");
    var saved = storageGet(VIEW_KEY);
    var first = want === "google" || want === "casa" ? want : saved === "google" ? "google" : "casa";
    setView(first, false);
    render(); // mostra o esqueleto (visão Casa) até os dados chegarem
    load();

    wide.addEventListener
      ? wide.addEventListener("change", function () { render(); })
      : (wide.addListener && wide.addListener(function () { render(); }));
    timer = setInterval(function () { if (!document.hidden) load(); }, REFRESH_MS);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && Date.now() - st.lastFetch > 30000) {
        st.today = demo && qs.get("today") ? st.today : todayNum();
        load();
      }
    });
    return timer;
  }

  window.GrassiCalendar = { mount: mount };
})();
