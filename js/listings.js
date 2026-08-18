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
    const parsed = typeof parseSearch === "function" ? parseSearch(q.get("q") || "") : {};
    set("type", q.get("type") || parsed.type || "");
    set("barangay", q.get("barangay") || parsed.barangay || "");
    set("budget", q.get("budget") || parsed.budget || "");
    set("q", q.get("q") || "");
    set("furnished", q.get("furnished") || parsed.furnished || "");
    set("duration", q.get("duration") || "");
    set("beds", q.get("beds") || parsed.beds || "");
    if ((q.get("pets") === "1" || parsed.pets) && document.querySelector('[name="pets"]')) document.querySelector('[name="pets"]').checked = true;
    if (q.get("verified") === "1" && document.querySelector('[name="verified"]')) document.querySelector('[name="verified"]').checked = true;
    if (parsed.intent) {
      const ie = document.querySelector(`input[name="intent"][value="${parsed.intent}"]`);
      if (ie) ie.checked = true;
    }
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
      pets: form ? form.pets?.checked : q.get("pets") === "1",
      verified: form ? form.verified?.checked : q.get("verified") === "1",
      furnished: data.furnished || q.get("furnished") || "",
      duration: data.duration || q.get("duration") || "",
      beds: data.beds || q.get("beds") || "",
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
    if (f.inspected) list = list.filter((p) => p.inspected2026 || p.inspectedDate);
    if (f.pets) list = list.filter((p) => p.petFriendly);
    if (f.verified) list = list.filter((p) => p.ownerVerified);
    if (f.furnished) list = list.filter((p) => (p.furnishing || "").toLowerCase().includes(f.furnished.toLowerCase()));
    if (f.duration) list = list.filter((p) => p.duration === f.duration);
    if (f.beds) list = list.filter((p) => (p.beds || 0) >= Number(f.beds));
    if (f.q) {
      const parsed = typeof parseSearch === "function" ? parseSearch(f.q) : {};
      const structured = parsed.barangay || parsed.type || parsed.pets || parsed.furnished || parsed.intent || parsed.budget;
      if (parsed.barangay) list = list.filter((p) => p.barangay === parsed.barangay);
      if (parsed.type) list = list.filter((p) => p.type === parsed.type);
      if (parsed.pets) list = list.filter((p) => p.petFriendly);
      if (parsed.furnished) list = list.filter((p) => (p.furnishing || "").toLowerCase().includes(parsed.furnished));
      if (parsed.intent) list = list.filter((p) => p.intent === parsed.intent);
      if (parsed.budget) list = list.filter((p) => inBudget(p, parsed.budget));
      if (!structured) {
        list = list.filter((p) =>
          [p.title, p.barangay, p.type, p.ref, p.description, p.ownerName].join(" ").toLowerCase().includes(f.q)
        );
      }
    }
    if (f.budget) list = list.filter((p) => inBudget(p, f.budget));

    if (f.sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (f.sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (f.sort === "lot") list.sort((a, b) => (b.lotSqm || 0) - (a.lotSqm || 0));
    else if (f.sort === "near") {
      const loc = JSON.parse(sessionStorage.getItem("ts-geo") || "null");
      if (loc) list.sort((a, b) => haversineKm(loc.lat, loc.lng, a.lat, a.lng) - haversineKm(loc.lat, loc.lng, b.lat, b.lng));
    } else list.sort((a, b) => String(b.updated || b.listed).localeCompare(String(a.updated || a.listed)));
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
    document.getElementById("sort")?.addEventListener("change", () => {
      if (document.getElementById("sort").value === "near" && !sessionStorage.getItem("ts-geo")) {
        navigator.geolocation.getCurrentPosition((pos) => {
          sessionStorage.setItem("ts-geo", JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
          render();
        }, render);
        return;
      }
      render();
    });
    document.getElementById("clear-filters")?.addEventListener("click", () => {
      form.reset();
      history.replaceState({}, "", "listings.html");
      render();
    });
    render();
  });
})();
