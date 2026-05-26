import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shirt, Sparkles, Plus, X } from "lucide-react";
import { WardrobeItem } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { api, mapProduct } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const DUMMY_WARDROBE: WardrobeItem[] = [];

const categoryFilters: WardrobeItem["category"][] = ["topwear", "bottomwear", "footwear", "accessories", "ethnic"];
const occasionOptions = ["casual", "formal", "party", "business", "outing", "evening", "sports"];

interface OpenAIAdvice {
  score: number;
  recommendation: string;
  pairings: string[];
}

const WardrobePage = () => {
  const { user } = useAuth() as any;
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(DUMMY_WARDROBE);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [occasion, setOccasion] = useState<string>("casual");
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [isLoadingAIAdvice, setIsLoadingAIAdvice] = useState(false);
  const [apiRecs, setApiRecs] = useState<{ wardrobeMatches: WardrobeItem[]; productMatches: any[] } | null>(null);
  const [openAIAdvice, setOpenAIAdvice] = useState<OpenAIAdvice | null>(null);

  // States for adding a new item with details
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [pendingCategory, setPendingCategory] = useState<WardrobeItem["category"]>("topwear");
  const [pendingColor, setPendingColor] = useState("#1a202c");
  const [pendingOccasion, setPendingOccasion] = useState("casual");

  // Helper to map DB item to frontend WardrobeItem
  const mapDbWardrobeItem = (dbItem: any): WardrobeItem => {
    const nameTag = dbItem.detected_tags?.find((t: string) => t.startsWith("name:"));
    const name = nameTag ? nameTag.substring(5) : (dbItem.category || "Wardrobe Item");
    return {
      id: dbItem.id,
      image: dbItem.image_url || "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=700&fit=crop",
      name: name,
      category: (dbItem.category as WardrobeItem["category"]) || "topwear",
      color: dbItem.primary_color || "#1a202c",
      dateAdded: dbItem.uploaded_at ? dbItem.uploaded_at.split("T")[0] : new Date().toISOString().split("T")[0],
    };
  };

  // Load and save wardrobe items scoped to user
  useEffect(() => {
    async function syncAndLoadWardrobe() {
      if (!user) {
        setWardrobe([]);
        return;
      }

      if (user.isGuest) {
        const saved = localStorage.getItem(`stylesync_wardrobe_${user.id || user.email}`);
        setWardrobe(saved ? JSON.parse(saved) : []);
      } else {
        try {
          // Check for guest items to sync
          const guestKeys = [`stylesync_wardrobe_demo-user-1`, `stylesync_wardrobe_guest`];
          let guestItems: WardrobeItem[] = [];
          for (const key of guestKeys) {
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                  guestItems = [...guestItems, ...parsed];
                }
              } catch (e) {
                console.error("Error parsing guest wardrobe:", e);
              }
              localStorage.removeItem(key);
            }
          }

          if (guestItems.length > 0) {
            console.log("Syncing guest wardrobe items to Supabase:", guestItems);
            for (const item of guestItems) {
              try {
                await api.createWardrobeItem({
                  user_id: user.id,
                  image_url: item.image || "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=700&fit=crop",
                  category: item.category,
                  primary_color: item.color,
                  occasion: ["casual"],
                  detected_tags: [`name:${item.name}`, item.category],
                });
              } catch (e) {
                console.error(`Failed to sync guest wardrobe item ${item.name}:`, e);
              }
            }
          }

          const response = await api.getWardrobeItems(user.id);
          const dbItems = response.items || response;
          const mapped = (dbItems || []).map(mapDbWardrobeItem);
          setWardrobe(mapped);
        } catch (error) {
          console.error("Failed to fetch wardrobe items from Supabase:", error);
          const saved = localStorage.getItem(`stylesync_wardrobe_${user.id || user.email}`);
          setWardrobe(saved ? JSON.parse(saved) : []);
        }
      }
    }

    syncAndLoadWardrobe();
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`stylesync_wardrobe_${user.id || user.email}`, JSON.stringify(wardrobe));
    }
  }, [wardrobe, user]);

  const filtered = filter === "all" ? wardrobe : wardrobe.filter((i) => i.category === filter);

  // Simple AI recommendation: suggest items from different categories + matching products
  const getRecommendations = (item: WardrobeItem) => {
    const otherItems = wardrobe.filter((w) => w.id !== item.id && w.category !== item.category);
    return { wardrobeMatches: otherItems, productMatches: [] };
  };

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPendingImage(url);
        setPendingName(file.name.replace(/\.[^.]+$/, ""));
        setPendingCategory("topwear");
        setPendingColor("#1a202c");
        setPendingOccasion("casual");
        setIsAddOpen(true);
      }
    };
    input.click();
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingName.trim()) {
      toast.error("Please enter a name for the item.");
      return;
    }

    const newItem: WardrobeItem = {
      id: `w${Date.now()}`,
      image: pendingImage || "https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&h=700&fit=crop",
      name: pendingName.trim(),
      category: pendingCategory,
      color: pendingColor,
      dateAdded: new Date().toISOString().split("T")[0],
    };

    setIsAddOpen(false);

    if (user && !user.isGuest) {
      api.createWardrobeItem({
        user_id: user.id,
        image_url: newItem.image,
        category: newItem.category,
        primary_color: newItem.color,
        occasion: [pendingOccasion],
        detected_tags: [`name:${newItem.name}`, newItem.category],
      }).then((res) => {
        const mapped = mapDbWardrobeItem(res.item || res);
        setWardrobe((prev) => [mapped, ...prev]);
        toast.success("Item added to your wardrobe!");
      }).catch((err) => {
        console.error("Failed to add wardrobe item backend:", err);
        setWardrobe((prev) => [newItem, ...prev]);
        toast.success("Item added locally!");
      });
    } else {
      setWardrobe((prev) => [newItem, ...prev]);
      toast.success("Item added to your wardrobe locally!");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) {
      return;
    }

    // Optimistic update
    setWardrobe((prev) => prev.filter((item) => item.id !== itemId));
    setSelectedItem(null);

    if (user && !user.isGuest) {
      try {
        await api.deleteWardrobeItem(itemId, user.id);
        toast.success("Item deleted from wardrobe.");
      } catch (error) {
        console.error("Failed to delete wardrobe item from backend:", error);
        toast.error("Failed to delete item from server. Reloading wardrobe.");
        try {
          const response = await api.getWardrobeItems(user.id);
          const dbItems = response.items || response;
          const mapped = (dbItems || []).map(mapDbWardrobeItem);
          setWardrobe(mapped);
        } catch (e) {
          console.error("Failed to reload wardrobe:", e);
        }
      }
    } else {
      toast.success("Item deleted from wardrobe locally.");
    }
  };

  const loadRecommendations = async () => {
    if (!selectedItem) return;
    setIsLoadingRecs(true);
    try {
      const response = await api.getOutfitRecommendations({
        user_id: user?.id || "demo-user-1",
        occasion,
        category: selectedItem.category,
        primary_color: selectedItem.color,
        tags: [selectedItem.category],
        limit: 6,
        exclude_item_id: selectedItem.id,
      });

      const wardrobeMatches = (response.wardrobe_matches || []).map((item: any) => ({
        id: item.id || `w-${Math.random().toString(36).slice(2, 9)}`,
        image: item.image_url || item.image || selectedItem.image,
        name: item.name || item.title || "Wardrobe Item",
        category: (item.category as WardrobeItem["category"]) || "topwear",
        color: item.primary_color || "#666",
        dateAdded: item.uploaded_at?.split("T")?.[0] || new Date().toISOString().split("T")[0],
      }));
      const productMatches = (response.external_matches || []).map(mapProduct);

      setApiRecs({ wardrobeMatches, productMatches });
    } catch {
      setApiRecs(null);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const loadOpenAIAdvice = async () => {
    if (!selectedItem) return;
    setIsLoadingAIAdvice(true);
    setOpenAIAdvice(null);
    try {
      const response = await api.getOpenAIRecommendations({
        user_id: user?.id || "demo-user-1",
        wardrobe: wardrobe.map((item) => ({
          name: item.name,
          category: item.category,
          color: item.color,
          occasion: occasion,
        })),
        query: `Suggest a styling recommendation for ${selectedItem.name} for a ${occasion} look.`,
        occasion,
        gender: "unisex",
        style: "casual streetwear",
        limit: 1,
      });

      if (response && response.parsed_recommendation) {
        setOpenAIAdvice({
          score: Number(response.parsed_recommendation.score ?? 85),
          recommendation: response.parsed_recommendation.recommendation || response.recommendation || "No recommendation returned.",
          pairings: response.parsed_recommendation.pairings || [],
        });

        if (response.parsed_recommendation.products) {
          const productMatches = response.parsed_recommendation.products.map((p: any) => {
            const mapped = mapProduct(p);
            return {
              ...mapped,
              matchScore: p.match_score ?? p.score,
              aiReason: p.ai_reason ?? p.reason
            };
          });
          setApiRecs((prev) => ({
            wardrobeMatches: prev?.wardrobeMatches || getRecommendations(selectedItem).wardrobeMatches || [],
            productMatches: productMatches,
          }));
        }
      } else {
        setOpenAIAdvice({
          score: 85,
          recommendation: response.recommendation || "No recommendation returned.",
          pairings: [],
        });
      }
    } catch (err) {
      console.error("Failed to load OpenAI advice:", err);
      setOpenAIAdvice({
        score: 75,
        recommendation: "Could not fetch advice from OpenAI. Showing a local styling suggestion instead: Pair this piece with complementary, contrasting tones and clean accessories to elevate your outfit.",
        pairings: [],
      });
    } finally {
      setIsLoadingAIAdvice(false);
    }
  };

  const recs = selectedItem ? (apiRecs || getRecommendations(selectedItem)) : null;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Wardrobe</h1>
          <p className="text-muted-foreground mt-1">Upload clothes and get AI-powered outfit suggestions</p>
        </div>
        <button
          onClick={handleUpload}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
          }`}
        >
          All ({wardrobe.length})
        </button>
        {categoryFilters.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-primary/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Wardrobe grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setSelectedItem(item)}
            className={`cursor-pointer rounded-lg overflow-hidden shadow-product hover:shadow-product-hover transition-all ${
              selectedItem?.id === item.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="aspect-[3/4] overflow-hidden">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-2.5 bg-card">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {wardrobe.length === 0 && (
        <div className="text-center py-20">
          <Shirt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Your wardrobe is empty. Upload some clothes to get started!</p>
        </div>
      )}

      {/* AI Recommendations Panel */}
      <AnimatePresence>
        {selectedItem && recs && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="mt-12 bg-card rounded-2xl border border-border p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-bold text-foreground">
                  AI Suggestions for "{selectedItem.name}"
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-border bg-background text-sm"
                >
                  {occasionOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadRecommendations}
                  className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90"
                  disabled={isLoadingRecs}
                >
                  {isLoadingRecs ? "Matching..." : "Match for Occasion"}
                </button>
                <button
                  onClick={loadOpenAIAdvice}
                  className="px-3 py-1.5 rounded-md bg-muted text-foreground text-sm hover:bg-muted/90"
                  disabled={isLoadingAIAdvice}
                >
                  {isLoadingAIAdvice ? "Styling..." : "AI Style Advice"}
                </button>
                <button
                  onClick={() => handleDeleteItem(selectedItem.id)}
                  className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors"
                >
                  Delete Item
                </button>
                <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {recs.wardrobeMatches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">From Your Wardrobe</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {recs.wardrobeMatches.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-28">
                      <div className="aspect-[3/4] rounded-lg overflow-hidden shadow-product">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs mt-1.5 font-medium text-foreground truncate">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {openAIAdvice && (
              <div className="mb-8 p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/5 shadow-lg relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full filter blur-2xl -z-10 animate-pulse" />
                
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">AI Styling Advice</h3>
                        <p className="text-xs text-muted-foreground">Tailored combinations for a {occasion} look</p>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-foreground/80 font-sans">
                      {openAIAdvice.recommendation}
                    </p>

                    {openAIAdvice.pairings && openAIAdvice.pairings.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                          Suggested Wardrobe Combinations:
                        </span>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                          {openAIAdvice.pairings.map((pairingName, idx) => {
                            // Find the matching wardrobe item
                            const matchedItem = wardrobe.find(
                              (w) =>
                                w.name.toLowerCase() === pairingName.toLowerCase() ||
                                w.name.toLowerCase().includes(pairingName.toLowerCase()) ||
                                pairingName.toLowerCase().includes(w.name.toLowerCase())
                            );

                            if (!matchedItem) {
                              return (
                                <div key={idx} className="flex-shrink-0 w-24 bg-card/60 p-1.5 rounded-xl border border-border flex flex-col items-center">
                                  <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                                    <Shirt className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                  <p className="text-[10px] mt-1.5 font-medium text-foreground text-center line-clamp-2">{pairingName}</p>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={matchedItem.id}
                                onClick={() => setSelectedItem(matchedItem)}
                                className="flex-shrink-0 w-24 cursor-pointer group bg-card/60 hover:bg-card p-1.5 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all duration-200"
                              >
                                <div className="aspect-[3/4] w-full rounded-lg overflow-hidden relative">
                                  <img
                                    src={matchedItem.image}
                                    alt={matchedItem.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                </div>
                                <p className="text-[10px] mt-1.5 font-medium text-foreground text-center truncate group-hover:text-primary transition-colors">
                                  {matchedItem.name}
                                </p>
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full border border-border" style={{ backgroundColor: matchedItem.color }} />
                                  <span className="text-[8px] text-muted-foreground capitalize">{matchedItem.category}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 bg-background/50 rounded-xl border border-border min-w-[120px] text-center self-center md:self-start">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-primary/10 blur-sm animate-pulse" />
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="text-muted/20"
                          strokeWidth="5"
                          stroke="currentColor"
                          fill="transparent"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="26"
                          className="text-primary"
                          strokeWidth="5"
                          strokeDasharray={2 * Math.PI * 26}
                          strokeDashoffset={2 * Math.PI * 26 * (1 - openAIAdvice.score / 100)}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-sm font-bold text-foreground">{openAIAdvice.score}%</span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground mt-2 uppercase tracking-wider">
                      Match Score
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Shop Matching Products</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recs.productMatches.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog to collect name and basic details */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl bg-card border border-border text-foreground rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Add Wardrobe Item</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Give your clothing item a name and specify its attributes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Image Preview Column */}
              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <div className="aspect-[3/4] w-full rounded-xl overflow-hidden shadow-product border border-border bg-muted flex items-center justify-center">
                  {pendingImage ? (
                    <img src={pendingImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Shirt className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Fields Column */}
              <div className="md:col-span-3 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={pendingName}
                    onChange={(e) => setPendingName(e.target.value)}
                    placeholder="e.g. Black Leather Jacket"
                    className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Category
                  </label>
                  <select
                    value={pendingCategory}
                    onChange={(e) => setPendingCategory(e.target.value as WardrobeItem["category"])}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    {categoryFilters.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Occasion
                  </label>
                  <select
                    value={pendingOccasion}
                    onChange={(e) => setPendingOccasion(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  >
                    {occasionOptions.map((occ) => (
                      <option key={occ} value={occ} className="capitalize">
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={pendingColor}
                      onChange={(e) => setPendingColor(e.target.value)}
                      className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={pendingColor}
                      onChange={(e) => setPendingColor(e.target.value)}
                      placeholder="#FFFFFF"
                      className="w-28 px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground outline-none text-center font-mono uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold rounded-lg gradient-primary text-white hover:opacity-90 transition-opacity"
              >
                Add to Wardrobe
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WardrobePage;
