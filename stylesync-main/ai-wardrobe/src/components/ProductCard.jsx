import { Heart, Star, Sparkles } from "lucide-react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

export function ProductCard({ product, index = 0 }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const liked = isInWishlist(product.id);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const placeholderImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="400" height="500" fill="#f3f4f6"/><rect x="40" y="40" width="320" height="420" rx="24" fill="#e5e7eb" stroke="#d1d5db" stroke-width="4"/><text x="200" y="248" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#6b7280">No Image</text></svg>'
    );
  const [imgSrc, setImgSrc] = useState(product.image || placeholderImage);

  // Debug logging
  console.log("ProductCard product:", product.name, "image:", product.image);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="group relative bg-card rounded-lg overflow-hidden shadow-product hover:shadow-product-hover transition-shadow duration-300"
    >
      {product.matchScore ? (
        <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md flex items-center gap-1">
          <Sparkles className="w-3 h-3 animate-pulse" />
          AI MATCH {product.matchScore}%
        </span>
      ) : (
        product.badge && (
          <span
            className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded text-xs font-semibold text-primary-foreground ${
              product.badge === "SALE"
                ? "bg-destructive"
                : product.badge === "NEW"
                ? "bg-emerald-500"
                : "gradient-primary"
            }`}
          >
            {product.badge}
          </span>
        )
      )}

      <button
        onClick={() => { toggleWishlist(product); toast(liked ? "Removed from wishlist" : "Added to wishlist"); }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
      >
        <Heart className={`w-4 h-4 ${liked ? "fill-primary text-primary" : "text-foreground/50"}`} />
      </button>

      <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden bg-muted rounded-lg">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(event) => {
              console.log("Image failed to load:", imgSrc, "falling back to placeholder");
              event.currentTarget.src = placeholderImage;
              setImgSrc(placeholderImage);
            }}
            onLoad={() => console.log("Image loaded successfully:", imgSrc)}
          />
        </Link>
      </div>

      <div className="p-3 sm:p-4">
        <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">{product.brand}</p>
        <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight max-h-[3rem] overflow-hidden">{product.name}</h3>

        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-gold text-gold" />
          <span className="text-xs font-medium text-foreground">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviews})</span>
        </div>

        {product.aiReason && (
          <div className="mt-2 p-2 bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <p className="text-[10px] leading-relaxed text-violet-600 dark:text-violet-400 font-medium italic flex gap-1 items-start">
              <span>✨</span>
              <span>{product.aiReason}</span>
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm sm:text-base font-bold text-foreground">${product.price}</span>
          {product.originalPrice && (
            <>
              <span className="text-xs text-muted-foreground line-through">${product.originalPrice}</span>
              <span className="text-xs font-semibold text-primary">({discount}% off)</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 sm:mt-4 gap-3">
          <div className="flex gap-1">
            {product.colors.slice(0, 4).map((color, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full border border-border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Link
            to={`/tryon?clothing_url=${encodeURIComponent(product.image)}&clothing_name=${encodeURIComponent(product.name)}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary transition hover:bg-primary/15 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try On
          </Link>
          <a
            href={product.productUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-foreground px-3 py-2.5 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 transition-colors"
          >
            Buy Now
          </a>
        </div>
      </div>
    </motion.div>
  );
}
