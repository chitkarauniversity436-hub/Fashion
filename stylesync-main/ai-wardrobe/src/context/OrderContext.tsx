import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { CartItem } from "@/context/CartContext";

export interface OrderItem {
  name: string;
  brand: string;
  price: number;
  image: string;
  quantity: number;
  requestStatus: "None" | "Return Requested" | "Exchange Requested" | "Returned" | "Exchanged";
}

export interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  landmark?: string;
}

export interface Order {
  id: string;
  date: string;
  status: "Processing" | "In Transit" | "Delivered";
  total: number;
  paymentMethod: "Credit / Debit Card" | "Cash on Delivery" | "UPI" | "Net Banking";
  deliveryType: "Standard" | "Express";
  shippingAddress: ShippingAddress;
  notes?: string;
  items: OrderItem[];
}

interface OrderContextType {
  orders: Order[];
  createOrder: (items: CartItem[], total: number, address: ShippingAddress, paymentMethod: Order["paymentMethod"], deliveryType: Order["deliveryType"], notes?: string) => Order | null;
  requestReturn: (orderId: string, itemIndex: number) => void;
  requestExchange: (orderId: string, itemIndex: number) => void;
  clearOrders: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);
const ORDERS_KEY = "orders";

const normalizeOrder = (raw: any): Order => ({
  id: raw?.id ?? `ORD-${Date.now()}`,
  date: raw?.date ?? new Date().toISOString(),
  status: raw?.status ?? "Processing",
  total: Number(raw?.total ?? 0),
  paymentMethod: raw?.paymentMethod ?? "Cash on Delivery",
  deliveryType: raw?.deliveryType ?? "Standard",
  shippingAddress: {
    fullName: raw?.shippingAddress?.fullName ?? "",
    email: raw?.shippingAddress?.email ?? "",
    phone: raw?.shippingAddress?.phone ?? "",
    addressLine1: raw?.shippingAddress?.addressLine1 ?? "",
    addressLine2: raw?.shippingAddress?.addressLine2,
    city: raw?.shippingAddress?.city ?? "",
    state: raw?.shippingAddress?.state ?? "",
    zip: raw?.shippingAddress?.zip ?? "",
    country: raw?.shippingAddress?.country ?? "India",
    landmark: raw?.shippingAddress?.landmark,
  },
  notes: raw?.notes ?? "",
  items: Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        name: item?.name ?? "Unknown",
        brand: item?.brand ?? "",
        price: Number(item?.price ?? 0),
        image: item?.image ?? "",
        quantity: Number(item?.quantity ?? 1),
        requestStatus: item?.requestStatus ?? "None",
      }))
    : [],
});

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.map(normalizeOrder) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }, [orders]);

  const createOrder = (
    items: CartItem[],
    total: number,
    address: ShippingAddress,
    paymentMethod: Order["paymentMethod"],
    deliveryType: Order["deliveryType"],
    notes?: string
  ) => {
    if (items.length === 0) return null;

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      date: new Date().toISOString(),
      status: "Processing",
      total,
      paymentMethod,
      deliveryType,
      shippingAddress: address,
      notes,
      items: items.map((item) => ({
        name: item.product.name,
        brand: item.product.brand,
        price: item.product.price,
        image: item.product.image,
        quantity: item.quantity,
        requestStatus: "None",
      })),
    };

    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const updateItemStatus = (orderId: string, itemIndex: number, status: OrderItem["requestStatus"]) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id !== orderId
          ? order
          : {
              ...order,
              items: order.items.map((item, idx) =>
                idx !== itemIndex ? item : { ...item, requestStatus: status }
              ),
            }
      )
    );
  };

  const requestReturn = (orderId: string, itemIndex: number) => {
    updateItemStatus(orderId, itemIndex, "Return Requested");
  };

  const requestExchange = (orderId: string, itemIndex: number) => {
    updateItemStatus(orderId, itemIndex, "Exchange Requested");
  };

  const clearOrders = () => setOrders([]);

  return (
    <OrderContext.Provider value={{ orders, createOrder, requestReturn, requestExchange, clearOrders }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
