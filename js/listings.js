(function () {
  function params() {
    return new URLSearchParams(location.search);
  }

  function applyFormFromURL() {
    const q = params();
    const set = (name, val) => {
      const el = document.querySelector(`[name="${name}"]`);
      if (el && val) el.value = val;
    };
    const intentEl = document.querySelector(`input[name="intent"][value="${q.get("intent") || ""}"]`);
    if (intentEl) intentEl.checked = true;
    set("type", q.get("type") || "");
    set("barangay", q.get("barangay") || "");
    set("budget", q.get("budget") || "");
    set("q", q.get("q") || "");
    const title = q.get("titleType");
    if (title) {
      const box = document.querySelector(`input[name="titleType"][value="${title}"]`);
      if (box) box.checked = true;
    }
    if (q.get("pagibig") === "1") document.querySelector('[name="pagibig"]')?.setAttribute("checked", "checked");
    if (q.get("inspected") === "1") document.querySelector('[name="inspected"]')?.setAttribute("checked", "checked");
  }

  function currentFilters() {
    const form = document.getElementById("filter-form");
    const q = params();
    const data = form ? Object.fromEntries(new FormData(form).entries()) : {};
    return {
      intent: data.intent !== undefined ? data.intent : (q.get("intent") || ""),
      type: data.type || q.get("type") || "",
      barangay: data.barangay || q.get("barangay") || "",
      budget: data.budget || q.get("budget") || "",
      q: (data.q || q.get("q") || "").toLowerCase(),
      titleType: data.titleType || "",
      pagibig: form ? form.pagibig?.checked : q.get("pagibig") === "1",
      inspected: form ? form.inspected?.checked : q.get("inspected") === "1",
      sort: document.getElementById("sort")?.value || "new"
    };
  }

  function inBudget(p, budget) {
    if (!budget) return true;
    const [min, max] = budget.split("-").map(Number);
    if (p.intent === "rent") {
      if (max) return p.price >= (min || 0) && p.price <= max;
      return p.price >= (min || 0);
    }
    if (max) return p.price >= (min || 0) && p.price <= max;
    return p.price >= (min || 0);
  }

  function filterList() {
    const f = currentFilters();
    let list = PROPERTIES.slice();
    if (f.intent) list = list.filter((p) => p.intent === f.intent);
    if (f.type) list = list.filter((p) => p.type === f.type);
    if (f.barangay) list = list.filter((p) => p.barangay === f.barangay);
    if (f.titleType) list = list.filter((p) => p.titleType === f.titleType);
    if (f.pagibig) list = list.filter((p) => p.pagibigReady);
    if (f.inspected) list = list.filter((p) => p.inspected2026);
    if (f.q) {
      list = list.filter((p) =>
        [p.title, p.barangay, p.type, p.ref, p.description].join(" ").toLowerCase().includes(f.q)
      );
    }
    if (f.budget) list = list.filter((p) => inBudget(p, f.budget));

    if (f.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (f.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (f.sort === "lot") list.sort((a, b) => (b.lotSqm || 0) - (a.lotSqm || 0));
    else list.sort((a, b) => b.listed.localeCompare(a.listed));
    return list;
  }

  function render() {
    const list = filterList();
    const grid = document.getElementById("listing-grid");
    const count = document.getElementById("result-count");
    if (!grid) return;
    if (count) {
      const intent = currentFilters().intent === "rent" ? "for rent" : currentFilters().intent === "sale" ? "for sale" : "";
      count.textContent = `${list.length} ${list.length === 1 ? "listing" : "listings"}${intent ? " " + intent : ""} in General Santos City`;
    }
    grid.innerHTML = list.length
      ? list.map(cardHTML).join("")
      : `<div class="empty"><h3>No listings match those filters</h3><p>Clear a filter or tell us what you need — we keep off-market GenSan inventory as well.</p><button class="btn btn-clay" data-inquire>Request a viewing</button></div>`;
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyFormFromURL();
    const form = document.getElementById("filter-form");
    form?.addEventListener("input", render);
    form?.addEventListener("change", render);
    document.getElementById("sort")?.addEventListener("change", render);
    document.getElementById("clear-filters")?.addEventListener("click", () => {
      form.reset();
      history.replaceState({}, "", "listings.html");
      render();
    });
    render();
  });
})();
