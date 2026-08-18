(function () {
  const php = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0
  });

  window.fmtPHP = function (n) {
    return php.format(n);
  };

  window.priceLabel = function (p) {
    if (p.intent === "rent") return fmtPHP(p.price) + " / mo";
    return fmtPHP(p.price);
  };

  window.perSqm = function (p) {
    const base = p.lotSqm || p.floorSqm;
    if (!base || p.intent === "rent") return null;
    return Math.round(p.price / base);
  };

  window.whoLabel = function (p) {
    if (p.whoCanBuy === "filipino") return "Filipino buyers / dual citizens";
    if (p.whoCanBuy === "foreign-condo") return "Foreign buyers may own (condo cap)";
    return "Open to lease by any nationality";
  };

  window.waDigits = function (raw) {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.startsWith("0") && d.length === 11) d = "63" + d.slice(1);
    if (d.startsWith("9") && d.length === 10) d = "63" + d;
    return d || SITE.whatsapp;
  };

  window.waLink = function (text, number) {
    const msg = encodeURIComponent(text || "Hello, I saw a listing on Mezza.");
    return `https://wa.me/${waDigits(number || SITE.whatsapp)}?text=${msg}`;
  };

  window.getAccounts = function () {
    try {
      return JSON.parse(localStorage.getItem("ts-accounts") || "[]");
    } catch {
      return [];
    }
  };

  window.saveAccounts = function (list) {
    localStorage.setItem("ts-accounts", JSON.stringify(list));
  };

  window.currentUser = function () {
    try {
      const session = JSON.parse(localStorage.getItem("ts-user") || "null");
      if (!session || !session.email) return null;
      const account = getAccounts().find((a) => a.email.toLowerCase() === session.email.toLowerCase());
      return account || session;
    } catch {
      return null;
    }
  };

  window.setSession = function (email) {
    localStorage.setItem("ts-user", JSON.stringify({ email: email, at: new Date().toISOString() }));
  };

  const TYPE_IMAGES = {
    house: "images/house-bungalow.jpg",
    townhouse: "images/house-townhouse.jpg",
    duplex: "images/house-duplex.jpg",
    lot: "images/lot-residential.jpg",
    commercial: "images/lot-commercial.jpg",
    warehouse: "images/warehouse.jpg",
    farm: "images/farm.jpg"
  };

  window.listingCategoryToIntent = function (category) {
    return category === "rentals" ? "rent" : "sale";
  };

  window.normalizeRealtorListing = function (item, owner) {
    const intent = item.intent || listingCategoryToIntent(item.category);
    const type = item.type || "house";
    return {
      id: item.id,
      ref: item.ref || ("MZ-" + String(item.id).slice(-6).toUpperCase()),
      title: item.title,
      intent: intent,
      category: item.category || (intent === "rent" ? "rentals" : "selling"),
      type: type,
      barangay: item.barangay || "Lagao",
      address: item.address || ((item.barangay || "Lagao") + ", General Santos City"),
      price: Number(item.price) || 0,
      lotSqm: Number(item.lotSqm) || 0,
      floorSqm: Number(item.floorSqm) || 0,
      beds: Number(item.beds) || 0,
      baths: Number(item.baths) || 0,
      parking: Number(item.parking) || 0,
      parkingNote: item.parkingNote || "",
      condition: item.condition || "",
      why: item.why || "",
      yearBuilt: item.yearBuilt || null,
      furnishing: item.furnishing || "",
      titleType: item.titleType || "TCT",
      titleStatus: item.titleStatus || "Listed by realtor",
      titleNote: item.titleNote || "",
      whoCanBuy: intent === "rent" ? "anyone" : "filipino",
      pagibigReady: !!item.pagibigReady,
      bankAssumable: false,
      inspected2026: false,
      inspectionNote: "",
      floodNote: "",
      hoa: 0,
      exclusive: true,
      featured: false,
      images: item.images && item.images.length ? item.images : [TYPE_IMAGES[type] || TYPE_IMAGES.house],
      nearby: item.nearby || [],
      lat: item.lat || 6.114,
      lng: item.lng || 125.172,
      listed: item.listed || new Date().toISOString().slice(0, 10),
      highlights: item.highlights || [],
      description: item.description || "",
      legalNotes: [],
      ownerEmail: owner && owner.email,
      ownerName: owner && owner.name,
      ownerWhatsapp: owner && (owner.whatsapp || owner.phone),
      ownerPhone: owner && (owner.phone || owner.whatsapp)
    };
  };

  window.mergeRealtorListings = function () {
    if (!window.PROPERTIES) return;
    getAccounts().forEach((acc) => {
      (acc.listings || []).forEach((item) => {
        const p = normalizeRealtorListing(item, acc);
        const i = PROPERTIES.findIndex((x) => x.id === p.id);
        if (i >= 0) PROPERTIES[i] = p;
        else PROPERTIES.unshift(p);
      });
    });
  };

  mergeRealtorListings();

  window.getFavorites = function () {
    try {
      return JSON.parse(localStorage.getItem("ts-favs") || "[]");
    } catch {
      return [];
    }
  };

  window.toggleFavorite = function (id) {
    const favs = getFavorites();
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.push(id);
    localStorage.setItem("ts-favs", JSON.stringify(favs));
    document.querySelectorAll(`[data-save="${id}"]`).forEach((btn) => {
      btn.setAttribute("aria-pressed", favs.includes(id) ? "true" : "false");
      btn.title = favs.includes(id) ? "Saved" : "Save";
    });
    return favs.includes(id);
  };

  window.listingUrl = function (id) {
    return new URL("property.html?id=" + encodeURIComponent(id), location.href).href;
  };

  window.shareRowHTML = function (p) {
    return `<div class="share-row" role="group" aria-label="Share listing">
      <span>Share</span>
      <button type="button" class="share-btn share-fb" data-share="facebook" data-share-id="${p.id}" data-share-title="${String(p.title).replace(/"/g, "&quot;")}" title="Share on Facebook">Facebook</button>
      <button type="button" class="share-btn share-ig" data-share="instagram" data-share-id="${p.id}" data-share-title="${String(p.title).replace(/"/g, "&quot;")}" title="Share on Instagram">Instagram</button>
      <button type="button" class="share-btn share-x" data-share="twitter" data-share-id="${p.id}" data-share-title="${String(p.title).replace(/"/g, "&quot;")}" title="Share on X">X</button>
    </div>`;
  };

  window.toast = function (msg) {
    let el = document.getElementById("mezza-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "mezza-toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.hidden = true; }, 2600);
  };

  window.openShare = function (network, id, title) {
    const url = listingUrl(id);
    const text = title || "Property listing in General Santos City";
    if (network === "facebook") {
      window.open("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(url), "_blank", "noopener,width=640,height=540");
      return;
    }
    if (network === "twitter") {
      window.open("https://twitter.com/intent/tweet?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(text), "_blank", "noopener,width=640,height=540");
      return;
    }
    if (network === "instagram") {
      const go = () => window.open("https://www.instagram.com/", "_blank", "noopener");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          toast("Link copied. Paste it in your Instagram post or story.");
          go();
        }).catch(go);
      } else {
        toast("Copy this listing link, then paste it on Instagram.");
        go();
      }
    }
  };

  window.cardHTML = function (p) {
    const fav = getFavorites().includes(p.id);
    const sqm = perSqm(p);
    return `
      <article class="card">
        <a href="property.html?id=${p.id}" class="card-media" aria-label="${p.title}">
          <img src="${p.images[0]}" alt="${p.title} in ${p.barangay}, General Santos City" loading="lazy" width="800" height="600">
          <div class="card-badges">
            <span class="chip chip-clay">${p.intent === "rent" ? "For rent" : "For sale"}</span>
            ${p.titleType ? `<span class="chip chip-gold">${p.titleType}</span>` : ""}
            ${p.inspected2026 ? `<span class="chip chip-ok">Inspected 2026</span>` : ""}
          </div>
        </a>
        <button class="save-btn" type="button" data-save="${p.id}" aria-pressed="${fav}" title="Save">♥</button>
        <div class="card-body">
          <div class="card-price">${priceLabel(p)}</div>
          <h3 class="card-title"><a href="property.html?id=${p.id}">${p.title}</a></h3>
          <div class="card-meta">${p.barangay} · ${p.type} · ${p.ref}</div>
          <div class="card-specs spec-pills">
            ${p.beds ? `<span class="spec-pill">${p.beds} bed</span>` : ""}
            ${p.baths ? `<span class="spec-pill">${p.baths} bath</span>` : ""}
            ${p.lotSqm ? `<span class="spec-pill">${p.lotSqm} sqm lot</span>` : ""}
            ${p.floorSqm ? `<span class="spec-pill">${p.floorSqm} sqm floor</span>` : ""}
          </div>
          <div class="chips">
            ${p.titleStatus ? `<span class="chip chip-gold">${p.titleStatus}</span>` : ""}
            ${p.pagibigReady ? `<span class="chip chip-gold">Pag-IBIG ready</span>` : ""}
            ${p.exclusive ? `<span class="chip chip-gold">Exclusive</span>` : ""}
          </div>
          ${shareRowHTML(p)}
        </div>
      </article>`;
  };

  function logoMark() {
    return `<img class="logo-mark" src="images/logo.png?v=3" width="72" height="72" alt="Mezza">`;
  }

  function headerHTML(page) {
    const item = (href, label, key) =>
      `<a href="${href}" ${page === key ? 'aria-current="page"' : ""}>${label}</a>`;
    return `
      <div class="wrap">
        <a class="logo" href="index.html">
          ${logoMark()}
          <span>
            <strong>Mezza</strong>
            <em>General Santos listings</em>
          </span>
        </a>
        <nav class="nav" id="site-nav" aria-label="Primary">
          ${item("listings.html", "Listings", "listings")}
          ${item("areas.html", "Neighborhoods", "areas")}
          ${item("guides.html", "Guides", "guides")}
          ${item("about.html", "About", "about")}
          ${currentUser() ? item("profile.html", "My profile", "profile") : ""}
        </nav>
        <div class="header-cta">
          ${
            currentUser()
              ? `<a class="btn btn-ghost" href="profile.html">My profile</a><button class="btn btn-clay" type="button" id="logout-btn">Log out</button>`
              : `<a class="btn btn-ghost" href="login.html">Login</a><a class="btn btn-clay" href="signup.html">Sign up</a>`
          }
          <button class="menu-btn" type="button" id="menu-btn" aria-expanded="false" aria-controls="site-nav">Menu</button>
        </div>
      </div>`;
  }

  function footerHTML() {
    return `
      <div class="wrap footer-grid">
        <div>
          <h3>Mezza</h3>
          <p>A listing home for General Santos realtors — one place to stack photos, details, and posts so searchers can keep finding their properties.</p>
        </div>
        <div>
          <h3>Explore</h3>
          <ul>
            <li><a href="listings.html">Listings</a></li>
            <li><a href="areas.html">Barangays</a></li>
            <li><a href="foreign.html">Foreign &amp; dual citizens</a></li>
            ${currentUser() ? `<li><a href="profile.html">My profile</a></li>` : ""}
          </ul>
        </div>
        <div>
          <h3>Know before you buy</h3>
          <ul>
            <li><a href="guides.html">Title, tax, and transfer</a></li>
            <li><a href="guides.html#maceda">Maceda Law &amp; PD 957</a></li>
            <li><a href="guides.html#quake">After the June 2026 earthquake</a></li>
            <li><a href="privacy.html">Privacy notice</a></li>
          </ul>
        </div>
        <div>
          <h3>Visit</h3>
          <ul>
            <li><a href="tel:${SITE.phone}">${SITE.phoneDisplay}</a></li>
            <li><a href="mailto:${SITE.email}">${SITE.email}</a></li>
            <li><a href="${waLink()}">WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div class="wrap legal">
        <p>${SITE.disclaimer}</p>
        <p>© ${new Date().getFullYear()} Mezza. A listing platform for realtors in General Santos City.</p>
      </div>`;
  }

  function modalHTML() {
    return `
      <div class="modal" id="inquire-modal" hidden>
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="inquire-title">
          <div class="modal-head">
            <h3 id="inquire-title">Request a viewing</h3>
            <button class="icon-btn" type="button" data-close-modal>×</button>
          </div>
          <p class="tiny" id="inquire-property">A licensed broker will reply on this number.</p>
          <form id="inquire-form">
            <input type="hidden" name="propertyId" id="inq-id">
            <input type="hidden" name="toMobile" id="inq-to-mobile">
            <input type="hidden" name="toWhatsapp" id="inq-to-whatsapp">
            <input type="hidden" name="toEmail" id="inq-to-email">
            <div class="form-grid">
              <div class="field"><label for="inq-name">Full name</label><input id="inq-name" name="name" required autocomplete="name"></div>
              <div class="field"><label for="inq-mobile">Mobile</label><input id="inq-mobile" name="mobile" required inputmode="tel" placeholder="09xx"></div>
              <div class="field"><label for="inq-email">Email</label><input id="inq-email" name="email" type="email" autocomplete="email"></div>
              <div class="field"><label for="inq-intent">I want to</label>
                <select id="inq-intent" name="intent">
                  <option>View this property</option>
                  <option>Ask about papers</option>
                  <option>Estimate financing</option>
                  <option>Sell a property</option>
                </select>
              </div>
              <div class="field full"><label for="inq-msg">Message</label><textarea id="inq-msg" name="message" rows="3"></textarea></div>
              <label class="consent full">
                <input type="checkbox" name="consent" required>
                <span>I agree that Mezza may contact me about this inquiry, in line with the <a href="privacy.html">Data Privacy Act notice</a>.</span>
              </label>
            </div>
            <div class="side-actions" style="margin-top:14px">
              <button class="btn btn-clay btn-full" type="submit">Send inquiry</button>
              <a class="btn btn-wa btn-full" id="inq-wa" target="_blank" rel="noopener">Or continue on WhatsApp</a>
            </div>
            <div class="success" id="inq-ok" hidden>Opening an email to the listing agent.</div>
          </form>
        </div>
      </div>`;
  }

  function injectChrome() {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = headerHTML(document.body.dataset.page || "");
    if (footer) {
      footer.classList.add("site-footer");
      footer.innerHTML = footerHTML();
    }
    if (!document.getElementById("inquire-modal")) {
      document.body.insertAdjacentHTML("beforeend", modalHTML());
    }
    const nav = document.getElementById("site-nav");
    const btn = document.getElementById("menu-btn");
    if (btn && nav) {
      btn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    document.getElementById("logout-btn")?.addEventListener("click", () => {
      localStorage.removeItem("ts-user");
      location.reload();
    });
  }

  window.findListingOwner = function (propertyId) {
    if (!propertyId) return null;
    for (const acc of getAccounts()) {
      if ((acc.listings || []).some((l) => l.id === propertyId)) return acc;
    }
    const p = (window.PROPERTIES || []).find((x) => x.id === propertyId);
    if (p && p.ownerEmail) {
      return getAccounts().find((a) => a.email.toLowerCase() === p.ownerEmail.toLowerCase()) || null;
    }
    return null;
  };

  function inquiryText(form) {
    const name = document.getElementById("inq-name")?.value.trim() || "";
    const mobile = document.getElementById("inq-mobile")?.value.trim() || "";
    const msg = document.getElementById("inq-msg")?.value.trim() || "";
    const label = document.getElementById("inquire-property")?.textContent || "a listing";
    return `${name ? name + " " : ""}${mobile ? "(" + mobile + ") " : ""}is inquiring about ${label}. ${msg}`.trim();
  }

  function refreshInquiryTargets() {
    const wa = document.getElementById("inq-to-whatsapp")?.value;
    const text = inquiryText();
    const waBtn = document.getElementById("inq-wa");
    if (waBtn) waBtn.href = waLink(text, wa);
  }

  window.openInquire = function (propertyId, preset) {
    const modal = document.getElementById("inquire-modal");
    const p = PROPERTIES.find((x) => x.id === propertyId);
    const owner = findListingOwner(propertyId);
    const mobile = (owner && (owner.phone || owner.whatsapp)) || (p && p.ownerPhone) || SITE.phone;
    const whatsapp = (owner && (owner.whatsapp || owner.phone)) || (p && p.ownerWhatsapp) || SITE.whatsapp;
    const email = (owner && owner.email) || (p && p.ownerEmail) || SITE.email;
    document.getElementById("inq-id").value = propertyId || "";
    document.getElementById("inq-to-mobile").value = mobile;
    document.getElementById("inq-to-whatsapp").value = whatsapp;
    document.getElementById("inq-to-email").value = email;
    document.getElementById("inquire-property").textContent = p
      ? `${p.ref} · ${p.title}`
      : "Tell us what you are looking for in General Santos City.";
    document.getElementById("inq-msg").value = preset || (p ? `I want to know more about ${p.title} (${p.ref}).` : "");
    refreshInquiryTargets();
    document.getElementById("inq-ok").hidden = true;
    modal.hidden = false;
  };

  function bindGlobal() {
    document.addEventListener("click", (e) => {
      const save = e.target.closest("[data-save]");
      if (save) {
        e.preventDefault();
        toggleFavorite(save.dataset.save);
      }
      const share = e.target.closest("[data-share]");
      if (share) {
        e.preventDefault();
        e.stopPropagation();
        openShare(share.dataset.share, share.dataset.shareId, share.dataset.shareTitle);
        return;
      }
      const inq = e.target.closest("[data-inquire]");
      if (inq) {
        e.preventDefault();
        openInquire(inq.dataset.inquire);
      }
      if (e.target.closest("[data-close-modal]")) {
        document.getElementById("inquire-modal").hidden = true;
      }
    });
    document.getElementById("inquire-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "inquire-modal") e.target.hidden = true;
    });
    document.getElementById("inquire-form")?.addEventListener("input", refreshInquiryTargets);
    document.getElementById("inquire-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target).entries());
      const leads = JSON.parse(localStorage.getItem("ts-leads") || "[]");
      leads.push({ ...data, at: new Date().toISOString() });
      localStorage.setItem("ts-leads", JSON.stringify(leads));
      const body = inquiryText();
      const email = data.toEmail || SITE.email;
      const subject = encodeURIComponent("Viewing request: " + (document.getElementById("inquire-property")?.textContent || "Mezza listing"));
      document.getElementById("inq-ok").hidden = false;
      if (data.toMobile) {
        window.open(`sms:${waDigits(data.toMobile)}?body=${encodeURIComponent(body)}`, "_blank");
      }
      window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
      e.target.reset();
    });

    document.querySelectorAll("[data-search-form]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const q = new URLSearchParams(new FormData(form));
        location.href = "listings.html?" + q.toString();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectChrome();
    bindGlobal();
  });
})();
