(function () {
  window.DEMO_AGENTS = [
    {
      name: "Elena Dela Peña",
      email: "elena@mezza.ph",
      phone: "09178254300",
      whatsapp: "09178254300",
      prc: "REB 0021847",
      city: "General Santos City",
      agency: "Mezza Desk",
      bio: "Licensed broker covering City Heights, Lagao, and San Isidro.",
      photo: "",
      created: "2025-03-12",
      certified: true
    },
    {
      name: "Mark Rellon",
      email: "mark@mezza.ph",
      phone: "09185551234",
      whatsapp: "09185551234",
      prc: "REB 0039012",
      city: "General Santos City",
      agency: "South Gate Realty",
      bio: "Rentals and warehouse listings near Tambler and Calumpang.",
      photo: "",
      created: "2024-11-02",
      certified: true
    }
  ];

  function videoDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("mezza-media", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("videos");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  window.saveListingVideo = async function (id, file) {
    if (!id || !file) return;
    const db = await videoDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("videos", "readwrite");
      tx.objectStore("videos").put(file, id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  };
  window.getListingVideo = async function (id) {
    if (!id) return null;
    const db = await videoDB();
    return new Promise((resolve) => {
      const req = db.transaction("videos").objectStore("videos").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  };
  window.deleteListingVideo = async function (id) {
    if (!id) return;
    const db = await videoDB();
    db.transaction("videos", "readwrite").objectStore("videos").delete(id);
  };

  window.timeAgo = function (iso) {
    if (!iso) return "";
    const d = new Date(/T/.test(iso) ? iso : iso + "T12:00:00");
    if (isNaN(d)) return iso;
    const sec = (Date.now() - d.getTime()) / 1000;
    if (sec < 120) return "just now";
    if (sec < 3600) return Math.floor(sec / 60) + "m ago";
    if (sec < 86400) return Math.floor(sec / 3600) + "h ago";
    if (sec < 604800) return Math.floor(sec / 86400) + "d ago";
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };

  window.getMessages = function () {
    try { return JSON.parse(localStorage.getItem("ts-messages") || "[]"); } catch { return []; }
  };
  window.saveMessages = function (list) {
    localStorage.setItem("ts-messages", JSON.stringify(list));
  };
  window.unreadCount = function (email) {
    if (!email) return 0;
    return getMessages().filter((m) => m.toEmail && m.toEmail.toLowerCase() === email.toLowerCase() && !m.read).length;
  };
  window.sendSiteMessage = function (msg) {
    const list = getMessages();
    list.unshift(Object.assign({ id: "msg-" + Date.now(), at: new Date().toISOString(), read: false }, msg));
    saveMessages(list);
  };

  window.getReviews = function (email) {
    try {
      const all = JSON.parse(localStorage.getItem("ts-reviews") || "{}");
      return all[(email || "").toLowerCase()] || [];
    } catch { return []; }
  };
  window.addReview = function (email, review) {
    const key = (email || "").toLowerCase();
    const all = JSON.parse(localStorage.getItem("ts-reviews") || "{}");
    all[key] = all[key] || [];
    all[key].unshift(Object.assign({ at: new Date().toISOString() }, review));
    localStorage.setItem("ts-reviews", JSON.stringify(all));
  };
  window.avgRating = function (email) {
    const r = getReviews(email);
    if (!r.length) return 5;
    return Math.round((r.reduce((s, x) => s + Number(x.stars || 0), 0) / r.length) * 10) / 10;
  };

  window.getViews = function (id) {
    try { return (JSON.parse(localStorage.getItem("ts-views") || "{}")[id] || 0); } catch { return 0; }
  };
  window.bumpViews = function (id) {
    const all = JSON.parse(localStorage.getItem("ts-views") || "{}");
    all[id] = (all[id] || 0) + 1;
    localStorage.setItem("ts-views", JSON.stringify(all));
    return all[id];
  };

  window.videoEmbed = function (url) {
    if (!url) return "";
    const yt = String(url).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
    if (yt) return "https://www.youtube.com/embed/" + yt[1];
    return url;
  };

  window.parseSearch = function (raw) {
    const s = String(raw || "").toLowerCase();
    const out = {};
    (window.BARANGAYS || []).forEach((b) => {
      if (s.includes(b.toLowerCase())) out.barangay = b;
    });
    Object.keys(window.TYPE_LABELS || {}).forEach((k) => {
      const label = TYPE_LABELS[k].toLowerCase();
      if (s.includes(k) || s.includes(label.split(" ")[0])) out.type = k;
    });
    if (/pet/.test(s)) out.pets = "1";
    if (/unfurnish/.test(s)) out.furnished = "unfurnished";
    else if (/furnish/.test(s)) out.furnished = "furnished";
    if (/\brent|rental|for rent\b/.test(s)) out.intent = "rent";
    if (/\bsale|sell|buy|for sale\b/.test(s)) out.intent = "sale";
    const underK = s.match(/under\s*₱?\s*(\d+)\s*k/);
    const underM = s.match(/under\s*₱?\s*(\d+(?:\.\d+)?)\s*m/);
    if (underK) out.budget = "0-" + Number(underK[1]) * 1000;
    if (underM) out.budget = "0-" + Number(underM[1]) * 1000000;
    const beds = s.match(/(\d+)\s*(?:br|bed)/);
    if (beds) out.beds = beds[1];
    return out;
  };

  window.haversineKm = function (aLat, aLng, bLat, bLng) {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  };

  window.enrichCatalog = function () {
    if (!window.PROPERTIES) return;
    PROPERTIES.forEach((p, i) => {
      if (!p.furnishing) p.furnishing = ["furnished", "semi-furnished", "unfurnished"][i % 3];
      if (p.petFriendly == null) p.petFriendly = i % 2 === 0;
      if (!p.duration) p.duration = p.intent === "rent" ? ["monthly", "6 months", "yearly"][i % 3] : "";
      if (!p.billing) p.billing = p.intent === "rent" ? "monthly" : "sale";
      p.views = getViews(p.id) || p.views || 32 + i * 13;
      if (!p.updated) p.updated = p.listed;
      if (!p.ownerEmail) {
        const demo = DEMO_AGENTS[i % DEMO_AGENTS.length];
        p.ownerEmail = demo.email;
        p.ownerName = demo.name;
        p.ownerVerified = true;
      }
    });
  };

  window.getPublicAgents = function () {
    const map = {};
    DEMO_AGENTS.forEach((a) => { map[a.email.toLowerCase()] = Object.assign({}, a); });
    getAccounts().forEach((a) => {
      if (a.email) map[a.email.toLowerCase()] = Object.assign({}, map[a.email.toLowerCase()] || {}, a);
    });
    return Object.values(map).map((a) => {
      const listings = (window.PROPERTIES || []).filter(
        (p) => p.ownerEmail && p.ownerEmail.toLowerCase() === a.email.toLowerCase()
      );
      return Object.assign({}, a, {
        listingCount: listings.length || (a.listings ? a.listings.length : 0),
        rating: avgRating(a.email),
        verified: isVerifiedAgent(a) || !!a.certified
      });
    });
  };

  window.findPublicAgent = function (email) {
    return getPublicAgents().find((a) => a.email.toLowerCase() === String(email || "").toLowerCase()) || null;
  };

  enrichCatalog();
})();
