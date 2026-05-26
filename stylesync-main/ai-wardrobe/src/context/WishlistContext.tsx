import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "@/data/products";
import { useAuth } from "./AuthContext";
import { api, mapProduct } from "../lib/api";

interface WishlistContextType {
  items: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth() as any;
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    async function syncAndLoadWishlist() {
      if (!user) {
        setItems([]);
        return;
      }

      if (user.isGuest) {
        const saved = localStorage.getItem(`stylesync_wishlist_${user.id || user.email}`);
        setItems(saved ? JSON.parse(saved) : []);
      } else {
        try {
          // Check for any guest wishlist items to sync
          const guestKeys = [`stylesync_wishlist_demo-user-1`, `stylesync_wishlist_guest`];
          let guestItems: Product[] = [];
          for (const key of guestKeys) {
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                  guestItems = [...guestItems, ...parsed];
                }
              } catch (e) {
                console.error("Error parsing guest wishlist:", e);
              }
              localStorage.removeItem(key);
            }
          }

          if (guestItems.length > 0) {
            console.log("Syncing guest wishlist items to Supabase:", guestItems);
            // Deduplicate items
            const uniqueGuestItems = guestItems.filter(
              (item, index, self) => self.findIndex((t) => t.id === item.id) === index
            );
            for (const item of uniqueGuestItems) {
              try {
                await api.addToWishlist(user.id, item.id);
              } catch (e) {
                console.error(`Failed to sync wishlist item ${item.id} to Supabase:`, e);
              }
            }
          }

          // Load wishlist from Supabase
          const response = await api.getWishlist(user.id);
          const mapped = (response.products || []).map(mapProduct);
          setItems(mapped);
        } catch (error) {
          console.error("Failed to fetch wishlist from Supabase:", error);
          const saved = localStorage.getItem(`stylesync_wishlist_${user.id || user.email}`);
          setItems(saved ? JSON.parse(saved) : []);
        }
      }
    }

    syncAndLoadWishlist();
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`stylesync_wishlist_${user.id || user.email}`, JSON.stringify(items));
    }
  }, [items, user]);

  const addToWishlist = async (product: Product) => {
    // Optimistic update
    setItems((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]));

    if (user && !user.isGuest) {
      try {
        await api.addToWishlist(user.id, product.id);
      } catch (error) {
        console.error("Failed to add to database wishlist:", error);
        // Rollback
        setItems((prev) => prev.filter((p) => p.id !== product.id));
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    const originalItem = items.find((p) => p.id === productId);
    // Optimistic update
    setItems((prev) => prev.filter((p) => p.id !== productId));

    if (user && !user.isGuest) {
      try {
        await api.removeFromWishlist(user.id, productId);
      } catch (error) {
        console.error("Failed to remove from database wishlist:", error);
        // Rollback
        if (originalItem) {
          setItems((prev) => [...prev, originalItem]);
        }
      }
    }
  };

  const isInWishlist = (productId: string) => items.some((p) => p.id === productId);

  const toggleWishlist = (product: Product) => {
    isInWishlist(product.id) ? removeFromWishlist(product.id) : addToWishlist(product);
  };

  return (
    <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
