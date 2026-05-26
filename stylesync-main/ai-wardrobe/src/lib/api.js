
const BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_BACKEND_URL ?? "");
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f3f4f6"/><rect x="40" y="40" width="320" height="420" rx="24" fill="#e5e7eb" stroke="#d1d5db" stroke-width="4"/><text x="200" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">No Image</text></svg>'
  );

// Debug logging
console.log("API BASE_URL:", BASE_URL);

const extractProductArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.products)) return payload.data.products;

  return [];
};

const getProductImage = (product) => {
  let image =
    product.image ||
    product.image_url ||
    product.imageUrl ||
    (Array.isArray(product.images) ? product.images[0] : undefined) ||
    product.photo ||
    (Array.isArray(product.photos) ? product.photos[0] : undefined) ||
    "";

  if (typeof image === "object" && image !== null) {
    image = image.url || image.src || "";
  }

  if (typeof image === "string" && image.startsWith("/")) {
    image = `${BASE_URL}${image}`;
  }

  if (typeof image === "string" && /^https?:\/\//i.test(image)) {
    image = `${BASE_URL}/api/image-proxy?url=${encodeURIComponent(image)}`;
  }

  return image || PLACEHOLDER_IMAGE;
};


export const mapProduct = (rawProduct) => {
  const image = getProductImage(rawProduct);
  const fallbackId = [rawProduct.title, rawProduct.image_url, rawProduct.platform]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/\s+/g, "-") || `product-${Math.random().toString(36).slice(2, 10)}`;
  console.log("Mapping product:", rawProduct.title, "image:", image);
  return {
    id: rawProduct.id ?? rawProduct._id ?? rawProduct.product_id ?? fallbackId,
    name: rawProduct.title || rawProduct.name || rawProduct.product_name || "Unnamed product",
    brand: rawProduct.platform || rawProduct.brand || "Unknown",
    image: image,
    category: rawProduct.gender || rawProduct.category || "unisex",
    subcategory: rawProduct.subcategory || rawProduct.category || "",
    price: Number(rawProduct.price ?? rawProduct.amount ?? 0),
    rating: Number(rawProduct.rating ?? 4.5),
    reviews: Number(rawProduct.reviews ?? rawProduct.review_count ?? 0),
    colors: rawProduct.colors || ["#000000", "#FFFFFF", "#C0C0C0"],
    badge: rawProduct.badge || rawProduct.label || null,
    originalPrice: rawProduct.originalPrice ?? rawProduct.original_price ?? rawProduct.list_price ?? null,
    description: rawProduct.description || rawProduct.summary || "Look sharp in this premium piece.",
    sizes: rawProduct.sizes || (rawProduct.size_chart ? Object.keys(rawProduct.size_chart) : ["S", "M", "L", "XL"]),
    productUrl: rawProduct.affiliate_link || rawProduct.product_url || rawProduct.productUrl || rawProduct.url || "",
  };
};

export const api = {
  analyzeClothing: async (data) => {
    const res = await fetch(`${BASE_URL}/api/analyze-clothing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  getProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      const hasStructuralFilters = filters.category || filters.gender || filters.subcategory;
      if (filters.search && String(filters.search).trim()) {
        params.append("search", filters.search);
      } else if (!hasStructuralFilters) {
        params.append("search", "fashion");
      }
      if (filters.category) params.append("category", filters.category);
      if (filters.gender) params.append("gender", filters.gender);
      if (filters.subcategory) params.append("subcategory", filters.subcategory);
      if (filters.limit) params.append("limit", filters.limit);

      const queryString = params.toString();
      const url = `${BASE_URL}/api/products${queryString ? "?" + queryString : ""}`;

      console.log("Fetching products from:", url);
      const res = await fetch(url);
      console.log("API response status:", res.status);
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        throw new Error(`Failed to fetch products (${res.status}): ${errorBody || res.statusText}`);
      }
      const data = await res.json();
      console.log("API response data:", data);
      const mapped = extractProductArray(data).map(mapProduct);
      if (mapped.length) {
        // Filter mapped results strictly by requested gender if returned by API
        let filteredMapped = mapped;
        if (filters.gender) {
          const g = filters.gender.toLowerCase().trim();
          filteredMapped = filteredMapped.filter(p => (p.category || "").toLowerCase() === g);
        }
        if (filters.subcategory) {
          const sub = filters.subcategory.toLowerCase().trim();
          filteredMapped = filteredMapped.filter(p => (p.subcategory || "").toLowerCase() === sub);
        }
        return filteredMapped;
      }
      return [];
    } catch (error) {
      console.warn("Failed to fetch products:", error);
      return [];
    }
  },

  getProductById: async (productId) => {
    const url = `${BASE_URL}/api/products/${encodeURIComponent(productId)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`Failed to fetch product (${res.status}): ${errorText || res.statusText}`);
    }
    const data = await res.json();
    return mapProduct(data);
  },

  seedProducts: async () => {
    const res = await fetch(`${BASE_URL}/api/products/seed`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`Failed to seed products: ${res.statusText}`);
    return res.json();
  },

  createWardrobeItem: async (item) => {
    const res = await fetch(`${BASE_URL}/api/wardrobe/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to create wardrobe item (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  getOutfitRecommendations: async (payload) => {
    const res = await fetch(`${BASE_URL}/api/recommendations/outfit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to fetch recommendations (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  getOpenAIRecommendations: async (payload) => {
    const res = await fetch(`${BASE_URL}/api/recommendations/openai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to fetch OpenAI recommendations (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  getWardrobeItems: async (userId) => {
    const res = await fetch(`${BASE_URL}/api/wardrobe/items?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to fetch wardrobe items (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  deleteWardrobeItem: async (itemId, userId) => {
    const res = await fetch(`${BASE_URL}/api/wardrobe/items/${encodeURIComponent(itemId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to delete wardrobe item (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  getWishlist: async (userId) => {
    const res = await fetch(`${BASE_URL}/api/wishlist?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to fetch wishlist (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  addToWishlist: async (userId, productId) => {
    const res = await fetch(`${BASE_URL}/api/wishlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId, product_id: String(productId) }),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to add to wishlist (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },

  removeFromWishlist: async (userId, productId) => {
    const res = await fetch(`${BASE_URL}/api/wishlist/${encodeURIComponent(productId)}?user_id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`Failed to remove from wishlist (${res.status}): ${errorBody || res.statusText}`);
    }
    return res.json();
  },
};