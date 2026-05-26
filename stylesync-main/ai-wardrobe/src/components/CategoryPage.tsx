import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { api } from "@/lib/api";
import { shuffleArray } from "@/lib/shuffle";

interface CategoryPageProps {
  category: "men" | "women" | "kids";
  title: string;
  subtitle: string;
}

export function CategoryPage({ category, title, subtitle }: CategoryPageProps) {
  const [displayProducts, setDisplayProducts] = useState([]);
  const [allSubcategories, setAllSubcategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Fetch all products once to get all available subcategories
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts({ gender: category, limit: 100 }) as any[];
        const uniqueSubcategories = [...new Set(data.map((p) => p.subcategory).filter(Boolean))] as string[];
        setAllSubcategories(uniqueSubcategories.sort());
        setError(null);
      } catch (err) {
        console.error(`Failed to fetch ${category} products:`, err);
        setError((err as Error).message);
        setAllSubcategories([]);
      }
    };

    fetchAllProducts();
  }, [category]);

  // Fetch products based on selected subcategory
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await api.getProducts({
          gender: category,
          subcategory: selectedSubcategory || undefined,
          limit: 50,
        });
        setDisplayProducts(shuffleArray(data));
        setError(null);
      } catch (err) {
        console.error(`Failed to fetch ${category} products:`, err);
        setError((err as Error).message);
        setDisplayProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category, selectedSubcategory]);

  return (
    <div className="container py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{subtitle}</p>
      </div>

      {/* Subcategory pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 sm:mb-8 scrollbar-hide">
        <button
          onClick={() => setSelectedSubcategory(null)}
          className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
            selectedSubcategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          All
        </button>
        {allSubcategories.map((sub) => (
          <button
            key={sub}
            onClick={() => setSelectedSubcategory(sub)}
            className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap capitalize transition-colors ${
              selectedSubcategory === sub
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {sub}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <Loader className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          Failed to load products: {error}
        </div>
      ) : displayProducts.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No products found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
