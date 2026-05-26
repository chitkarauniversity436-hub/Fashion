import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Search, Loader, Sparkles, Shirt } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { WardrobeItem } from "@/data/products";

const areColorsCompatible = (color1: string, color2: string): boolean => {
  const c1 = color1.toLowerCase().trim();
  const c2 = color2.toLowerCase().trim();
  
  const neutrals = ["black", "white", "gray", "grey", "#ffffff", "#000000", "#1a202c", "#666", "#888", "#f3f4f6", "#e5e7eb", "beige", "cream", "navy", "denim"];
  
  if (neutrals.some(n => c1.includes(n) || c1 === n) || neutrals.some(n => c2.includes(n) || c2 === n)) {
    return true;
  }
  
  const goodPairs = [
    ["red", "black"], ["red", "white"], ["red", "blue"], ["red", "grey"],
    ["blue", "brown"], ["blue", "white"], ["blue", "grey"], ["blue", "black"], ["blue", "yellow"],
    ["green", "black"], ["green", "white"], ["green", "brown"], ["green", "beige"],
    ["yellow", "black"], ["yellow", "navy"], ["yellow", "white"], ["yellow", "grey"],
    ["pink", "white"], ["pink", "grey"], ["pink", "black"], ["pink", "denim"],
    ["brown", "beige"], ["brown", "cream"], ["brown", "white"], ["brown", "black"]
  ];
  
  return goodPairs.some(([p1, p2]) => 
    (c1.includes(p1) && c2.includes(p2)) || (c1.includes(p2) && c2.includes(p1))
  );
};

const normalizeCategory = (category: string, name: string): string => {
  const cat = (category || "").toLowerCase().trim();
  const title = (name || "").toLowerCase();

  // 1. Check title/name first since it is the most specific!
  if (title.includes("t-shirt") || title.includes("tshirt") || title.includes("shirt") || 
      title.includes("top") || title.includes("blouse") || title.includes("sweatshirt") || 
      title.includes("hoodie") || title.includes("sweater") || title.includes("jacket") || 
      title.includes("coat") || title.includes("cardigan") || title.includes("tunic") || 
      title.includes("fleece") || title.includes("pullover") || title.includes("crewneck")) {
    return "topwear";
  }

  if (title.includes("jeans") || title.includes("trouser") || title.includes("pant") || 
      title.includes("short") || title.includes("skirt") || title.includes("legging") || 
      title.includes("jegging") || title.includes("sweatpants") || title.includes("jogger") || 
      title.includes("chino") || title.includes("denim")) {
    return "bottomwear";
  }

  if (title.includes("shoe") || title.includes("sneaker") || title.includes("boot") || 
      title.includes("sandal") || title.includes("heel") || title.includes("flat") || 
      title.includes("slipper") || title.includes("loafer") || title.includes("footwear")) {
    return "footwear";
  }

  if (title.includes("dress") || title.includes("jumpsuit") || title.includes("romper") || 
      title.includes("gown") || title.includes("one-piece")) {
    return "dress";
  }

  // 2. Fallback to checking category if title did not match specific keywords
  if (cat.includes("t-shirt") || cat.includes("tshirt") || cat.includes("shirt") || 
      cat.includes("top") || cat.includes("blouse") || cat.includes("sweatshirt") || 
      cat.includes("hoodie") || cat.includes("sweater") || cat.includes("jacket") || 
      cat.includes("coat") || cat.includes("cardigan") || cat.includes("shrug") || 
      cat.includes("tunic") || cat.includes("vest") || cat === "topwear") {
    return "topwear";
  }
  
  if (cat.includes("jeans") || cat.includes("trouser") || cat.includes("pant") || 
      cat.includes("short") || cat.includes("skirt") || cat.includes("legging") || 
      cat.includes("jegging") || cat.includes("sweatpants") || cat.includes("jogger") || 
      cat.includes("chino") || cat.includes("bottom") || cat === "bottomwear") {
    return "bottomwear";
  }
  
  if (cat.includes("shoe") || cat.includes("sneaker") || cat.includes("boot") || 
      cat.includes("sandal") || cat.includes("heel") || cat.includes("flat") || 
      cat.includes("slipper") || cat.includes("loafer") || cat.includes("footwear") || cat === "footwear") {
    return "footwear";
  }

  if (cat.includes("dress") || cat.includes("jumpsuit") || cat.includes("romper") || 
      cat.includes("gown") || cat.includes("one-piece") || cat === "dress") {
    return "dress";
  }

  if (cat.includes("bag") || cat.includes("handbag") || cat.includes("backpack") || 
      cat.includes("belt") || cat.includes("scarf") || cat.includes("sunglasses") || 
      cat.includes("hat") || cat.includes("cap") || cat.includes("watch") || 
      cat.includes("jewelry") || cat.includes("necklace") || cat.includes("earring") || 
      cat.includes("accessory") || cat.includes("accessories") || cat === "accessories") {
    return "accessories";
  }
  
  if (cat.includes("ethnic") || cat.includes("kurta") || cat.includes("saree") || 
      cat.includes("sherwani") || cat.includes("salwar") || cat === "ethnic") {
    return "ethnic";
  }

  return "clothing";
};

