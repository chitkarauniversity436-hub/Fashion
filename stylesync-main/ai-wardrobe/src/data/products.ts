export interface Review {
  id: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  description?: string;
  sizes?: string[];
  category: "men" | "women" | "kids";
  subcategory: string;
  colors: string[];
  rating: number;
  reviews: number;
  reviewsData?: Review[];
  badge?: "NEW" | "SALE" | "TRENDING";
}

export interface WardrobeItem {
  id: string;
  image: string;
  name: string;
  category: "topwear" | "bottomwear" | "footwear" | "accessories" | "ethnic";
  color: string;
  dateAdded: string;
}

export const products: Product[] = [];

export const categories = [
  { name: "Men", path: "/men", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop" },
  { name: "Women", path: "/women", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=400&fit=crop" },
  { name: "Wardrobe", path: "/wardrobe", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=300&h=400&fit=crop" },
];

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
