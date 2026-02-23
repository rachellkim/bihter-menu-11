// ===== CONFIG =====
const API_URL = "/api/menu";

// Ana sayfada görünecek ana kategori slug'ları (Airtable slug(text))
const MAIN_SLUGS = [
  "tatlilar",
  "soguk-kahveler",
  "sicak-icecekler",
  "sicak-kahveler",
  "soguk-icecekler",
  "atistirmaliklar",
];

/**
 * ANA -> ALT kategori eşlemesi (Airtable slug'larıyla)
 * Alt kategorisi olmayanlarda [] bırak.
 */
const SUB_MAP = {
  atistirmaliklar: [],
  "sicak-kahveler": ["espresso-bazli", "aromali-ozel-kahveler", "filtreturk"],
  "soguk-kahveler": ["sogukbazli", "soguk-matchalar", "frappeler"],
  "sicak-icecekler": [],
  "soguk-icecekler": [],
  "tatlilar": [],
};

// ===== HELPERS =====
const qs = (k) => new URLSearchParams(location.search).get(k) || "";

function normTR(s) {
  return String(s ?? "").trim();
}

function getSlug(cat) {
  return cat?.slug || cat?.slugText || cat?.["slug(text)"] || cat?.["slug"] || "";
}

function getTitle(cat) {
  return (
    cat?.titleTR ||
    cat?.["Kategori TR"] ||
    cat?.title ||
    cat?.name ||
    getSlug(cat) ||
    ""
  );
}

/**
 * Worker şu an coverPhoto döndürüyor:
 * coverPhoto: firstAttachmentUrl(...)
 */
function getHeroUrl(cat) {
  const v =
    cat?.coverPhoto ||
    cat?.coverUrl ||
    cat?.coverPhotoUrl ||
    cat?.heroUrl ||
    cat?.kapakFotoUrl ||
    cat?.["Kapak Foto"] ||
    cat?.cover ||
    "";

  if (Array.isArray(v)) return v?.[0]?.url || "";
  if (typeof v === "object" && v) return v?.url || "";
  return v || "";
}

function formatPrice(p) {
  const s = String(p ?? "").trim();
  if (!s) return "";
  if (/^\d+([.,]\d+)?$/.test(s)) return s.replace(",", ".") + "₺";
  return s;
}

/**
 * Ürün görseli: Worker image döndürüyor ama eski alan adlarını da destekleyelim.
 */
function getProductImage(it) {
  const v =
    it?.image ||
    it?.photoUrl ||
    it?.imageUrl ||
    it?.imgUrl ||
    it?.photo ||
    it?.["Ürün Fotoğrafı"] ||
    it?.["Urun Fotograf"] ||
    it?.urunFotografi ||
    "";

  if (Array.isArray(v)) return v?.[0]?.url || "";
  if (typeof v === "object" && v) return v?.url || "";
  return v || "";
}

function setHero(cat) {
  const img = document.getElementById("heroImg");
  const txt = document.getElementById("heroText");
  if (!img && !txt) return;

  const title = getTitle(cat);
  const url = getHeroUrl(cat);

  if (txt) txt.textContent = title;

  if (img) {
    if (url) {
      img.src = url;
      img.alt = title;
      img.style.display = "block";
      img.classList.add("is-visible");
    } else {
      img.style.display = "none";
    }
  }
}

async function getMenu() {
  const r = await fetch(API_URL, { cache: "no-store" });
  if (!r.ok) throw new Error("Menu API hata: " + r.status);
  return await r.json();
}

function findCategory(data, slug) {
  const cats = data?.categories || [];
  return cats.find((c) => getSlug(c) === slug) || null;
}

function sortItemsSafe(items) {
  // Worker artık Sira’ya göre gönderiyor ama güvenlik için:
  return [...(items || [])].sort((a, b) => {
    const ax = Number(a?.Sira ?? a?.["Sira"] ?? a?.["Sıra"] ?? a?.order ?? a?.Order ?? 999999);
    const bx = Number(b?.Sira ?? b?.["Sira"] ?? b?.["Sıra"] ?? b?.order ?? b?.Order ?? 999999);
    return ax - bx;
  });
}