const getComplementaryCategories = (category: string): string[] => {
  const cat = category.toLowerCase().trim();
  if (cat === "topwear") return ["bottomwear", "footwear", "accessories"];
  if (cat === "bottomwear") return ["topwear", "footwear", "accessories"];
  if (cat === "footwear") return ["topwear", "bottomwear", "accessories", "dress", "ethnic"];
  if (cat === "ethnic") return ["footwear", "accessories"];
  if (cat === "dress") return ["footwear", "accessories"];
  if (cat === "accessories") return ["topwear", "bottomwear", "footwear", "dress", "ethnic"];
  return [];
};

const getMatchingWardrobeItemsForProduct = (product: any, wardrobe: any[]): any[] => {
  if (!wardrobe || wardrobe.length === 0) return [];
  
  const normCat = normalizeCategory(product.category || product.subcategory || "", product.name || "");
  const compCats = getComplementaryCategories(normCat);
  
  return wardrobe.filter(wItem => {
    let wItemCat = normalizeCategory(wItem.category || "", wItem.name || "");
    if (wItemCat === "clothing") {
      wItemCat = wItem.category || "topwear";
    }
    const isComp = compCats.includes(wItemCat);
    if (!isComp) return false;
    
    let colorMatches = false;
    if (product.colors && product.colors.length > 0) {
      colorMatches = product.colors.some((pColor: string) => areColorsCompatible(wItem.color || "", pColor));
    } else if (product.color) {
      colorMatches = areColorsCompatible(wItem.color || "", product.color);
    } else {
      colorMatches = true;
    }
    
    return colorMatches;
  });
};

