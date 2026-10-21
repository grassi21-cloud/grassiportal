(function () {
  "use strict";

  var cfg = window.PORTAL_CONFIG;
  var host = location.protocol + "//" + location.hostname;
  var useMock = new URLSearchParams(location.search).has("mock");
  var MOCK_FAMILIES = [
    { code: "grassi", name: "Grassi" },
    { code: "demo", name: "Demo" }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function patriBase() {
    return host + ":" + cfg.patri.port;
  }

  // Cria uma seção e devolve o elemento onde o conteúdo entra.
  function addSection(id, title) {
    var s = el("section", id);
    s.appendChild(el("h2", null, title));
    var body = el("div", "grid");
    s.appendChild(body);
    document.getElementById("sections").appendChild(s);
    return body;
  }

  // --- Seção Patri ---
  function renderPatri(body) {
    body.innerHTML = "";
    for (var i = 0; i < 3; i++) body.appendChild(el("div", "skeleton"));

    var load = useMock
      ? Promise.resolve(MOCK_FAMILIES)
      : fetchWithTimeout(patriBase() + "/api/portal/families", 5000);

    load.then(function (families) {
      body.innerHTML = "";
      if (!families.length) {
        body.appendChild(el("p", "msg", "Nenhuma família ativa."));
        return;
      }
      families.forEach(function (f) {
        var a = el("a", "card family");
        a.href = patriBase() + "/family/" + encodeURIComponent(f.code) + "/";
        a.appendChild(el("div", "name", f.name));
        a.appendChild(el("div", "code", f.code));
        body.appendChild(a);
      });
    }).catch(function () {
      body.innerHTML = "";
      var p = el("p", "msg", "Patri indisponível. ");
      var retry = el("a", null, "Tentar de novo");
      retry.href = "#";
      retry.addEventListener("click", function (ev) {
        ev.preventDefault();
        renderPatri(body);
      });
      p.appendChild(retry);
      body.appendChild(p);
    });
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        return Array.isArray(data) ? data : (data.families || []);
      }, function (err) {
        clearTimeout(timer);
        throw err;
      });
  }

  // --- Seção Administração ---
  function renderAdmin(body) {
    cfg.admin.forEach(function (item) {
      var a = el("a", "card shortcut");
      a.href = item.url || (host + ":" + item.port + (item.path || "/"));
      if (item.external) {
        a.target = "_blank";
        a.rel = "noopener";
      }
      a.appendChild(el("span", "icon", item.icon || "🔗"));
      a.appendChild(el("span", "label", item.label));
      body.appendChild(a);
    });
  }

  // Para uma nova aplicação: adicionar uma entrada aqui.
  var SECTIONS = [
    { id: "patri", title: "Patri", render: renderPatri },
    { id: "admin", title: "Administração", render: renderAdmin }
  ];

  document.getElementById("title").textContent = cfg.title;
  document.title = cfg.title;
  document.getElementById("subtitle").textContent = cfg.subtitle || "";
  SECTIONS.forEach(function (s) {
    s.render(addSection(s.id, s.title));
  });
})();
