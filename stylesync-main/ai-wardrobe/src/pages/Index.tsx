import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Upload, Shirt, Loader } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { shuffleArray } from "@/lib/shuffle";
import { categoryCards } from "@/data/categoryCards";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        console.log("Fetching products...");
        const data = await api.getProducts({ limit: 24 });
        console.log("Fetched products:", data.length);
        setProducts(shuffleArray(data));
        setError(null);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(err.message);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const featuredCategories = categoryCards;

  const trending = useMemo(
    () => products.slice(0, 8),
    [products]
  );

  const onSale = useMemo(
    () =>
      products
        .filter((p) => p.badge === "SALE" || (typeof p.originalPrice === "number" && p.originalPrice > p.price))
        .slice(0, 4),
    [products]
  );

  const saleItems = onSale;

  const displayProducts = useMemo(
    () => products.slice(0, 3),
    [products]
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[70vh] md:h-[80vh] overflow-hidden">
        <img
          src={heroBanner}
          alt="Fashion collection hero"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
        <div className="relative container h-full flex items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-lg"
          >
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-primary-foreground text-xs font-semibold mb-4">
              <Sparkles className="w-3 h-3" /> AI-Powered Styling
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight">
              Your Smart <br />
              <span className="text-gold">Wardrobe</span> Awaits
            </h1>
            <p className="mt-4 text-primary-foreground/80 text-sm sm:text-base md:text-lg max-w-md">
              Upload your clothes, get AI-powered outfit recommendations, and discover matching products.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link
                to="/wardrobe"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <Shirt className="w-4 h-4" /> Open Wardrobe
              </Link>
              <Link
                to="/tryon"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-foreground/10 backdrop-blur-sm text-primary-foreground border border-primary-foreground/20 font-semibold text-sm hover:bg-primary-foreground/20 transition-colors"
              >
                <Upload className="w-4 h-4" /> Try On
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="font-display text-2xl font-bold text-foreground">Shop by Category</h2>
          {loading || error ? null : <span className="text-sm text-muted-foreground">Men and women picks</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-muted/50 aspect-[3/4]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Could not load categories from API.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {featuredCategories.map((cat, i) => (
              <Link key={cat.name} to={cat.path}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-muted"
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.src =
                        "data:image/svg+xml;utf8," +
                        encodeURIComponent(
                          '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f3f4f6"/><rect x="40" y="40" width="320" height="420" rx="24" fill="#e5e7eb" stroke="#d1d5db" stroke-width="4"/><text x="200" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">No Image</text></svg>'
                        );
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="font-display text-xl font-bold text-primary-foreground">{cat.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs text-primary-foreground/80 mt-1">
                      Explore <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">Trending Now</h2>
          <Link to="/women" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-96">
            <Loader className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
            Failed to load products: {error}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {trending.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* AI Feature Banner */}
      <section className="container py-12">
        <div className="gradient-hero rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Sparkles className="w-3 h-3" /> AI Styling
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Get Outfit Recommendations
            </h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Upload a clothing item and our AI will suggest matching pieces from your wardrobe and our catalog.
            </p>
            <Link
              to="/tryon"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Try On <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full md:w-80">
            {displayProducts.map((p) => (
              <div key={p.id} className="aspect-[3/4] rounded-lg overflow-hidden shadow-product">
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* On Sale */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold text-foreground">On Sale 🔥</h2>
        </div>
        {saleItems.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
            No sale items available currently.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
            {saleItems.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