// ===== RENDER: MAIN INDEX =====
function renderIndex(data) {
  const box = document.getElementById("categoryButtons");
  if (!box) return;

  const catsBySlug = new Map((data?.categories || []).map((c) => [getSlug(c), c]));

  box.innerHTML = "";
  for (const slug of MAIN_SLUGS) {
    const cat = catsBySlug.get(slug);
    if (!cat) continue;

    const title = getTitle(cat);
    const hasSubs = Array.isArray(SUB_MAP[slug]) && SUB_MAP[slug].length > 0;

    const href = hasSubs
      ? `/sub.html?main=${encodeURIComponent(slug)}`
      : `/category/?cat=${encodeURIComponent(slug)}`;

    const a = document.createElement("a");
    a.className = "btn";
    a.href = href;
    a.textContent = title;
    box.appendChild(a);
  }
}

// ===== RENDER: SUB PAGE =====
function renderSub(data) {
  const box = document.getElementById("subButtons");
  if (!box) return;

  const mainSlug = qs("main");
  const mainCat = findCategory(data, mainSlug);
  if (!mainCat) {
    box.innerHTML = `<p style="text-align:center; opacity:.7;">Kategori bulunamadı.</p>`;
    return;
  }

  setHero(mainCat);

  const subs = SUB_MAP[mainSlug] || [];
  box.innerHTML = "";

  if (!subs.length) {
    location.href = `/category/?cat=${encodeURIComponent(mainSlug)}`;
    return;
  }

  for (const subSlug of subs) {
    const cat = findCategory(data, subSlug);
    const title = cat ? getTitle(cat) : subSlug;

    const a = document.createElement("a");
    a.className = "btn";
    a.href = `/category/?cat=${encodeURIComponent(subSlug)}`;
    a.textContent = title;
    box.appendChild(a);
  }
}

// ===== RENDER: CATEGORY PAGE (PRODUCTS) =====
function renderCategory(data) {
  const itemsBox = document.getElementById("items");
  const titleEl = document.getElementById("catTitle");
  if (!itemsBox) return;

  const slug = qs("cat");
  const cat = findCategory(data, slug);
  if (!cat) {
    itemsBox.innerHTML = `<p style="text-align:center; opacity:.7;">Kategori bulunamadı.</p>`;
    return;
  }

  // başlık + hero
  if (titleEl) titleEl.textContent = normTR(getTitle(cat));
  setHero(cat);

  // ürünler
  const items = sortItemsSafe(cat?.items || []);
  itemsBox.innerHTML = "";

  for (const it of items) {
    const name = normTR(it?.name || it?.["Ürün Adı"] || it?.["Urun Adi"] || "");
    const desc = normTR(it?.desc || it?.descTR || it?.["Açıklama TR"] || it?.["Aciklama TR"] || "");
    const price = formatPrice(it?.price || it?.priceText || it?.["Fiyat"] || it?.["Price"] || "");
    const imgUrl = getProductImage(it);

    const card = document.createElement("article");
    card.className = "item";

    const left = document.createElement("div");
    left.className = "itemMain";
    left.innerHTML = `
      <h3 class="itemName">${name}</h3>
      ${desc ? `<p class="itemDesc">${desc}</p>` : ""}
    `;

    // Sağ taraf wrapper (CSS'te display:contents yapıyoruz)
    const right = document.createElement("div");
    right.className = "itemRight";

    const p = document.createElement("div");
    p.className = "price";
    p.textContent = price;

    right.appendChild(p);

    if (imgUrl) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.alt = name;
      img.loading = "lazy";
      img.src = imgUrl;
      right.appendChild(img);
    }

    card.appendChild(left);
    card.appendChild(right);

    itemsBox.appendChild(card);
  }
}

// ===== TO TOP =====
function setupToTop() {
  const btn = document.getElementById("toTopBtn");
  if (!btn) return;

  btn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  window.addEventListener(
    "scroll",
    () => {
      btn.style.display = window.scrollY > 400 ? "block" : "none";
    },
    { passive: true }
  );

  btn.style.display = "none";
}

// ===== BOOT =====
(async function init() {
  try {
    setupToTop();
    const data = await getMenu();

    renderIndex(data);
    renderSub(data);
    renderCategory(data);
  } catch (e) {
    console.error(e);
    const box =
      document.getElementById("categoryButtons") ||
      document.getElementById("subButtons") ||
      document.getElementById("items");
    if (box) {
      box.innerHTML = `<p style="text-align:center; color:#a00;">Yüklenemedi. (API / veri hatası)</p>`;
    }
  }
})();
