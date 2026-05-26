import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OrderProvider } from "@/context/OrderContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/Auth";
import Index from "./pages/Index";
import MenPage from "./pages/Men";
import WomenPage from "./pages/Women";
import WardrobePage from "./pages/Wardrobe";
import UploadPage from "./pages/Upload";
import TryOnPage from "./pages/TryOn";
import CartPage from "./pages/Cart";
import WishlistPage from "./pages/Wishlist";
import ProfilePage from "./pages/Profile";
import OrdersPage from "./pages/Orders";
import SettingsPage from "./pages/Settings";
import SearchResults from "./pages/SearchResults";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <>
        <Toaster />
        <Sonner />
        <AuthPage />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/men" element={<MenPage />} />
        <Route path="/women" element={<WomenPage />} />
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/tryon" element={<TryOnPage />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrderProvider>
        <TooltipProvider>
          <CartProvider>
            <WishlistProvider>
              <ProfileProvider>
                <Toaster />
                <Sonner />
                <AppContent />
              </ProfileProvider>
            </WishlistProvider>
          </CartProvider>
        </TooltipProvider>
      </OrderProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