const getRecommendedProducts = (
  wardrobe: any[],
  products: any[],
  query: string
): any[] => {
  if (!wardrobe || wardrobe.length === 0 || !products || products.length === 0) {
    return [];
  }

  const queryNorm = normalizeCategory("", query);

  const scoredProducts = products.map((product) => {
    // If the query maps to a specific category, only recommend products matching that category.
    if (queryNorm !== "clothing") {
      const prodNorm = normalizeCategory(product.category || product.subcategory || "", product.name || "");
      if (prodNorm !== queryNorm) {
        return null;
      }
    }

    let score = 50;
    
    const matchingWardrobe = getMatchingWardrobeItemsForProduct(product, wardrobe);
    
    if (matchingWardrobe.length > 0) {
      score += 20;
      score += Math.min(matchingWardrobe.length * 10, 25);
    }

    const finalScore = Math.min(Math.max(score, 70), 98);

    return {
      ...product,
      compatibilityScore: finalScore,
      matchingWardrobe: matchingWardrobe.slice(0, 3)
    };
  });

  return scoredProducts
    .filter((p): p is any => p !== null && p.matchingWardrobe && p.matchingWardrobe.length > 0)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 4);
};

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth() as any;
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);

  const mapDbWardrobeItem = (dbItem: any): WardrobeItem => {
    const nameTag = dbItem.detected_tags?.find((t: string) => t.startsWith("name:"));
    const name = nameTag ? nameTag.substring(5) : (dbItem.category || "Wardrobe Item");
    return {
      id: String(dbItem.id),
      image: dbItem.image_url || "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=700&fit=crop",
      name: name,
      category: (dbItem.category as WardrobeItem["category"]) || "topwear",
      color: dbItem.primary_color || "#1a202c",
      dateAdded: dbItem.uploaded_at ? dbItem.uploaded_at.split("T")[0] : new Date().toISOString().split("T")[0],
    };
  };

  useEffect(() => {
    async function loadWardrobe() {
      if (!user) {
        setWardrobe([]);
        return;
      }

      if (user.isGuest) {
        const saved = localStorage.getItem(`stylesync_wardrobe_${user.id || user.email}`);
        setWardrobe(saved ? JSON.parse(saved) : []);
      } else {
        try {
          const response = await api.getWardrobeItems(user.id);
          const dbItems = response.items || response;
          const mapped = (dbItems || []).map(mapDbWardrobeItem);
          setWardrobe(mapped);
          localStorage.setItem(`stylesync_wardrobe_${user.id || user.email}`, JSON.stringify(mapped));
        } catch (error) {
          console.error("Failed to fetch wardrobe items from Supabase in SearchResults:", error);
          const saved = localStorage.getItem(`stylesync_wardrobe_${user.id || user.email}`);
          setWardrobe(saved ? JSON.parse(saved) : []);
        }
      }
    }

    loadWardrobe();
  }, [user]);

  const recommendedProducts = useMemo(() => {
    return getRecommendedProducts(wardrobe, results, query);
  }, [wardrobe, results, query]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts({ search: query, limit: 100 });
        setResults(data);
        setError(null);
      } catch (err) {
        console.error("Search failed:", err);
        setError((err as Error).message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="container py-10">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs sm:text-sm font-semibold">
            <Search className="w-3 h-3 sm:w-4 sm:h-4" />
            Search results for "{query || "..."}"
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Find what you need</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Search across products by name, brand, category, and subcategory.
          </p>
        </div>
      </div>



      {!query ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground">
          Enter a search term in the navbar to find products.
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Search failed: {error}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center">
          <p className="text-lg font-medium text-foreground mb-2">No products found for "{query}".</p>
          <p className="text-sm text-muted-foreground mb-4">Try another keyword or browse our categories.</p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted transition-colors">
            Browse home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {/* AI Recommended Products Section */}
          {recommendedProducts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">AI Recommended Matches For Your Wardrobe</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {recommendedProducts.map((product, index) => {
                  const productWithBadge = {
                    ...product,
                    badge: `${product.compatibilityScore}% Match`
                  };
                  return (
                    <div key={`rec-${product.id}`} className="bg-card rounded-2xl border border-primary/10 overflow-hidden shadow-product flex flex-col justify-between hover:shadow-product-hover hover:border-primary/20 transition-all duration-300">
                      <div className="p-1 pb-0 flex-1 recommended-product-card-wrapper">
                        <ProductCard product={productWithBadge} index={index} />
                      </div>
                      
                      {product.matchingWardrobe && product.matchingWardrobe.length > 0 && (
                        <div className="p-3 bg-muted/40 border-t border-border mt-auto">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                            Pairs with your wardrobe:
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {product.matchingWardrobe.map((wItem: any) => (
                              <div key={wItem.id} className="flex items-center gap-1.5 bg-background border border-border p-1 pr-2 rounded-lg flex-shrink-0">
                                <img src={wItem.image} alt={wItem.name} className="w-6 h-8 object-cover rounded" />
                                <div className="max-w-[70px]">
                                  <p className="text-[8px] font-semibold text-foreground truncate">{wItem.name}</p>
                                  <span className="text-[7px] text-muted-foreground capitalize block">
                                    {(() => {
                                      const norm = normalizeCategory(wItem.category || "", wItem.name || "");
                                      return norm === "clothing" ? wItem.category : norm;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border mt-8 pt-8" />
            </div>
          )}

          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-4">All Search Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {results.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
