import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingBag, Star, ThumbsUp, MessageSquare, Filter, X, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { toast } from "sonner";

const ProductDetail = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewUserName, setReviewUserName] = useState("");
  
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Load persisted reviews for this product
  const loadPersistedReviews = (productId) => {
    try {
      const persistedReviews = localStorage.getItem(`product_reviews_${productId}`);
      return persistedReviews ? JSON.parse(persistedReviews) : [];
    } catch (error) {
      console.error('Error loading persisted reviews:', error);
      return [];
    }
  };

  // Save reviews to localStorage
  const savePersistedReviews = (productId, reviews) => {
    try {
      localStorage.setItem(`product_reviews_${productId}`, JSON.stringify(reviews));
    } catch (error) {
      console.error('Error saving persisted reviews:', error);
    }
  };

  useEffect(() => {
    if (!productId) return;
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const result = await api.getProductById(productId);
        
        // Load persisted reviews for this product
        const persistedReviews = loadPersistedReviews(productId);
        
        // Merge original reviews with persisted ones
        const originalReviews = result.reviewsData || [];
        const allReviews = [...originalReviews, ...persistedReviews];
        
        // Calculate updated rating and review count
        const totalReviews = allReviews.length;
        const averageRating = totalReviews > 0 
          ? allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
          : result.rating;
        
        const updatedProduct = {
          ...result,
          reviewsData: allReviews,
          reviews: totalReviews,
          rating: Number(averageRating.toFixed(1))
        };
        
        setProduct(updatedProduct);
        setSelectedSize((updatedProduct.sizes || ["S", "M", "L", "XL"])[0]);
        setError(null);
      } catch (err) {
        console.error(`Failed to load product details for ${productId}:`, err);
        setError(err.message || "Unable to load product");
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="container py-20 text-center text-primary">
        Loading product details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-20 rounded-2xl border border-destructive bg-destructive/10 text-destructive text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 mt-4 px-5 py-2 rounded-full border border-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="container py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to shop
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-card">
          <img src={product.image} alt={product.name} className="w-full h-[400px] sm:h-[500px] lg:h-[520px] object-cover rounded-3xl shadow-lg" loading="lazy" />
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border p-6 bg-card shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-primary text-xs font-semibold">
                  {product.category?.toUpperCase()} / {product.subcategory?.toUpperCase()}
                </div>
                <h1 className="text-3xl font-display font-bold text-foreground">{product.name}</h1>
                <p className="text-sm text-muted-foreground">{product.brand}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                  <Star className="w-4 h-4 text-gold" />
                  {product.rating}
                </div>
                <span className="text-sm text-muted-foreground">{product.reviews} reviews</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-foreground">${product.price}</span>
                {product.originalPrice && (
                  <span className="text-sm text-muted-foreground line-through">${product.originalPrice}</span>
                )}
              </div>

              <p className="text-sm leading-7 text-muted-foreground">{product.description || "This premium product combines quality, comfort, and style for every wardrobe."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Available Sizes</h2>
            <div className="flex flex-wrap gap-3">
              {(product.sizes || ["S", "M", "L", "XL"]).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selectedSize === size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            {selectedSize && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected size: <span className="font-medium text-foreground">{selectedSize}</span>
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Product Details</h2>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium text-foreground capitalize">{product.category}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Subcategory</span>
                <span className="text-sm font-medium text-foreground capitalize">{product.subcategory}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                <span className="text-sm text-muted-foreground">Brand</span>
                <span className="text-sm font-medium text-foreground">{product.brand}</span>
              </div>
              {product.badge && (
                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Badge</span>
                  <span className="text-sm font-medium text-foreground">{product.badge}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to={`/tryon?clothing_url=${encodeURIComponent(product.image)}&clothing_name=${encodeURIComponent(product.name)}&autogenerate=true`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors"
            >
              <Sparkles className="w-4 h-4" /> Try On (Virtual fitting)
            </Link>
            <a 
              href={product.productUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Buy Now
            </a>
            <button 
              onClick={() => {
                toggleWishlist(product);
                toast(isInWishlist(product.id) ? "Removed from wishlist" : "Added to wishlist");
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors ${
                isInWishlist(product.id)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} /> 
              {isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
            </button>
          </div>

          {/* Reviews Section */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Customer Reviews</h2>
              <button 
                onClick={() => setShowReviewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Write a Review
              </button>
            </div>

            {/* Rating Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground mb-2">{product.rating}</div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.floor(product.rating)
                          ? "fill-gold text-gold"
                          : star - 0.5 <= product.rating
                          ? "fill-gold/50 text-gold"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{product.reviews} reviews</p>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const reviewsData = product.reviewsData || [];
                  const count = reviewsData.filter(review => review.rating === rating).length;
                  const percentage = reviewsData.length > 0 ? Math.round((count / reviewsData.length) * 100) : 0;
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">{rating}★</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="bg-gold h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Individual Reviews */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Recent Reviews</h3>
                <button className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
                  <Filter className="w-4 h-4" />
                  Sort by
                </button>
              </div>

              {product.reviewsData && product.reviewsData.length > 0 ? (
                product.reviewsData.map((review) => (
                  <div key={review.id} className="border-b border-border pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-medium text-foreground">
                          {review.userName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-foreground">{review.userName}</span>
                          {review.verified && (
                            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating ? "fill-gold text-gold" : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">{review.date}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-3">{review.comment}</p>
                        <button className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-border text-sm hover:bg-muted transition-colors">
                          <ThumbsUp className="w-4 h-4" />
                          Helpful ({review.helpful})
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No reviews yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Be the first to share your thoughts about this product</p>
                  <button 
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    Write the first review
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Write a Review</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
                  <input
                    type="text"
                    value={reviewUserName}
                    onChange={(e) => setReviewUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= reviewRating ? "fill-gold text-gold" : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Your Review</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Share your thoughts about this product..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!reviewUserName.trim() || !reviewComment.trim()) {
                        toast.error("Please fill in all fields");
                        return;
                      }
                      
                      // Create new review
                      const newReview = {
                        id: `r${Date.now()}`,
                        userName: reviewUserName.trim(),
                        rating: reviewRating,
                        comment: reviewComment.trim(),
                        date: new Date().toISOString().split('T')[0],
                        verified: false, // New reviews are not verified by default
                        helpful: 0
                      };
                      
                      // Add review to current product state
                      const updatedReviews = product.reviewsData ? [...product.reviewsData, newReview] : [newReview];
                      const totalReviews = updatedReviews.length;
                      const averageRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
                      
                      const updatedProduct = {
                        ...product,
                        reviewsData: updatedReviews,
                        reviews: totalReviews,
                        rating: Number(averageRating.toFixed(1))
                      };
                      
                      setProduct(updatedProduct);
                      
                      // Persist the new review to localStorage
                      const existingPersistedReviews = loadPersistedReviews(productId);
                      const updatedPersistedReviews = [...existingPersistedReviews, newReview];
                      savePersistedReviews(productId, updatedPersistedReviews);
                      
                      toast.success("Review submitted successfully!");
                      setShowReviewModal(false);
                      setReviewUserName("");
                      setReviewComment("");
                      setReviewRating(5);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Submit Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
