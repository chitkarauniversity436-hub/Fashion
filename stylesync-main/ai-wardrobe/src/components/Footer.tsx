import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-foreground text-background/80 mt-12 sm:mt-16">
      <div className="container py-8 sm:py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        <div>
          <h4 className="font-display text-base sm:text-lg font-semibold text-background mb-3 sm:mb-4">StyleVault</h4>
          <p className="text-xs sm:text-sm leading-relaxed text-background/60">
            Your smart wardrobe companion. Discover, organize, and style your fashion.
          </p>
        </div>
        <div>
          <h5 className="font-semibold text-background mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wider">Shop</h5>
          <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Link to="/men" className="hover:text-background transition-colors">Men</Link>
            <Link to="/women" className="hover:text-background transition-colors">Women</Link>
          </div>
        </div>
        <div>
          <h5 className="font-semibold text-background mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wider">Features</h5>
          <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Link to="/wardrobe" className="hover:text-background transition-colors">My Wardrobe</Link>
            <Link to="/upload" className="hover:text-background transition-colors">Upload Clothes</Link>
            <span className="opacity-50">Virtual Try-On</span>
          </div>
        </div>
        <div>
          <h5 className="font-semibold text-background mb-2 sm:mb-3 text-xs sm:text-sm uppercase tracking-wider">Support</h5>
          <div className="flex flex-col gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <span className="cursor-pointer hover:text-background transition-colors">Contact Us</span>
            <span className="cursor-pointer hover:text-background transition-colors">FAQ</span>
            <span className="cursor-pointer hover:text-background transition-colors">Returns</span>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 py-3 sm:py-4">
        <p className="container text-center text-xs text-background/40">© 2026 StyleVault. All rights reserved.</p>
      </div>
    </footer>
  );
}
