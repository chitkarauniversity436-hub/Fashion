import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Heart, ShoppingBag, User, Menu, X } from "lucide-react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { HangerIcon } from "./HangerIcon";
import { useWishlist } from "@/context/WishlistContext";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Men", path: "/men" },
  { name: "Women", path: "/women" },
  { name: "Try On", path: "/tryon" },
];

const profileMenuItems = [
  { label: "My Profile", path: "/profile" },
  { label: "Settings", path: "/settings" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { items: wishlistItems } = useWishlist();
  const { signOut } = useAuth();

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-primary tracking-tight">StyleVault</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 text-sm tracking-wide uppercase rounded-md transition-colors font-sans whitespace-nowrap ${
                location.pathname === link.path
                  ? "text-primary bg-primary/5 font-semibold"
                  : "text-foreground/70 hover:text-foreground hover:bg-muted font-medium"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                        setSearchOpen(false);
                      }
                    }
                  }}
                  placeholder="Search products..."
                  className="w-full px-3 py-1.5 text-sm rounded-md bg-muted border-none outline-none focus:ring-2 focus:ring-ring font-sans"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => {
              if (searchOpen && searchQuery.trim()) {
                navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                setSearchOpen(false);
              } else {
                setSearchOpen((open) => !open);
              }
            }}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <Search className="w-5 h-5 text-foreground/70" />
          </button>

          <Link to="/wishlist" className="p-2 rounded-md hover:bg-muted transition-colors hidden sm:block relative" title="Wishlist">
            <Heart className="w-5 h-5 text-foreground/70" />
            {wishlistItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {wishlistItems.length}
              </span>
            )}
          </Link>

          <Link to="/wardrobe" className="p-2 rounded-md hover:bg-muted transition-colors hidden sm:block" title="Wardrobe">
            <HangerIcon className="w-5 h-5 text-foreground/70" />
          </Link>



          <div ref={profileRef} className="relative hidden sm:block">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              <User className="w-5 h-5 text-foreground/70" />
            </button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-44 rounded-lg bg-card border border-border shadow-lg py-1 z-50"
                >
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-sans font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      signOut();
                    }}
                    className="w-full text-left block px-4 py-2.5 text-sm font-sans font-medium text-red-500 hover:bg-muted hover:text-red-600 transition-colors"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-md hover:bg-muted md:hidden">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border overflow-hidden bg-card"
          >
            <div className="container py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileOpen(false)}
                  className={`px-4 py-3 rounded-md text-sm font-sans tracking-wide uppercase transition-colors ${
                    location.pathname === link.path
                      ? "text-primary bg-primary/5 font-semibold"
                      : "text-foreground/70 hover:bg-muted font-medium"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="border-t border-border mt-2 pt-2">
                {profileMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-sm font-sans font-medium text-foreground/70 hover:bg-muted rounded-md"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                  className="w-full text-left block px-4 py-3 text-sm font-sans font-medium text-red-500 hover:bg-muted rounded-md"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
