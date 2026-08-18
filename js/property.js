(function () {
  function getId() {
    return new URLSearchParams(location.search).get("id");
  }

  function related(p) {
    return PROPERTIES.filter((x) => x.id !== p.id && (x.barangay === p.barangay || x.type === p.type)).slice(0, 3);
  }

  function render() {
    const root = document.getElementById("property-root");
    if (!root) return;
    const p = PROPERTIES.find((x) => x.id === getId()) || PROPERTIES[0];
    if (!PROPERTIES.find((x) => x.id === getId())) {
      history.replaceState({}, "", "property.html?id=" + p.id);
    }

    document.title = `${p.title} | ${fmtPHP(p.price)} | Mezza`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", `${p.title} in ${p.barangay}, General Santos City. ${priceLabel(p)}. ${p.titleType}, ${p.titleStatus}.`);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = location.href.split("#")[0];

    const sqm = perSqm(p);
    const owner = typeof findListingOwner === "function" ? findListingOwner(p.id) : null;
    const callRaw = (owner && (owner.phone || owner.whatsapp)) || p.ownerPhone || SITE.phone;
    const callDigits = waDigits(callRaw);
    const callHref = "tel:+" + (callDigits.startsWith("63") ? callDigits : callDigits);
    const callLabel = callRaw.replace(/\s+/g, " ").trim() || SITE.phoneDisplay;
    const schema = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: p.title,
      url: location.href,
      datePosted: p.listed,
      image: p.images.map((src) => new URL(src, location.href).href),
      description: p.description,
      address: {
        "@type": "PostalAddress",
        streetAddress: p.address,
        addressLocality: "General Santos City",
        addressRegion: "Soccsksargen",
        postalCode: "9500",
        addressCountry: "PH"
      },
      geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng }
    };
    if (p.intent === "sale") schema.offers = { "@type": "Offer", price: p.price, priceCurrency: "PHP", availability: "https://schema.org/InStock" };
    document.getElementById("listing-schema").textContent = JSON.stringify(schema);
    if (typeof bumpViews === "function") p.views = bumpViews(p.id);

    const icon = (d) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${d}</svg>`;
    const thumbs = p.images.slice(1, 4);
    const typeNames = {
      house: "House and lot",
      townhouse: "Townhouse",
      duplex: "Duplex",
      lot: "Residential lot",
      commercial: "Commercial",
      warehouse: "Warehouse",
      farm: "Farm lot"
    };
    const typeLabel = (t) => typeNames[t] || t || "Property";
    const formatListed = (iso) => {
      if (!iso) return "—";
      const d = new Date(iso + (String(iso).length === 10 ? "T00:00:00" : ""));
      if (isNaN(d)) return iso;
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    };
    const features = (p.highlights || []).filter(Boolean);
    const legal = [];
    if (p.titleType) legal.push(p.titleType + (p.titleStatus ? " — " + p.titleStatus : ""));
    if (p.inspected2026 || p.inspectedDate) legal.push(inspectLabel(p));
    if (p.pagibigReady) legal.push("Pag-IBIG ready");
    if (p.exclusive) legal.push("Exclusive listing");
    const why = p.why || "";

    root.innerHTML = `
      <div class="crumbs">
        <a href="index.html">Home</a> /
        <a href="listings.html?intent=${p.intent}">${p.intent === "rent" ? "Rent" : "Buy"}</a> /
        <a href="listings.html?barangay=${encodeURIComponent(p.barangay)}">${p.barangay}</a> /
        <span>${p.ref}</span>
      </div>
      <div class="gallery">
        <button class="gallery-main" type="button" data-light="0" aria-label="Open photo">
          <img src="${p.images[0]}" alt="${p.title}">
        </button>
        ${thumbs.length ? `<div class="gallery-thumbs">${thumbs.map((src, i) =>
          `<button type="button" data-light="${i + 1}" aria-label="Open photo ${i + 2}"><img src="${src}" alt=""></button>`
        ).join("")}</div>` : ""}
      </div>
      <div class="lightbox" id="lightbox" hidden>
        <button class="lightbox-close" type="button" data-light-close>×</button>
        <button class="lightbox-nav prev" type="button" data-light-step="-1">‹</button>
        <img id="lightbox-img" alt="">
        <button class="lightbox-nav next" type="button" data-light-step="1">›</button>
      </div>
      <div class="property-layout">
        <div>
          <p class="eyebrow">${p.barangay} · General Santos City</p>
          <h1>${p.title}</h1>
          <p class="lede">${p.address}</p>
          <div class="spec-pills">
            ${p.beds ? `<span class="spec-pill">${icon('<path d="M3 10h18v8H3z"/><path d="M5 10V7h6v3"/>')} ${p.beds} <span>Bedrooms</span></span>` : ""}
            ${p.baths ? `<span class="spec-pill">${icon('<path d="M4 12h16v5H4z"/><path d="M7 12V8a2 2 0 0 1 4 0v4"/>')} ${p.baths} <span>Baths</span></span>` : ""}
            ${p.lotSqm ? `<span class="spec-pill">${icon('<rect x="4" y="4" width="16" height="16" rx="2"/>')} ${p.lotSqm} <span>sqm lot</span></span>` : ""}
            ${p.floorSqm ? `<span class="spec-pill">${icon('<path d="M4 20V8l8-4 8 4v12"/>')} ${p.floorSqm} <span>sqm floor</span></span>` : ""}
            ${sqm ? `<span class="spec-pill">₱${sqm.toLocaleString("en-PH")} <span>/ sqm</span></span>` : ""}
          </div>
          <div class="detail-block">
            <h2>Key specs</h2>
            <table class="spec-table">
              ${p.beds ? `<tr><th>Bedrooms</th><td>${p.beds}</td></tr>` : ""}
              ${p.baths ? `<tr><th>Bathrooms</th><td>${p.baths}</td></tr>` : ""}
              ${p.lotSqm ? `<tr><th>Lot area</th><td>${p.lotSqm} sqm</td></tr>` : ""}
              ${p.floorSqm ? `<tr><th>Floor area</th><td>${p.floorSqm} sqm</td></tr>` : ""}
              ${(p.parkingNote || p.parking) ? `<tr><th>Parking</th><td>${p.parkingNote || (p.parking + " slot" + (p.parking > 1 ? "s" : ""))}</td></tr>` : ""}
              <tr><th>Property type</th><td>${typeLabel(p.type)}</td></tr>
              ${p.condition ? `<tr><th>Condition</th><td>${p.condition}</td></tr>` : ""}
              <tr><th>Listing code</th><td>${p.ref}</td></tr>
              <tr><th>Listed</th><td>${formatListed(p.listed)}</td></tr>
            </table>
          </div>
          ${p.description ? `<div class="detail-block"><h2>Description</h2><div class="prose"><p>${p.description}</p></div></div>` : ""}
          ${features.length ? `<div class="detail-block"><h2>Key features &amp; amenities</h2><ul class="detail-list">${features.map((f) => `<li>${f}</li>`).join("")}</ul></div>` : ""}
          ${legal.length ? `<div class="detail-block"><h2>Legal &amp; status</h2><ul class="detail-list">${legal.map((f) => `<li>${f}</li>`).join("")}</ul></div>` : ""}
          ${why ? `<div class="detail-block"><h2>Why this property</h2><div class="prose"><p>${why}</p></div></div>` : ""}
          <div class="detail-block" id="video-tour-block" ${p.videoUrl || p.hasLocalVideo ? "" : "hidden"}>
            <h2>Video tour</h2>
            ${p.videoUrl ? `<div class="video-frame"><iframe title="Video tour" src="${videoEmbed(p.videoUrl)}" allowfullscreen></iframe></div>` : `<video id="local-tour" class="video-preview" controls style="max-height:none"></video>`}
          </div>
          ${p.ownerEmail ? `<div class="agent-mini">
            <div>
              <p class="eyebrow">Listed by</p>
              <h3>${p.ownerVerified ? "✓ " : ""}${p.ownerName || "Agent"}</h3>
              <p class="tiny">${p.views || 0} views · updated ${timeAgo(p.updated || p.listed)}</p>
              <a class="btn btn-ghost" href="agent.html?e=${encodeURIComponent(p.ownerEmail)}">View agent profile</a>
            </div>
          </div>` : ""}
          <div class="detail-block">
            <h2>Message the agent</h2>
            <form class="form-card" id="chat-form">
              <div class="form-grid">
                <div class="field"><label for="ch-name">Your name</label><input id="ch-name" required></div>
                <div class="field"><label for="ch-email">Email</label><input id="ch-email" type="email" required></div>
                <div class="field full"><label for="ch-msg">Message</label><textarea id="ch-msg" rows="3" required>I would like to know more about ${p.title}.</textarea></div>
              </div>
              <button class="btn btn-clay" type="submit" style="margin-top:12px">Send in-site message</button>
              <div class="success" id="ch-ok" hidden>Message sent to the agent inbox.</div>
            </form>
          </div>
          <h2>Map</h2>
          <iframe title="Map of ${p.barangay}, General Santos City" style="width:100%;height:280px;border:0;border-radius:16px" src="https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.02}%2C${p.lat - 0.02}%2C${p.lng + 0.02}%2C${p.lat + 0.02}&layer=mapnik&marker=${p.lat}%2C${p.lng}"></iframe>
        </div>
        <aside class="side-card">
          <div class="tiny">${p.ref} · Listed ${p.listed}</div>
          <div class="price">${priceLabel(p)}</div>
          <p class="tiny">Asking price. Not an offer to the public of a subdivision project.</p>
          <div class="side-actions">
            <button class="btn btn-clay btn-full" type="button" data-inquire="${p.id}">Request a viewing</button>
            <a class="btn btn-wa btn-full" target="_blank" rel="noopener" href="${waLink(`Hello, I want to view ${p.title} (${p.ref}) in ${p.barangay}.`, p.ownerWhatsapp)}">WhatsApp the listing</a>
            <a class="btn btn-ghost btn-full" href="${callHref}">Call ${callLabel}</a>
          </div>
          ${shareRowHTML(p)}
          <p class="tiny">Supervising broker: ${SITE.broker}, PRC ${SITE.prc}.</p>
        </aside>
      </div>
      <section class="section">
        <div class="section-head"><div><h2>Related in GenSan</h2></div></div>
        <div class="cards">${related(p).map(cardHTML).join("")}</div>
      </section>`;

    const bar = document.getElementById("mobile-cta");
    if (bar) {
      document.body.classList.add("has-mobile-cta");
      bar.innerHTML = `
        <div class="mobile-cta-price">${priceLabel(p)}</div>
        <button class="btn btn-clay" type="button" data-inquire="${p.id}">Viewing</button>
        <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(`Hello, I want to view ${p.title} (${p.ref}).`, p.ownerWhatsapp)}">WhatsApp</a>`;
    }

    let lightIndex = 0;
    const box = document.getElementById("lightbox");
    const boxImg = document.getElementById("lightbox-img");
    function showLight(i) {
      lightIndex = (i + p.images.length) % p.images.length;
      boxImg.src = p.images[lightIndex];
      box.hidden = false;
    }
    root.querySelectorAll("[data-light]").forEach((btn) => {
      btn.addEventListener("click", () => showLight(Number(btn.dataset.light)));
    });
    root.querySelector("[data-light-close]")?.addEventListener("click", () => { box.hidden = true; });
    root.querySelectorAll("[data-light-step]").forEach((btn) => {
      btn.addEventListener("click", () => showLight(lightIndex + Number(btn.dataset.lightStep)));
    });
    box?.addEventListener("click", (e) => { if (e.target === box) box.hidden = true; });
    if (p.hasLocalVideo && !p.videoUrl && typeof getListingVideo === "function") {
      getListingVideo(p.id).then((file) => {
        const el = document.getElementById("local-tour");
        const block = document.getElementById("video-tour-block");
        if (file && el) {
          el.src = URL.createObjectURL(file);
          if (block) block.hidden = false;
        }
      });
    }
    document.getElementById("chat-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof sendSiteMessage === "function") {
        sendSiteMessage({
          listingId: p.id,
          listingTitle: p.title,
          toEmail: p.ownerEmail || SITE.email,
          fromName: document.getElementById("ch-name").value.trim(),
          fromEmail: document.getElementById("ch-email").value.trim(),
          text: document.getElementById("ch-msg").value.trim()
        });
      }
      document.getElementById("ch-ok").hidden = false;
      e.target.reset();
    });
  }

  document.addEventListener("DOMContentLoaded", render);
})();
