import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function WishlistPage() {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Heart className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-display font-semibold text-foreground">Your wishlist is empty</h2>
        <p className="text-sm text-muted-foreground">Save items you love for later</p>
        <Link to="/" className="mt-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Explore Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">My Wishlist ({items.length})</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-lg overflow-hidden border border-border group"
          >
            <div className="aspect-[3/4] overflow-hidden relative">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              <button
                onClick={() => removeFromWishlist(product.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card"
              >
                <Heart className="w-4 h-4 fill-primary text-primary" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{product.brand}</p>
              <h3 className="text-sm font-medium text-foreground mt-1 truncate">{product.name}</h3>
              <p className="text-sm font-bold text-foreground mt-1">${product.price}</p>
              <button
                onClick={() => { addToCart(product); toast.success("Added to cart"); }}
                className="w-full mt-2 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
              >
                <ShoppingBag className="w-3 h-3" /> Add to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
