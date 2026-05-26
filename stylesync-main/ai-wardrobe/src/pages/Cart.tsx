import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useOrders, ShippingAddress, Order } from "@/context/OrderContext";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { createOrder } = useOrders();
  const [successMessage, setSuccessMessage] = useState("");
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    landmark: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<Order["paymentMethod"]>("Cash on Delivery");
  const [deliveryType, setDeliveryType] = useState<Order["deliveryType"]>("Standard");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const canPlaceOrder = useMemo(() => items.length > 0 && address.fullName && address.phone && address.email && address.addressLine1 && address.city && address.state && address.zip && address.country, [items, address]);

  const handlePlaceOrder = () => {
    if (!canPlaceOrder) {
      setFormError("Please complete your shipping details before placing the order.");
      return;
    }

    const order = createOrder(items, totalPrice, address, paymentMethod, deliveryType, notes);
    if (!order) return;

    clearCart();
    setSuccessMessage(`Order ${order.id} placed successfully!`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/40" />
        <h2 className="text-xl font-display font-semibold text-foreground">
          {successMessage ? "Order placed successfully" : "Your cart is empty"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {successMessage
            ? `${successMessage} Your order is now saved to My Orders.`
            : "Start adding items to your cart"}
        </p>
        <Link to="/" className="mt-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          {successMessage ? "View Orders" : "Continue Shopping"}
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Shopping Cart ({items.length})</h1>
          <p className="text-sm text-muted-foreground">Review your items and complete your shipping details.</p>
        </div>
        <button onClick={clearCart} className="text-sm text-destructive hover:underline font-sans">Clear All</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1.2fr]">
        <div className="space-y-4">
        {items.map((item) => (
          <motion.div
            key={item.product.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border border-border"
          >
            <img src={item.product.image} alt={item.product.name} className="w-full sm:w-24 h-48 sm:h-32 object-cover rounded-md" />
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.product.brand}</p>
                <h3 className="text-sm font-medium text-foreground mt-0.5">{item.product.name}</h3>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1 rounded border border-border hover:bg-muted">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1 rounded border border-border hover:bg-muted">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-sm font-bold text-foreground">${item.product.price * item.quantity}</span>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-6 bg-card rounded-lg border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Shipping Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Full name</span>
              <input
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Name on delivery"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Email</span>
              <input
                type="email"
                value={address.email}
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Phone</span>
              <input
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="+91 98765 43210"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Pincode</span>
              <input
                value={address.zip}
                onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="560001"
              />
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">Address</span>
              <input
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="House number, street, area"
              />
            </label>
            <label className="space-y-2 text-sm sm:col-span-2">
              <span className="font-medium text-foreground">Landmark</span>
              <input
                value={address.landmark}
                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Nearby landmark (optional)"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">City</span>
              <input
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Bengaluru"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">State</span>
              <input
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Karnataka"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Country</span>
              <input
                value={address.country}
                onChange={(e) => setAddress({ ...address, country: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="India"
              />
            </label>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">Delivery & Payment</h2>
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Delivery type</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: "Standard", label: "Standard Delivery" },
                  { value: "Express", label: "Express Delivery" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDeliveryType(option.value as Order["deliveryType"])}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium ${deliveryType === option.value ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Payment method</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "Cash on Delivery",
                  "Credit / Debit Card",
                  "UPI",
                ].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method as Order["paymentMethod"])}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium ${paymentMethod === method ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground"}`}>
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-foreground">Additional order notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="Leave delivery instructions or order notes"
              />
            </label>
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border border-border">
          <div className="flex justify-between items-center text-lg font-display font-bold text-foreground mb-4">
            <span>Order total</span>
            <span>${totalPrice}</span>
          </div>
          {formError && <p className="text-sm text-destructive mb-4">{formError}</p>}
          <button
            onClick={handlePlaceOrder}
            className="w-full py-3 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Place Order
          </button>
          {successMessage && (
            <p className="mt-4 text-sm text-foreground/80">{successMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
