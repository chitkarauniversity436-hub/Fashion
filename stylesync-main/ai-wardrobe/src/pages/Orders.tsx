import { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { Package, Truck, CheckCircle, Clock, RotateCcw, ArrowRight, RefreshCcw } from "lucide-react";
import { useOrders } from "@/context/OrderContext";

const getStatusIcon = (status) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "In Transit":
      return <Truck className="w-4 h-4 text-blue-500" />;
    case "Processing":
      return <Clock className="w-4 h-4 text-orange-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Delivered":
      return "text-green-600 bg-green-50";
    case "In Transit":
      return "text-blue-600 bg-blue-50";
    case "Processing":
      return "text-orange-600 bg-orange-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
};

export default function OrdersPage() {
  const { orders, requestReturn, requestExchange } = useOrders();

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">My Orders</h1>
            <p className="text-muted-foreground">Track and manage your order history</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">You haven't placed any orders yet. Start shopping to see your order history here.</p>
            <Link
              to="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-card rounded-lg border border-border p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">Order #{order.id}</h3>
                    <p className="text-sm text-muted-foreground">Placed on {new Date(order.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">Delivery: {order.deliveryType} · Payment: {order.paymentMethod}</p>
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[2fr_1fr] mb-6">
                  <div className="space-y-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="grid gap-4 sm:grid-cols-[auto_1fr] items-center rounded-2xl border border-border p-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 rounded-xl object-cover"
                          onError={(e: SyntheticEvent<HTMLImageElement, Event>) => {
                            e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEgyNFYyNEgyMFYyMFoiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTIwIDI0SDI0VjI4SDIwVjI0WiIgZmlsbD0iIzlDQTREQSIvPgo8L3N2Zz4=";
                          }}
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.brand}</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">${item.price * item.quantity}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>Qty {item.quantity}</span>
                            <span className="px-2 py-1 rounded-full bg-muted/70 text-muted-foreground">{item.requestStatus}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => requestReturn(order.id, index)}
                              disabled={item.requestStatus !== "None" || order.status !== "Delivered"}
                              className="rounded-full border border-border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                            >
                              <RefreshCcw className="inline-block w-3 h-3 mr-1" /> Request Return
                            </button>
                            <button
                              onClick={() => requestExchange(order.id, index)}
                              disabled={item.requestStatus !== "None" || order.status !== "Delivered"}
                              className="rounded-full border border-border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
                            >
                              <RotateCcw className="inline-block w-3 h-3 mr-1" /> Request Exchange
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-border bg-muted p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Shipping address</h4>
                    <p className="text-sm text-foreground">{order.shippingAddress.fullName}</p>
                    <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine1}</p>
                    {order.shippingAddress.addressLine2 && <p className="text-sm text-muted-foreground">{order.shippingAddress.addressLine2}</p>}
                    {order.shippingAddress?.landmark && <p className="text-sm text-muted-foreground">Landmark: {order.shippingAddress.landmark}</p>}
                    <p className="text-sm text-muted-foreground">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p>
                    <p className="text-sm text-muted-foreground">{order.shippingAddress?.country}</p>
                    <p className="text-sm text-muted-foreground mt-3">Phone: {order.shippingAddress?.phone}</p>
                    <p className="text-sm text-muted-foreground">Email: {order.shippingAddress?.email}</p>
                    {order.notes && (
                      <div className="mt-4 rounded-xl bg-background p-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground mb-1">Order notes</p>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">${order.total}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
                      <ArrowRight className="w-4 h-4" /> View Details
                    </button>
                    {order.status === "Delivered" && (
                      <button className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        Buy Again
                      </button>
                    )}
                  </div>
                </div>
              </div>

            ))}
          </div>
        )}
      </div>
    </div>
  );
}