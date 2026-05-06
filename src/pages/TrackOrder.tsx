import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Order } from "../types";
import { Package, Truck, CheckCircle2, Clock, Search } from "lucide-react";

export function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get("id") || "";
  const [orderId, setOrderId] = useState(initialId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchOrder = async (idToFetch: string) => {
    if (!idToFetch.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const docRef = doc(db, "orders", idToFetch.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() } as Order);
        setSearchParams({ id: idToFetch.trim() });
      } else {
        setError("Order not found. Please check your tracking number and try again.");
      }
    } catch (err: any) {
      if (err.message && err.message.includes("permission")) {
         setError("Order not found or access denied.");
      } else {
         setError("An error occurred while fetching your order.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId && !order && !loading && !error) {
      fetchOrder(initialId);
    }
  }, [initialId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderId);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending": return { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-100", label: "Pending Confirmation" };
      case "processing": return { icon: Package, color: "text-blue-500", bg: "bg-blue-100", label: "Processing Order" };
      case "shipped": return { icon: Truck, color: "text-indigo-500", bg: "bg-indigo-100", label: "Shipped" };
      case "delivered": return { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100", label: "Delivered" };
      case "cancelled": return { icon: Clock, color: "text-red-500", bg: "bg-red-100", label: "Cancelled" };
      default: return { icon: Clock, color: "text-gray-500", bg: "bg-gray-100", label: "Unknown" };
    }
  };

  const steps = ["pending", "processing", "shipped", "delivered"];
  const currentStepIndex = order ? steps.indexOf(order.status) : -1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Track Your Order</h1>
        <p className="mt-2 text-sm text-gray-500">Enter your order ID below to check its current shipping status.</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-10 flex gap-2 justify-center max-w-md mx-auto">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            required
            placeholder="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? "Tracking..." : "Track"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {order && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Order #{order.id}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Placed on {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Recently'}
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-8">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Tracking Status</h4>
              {order.status === 'cancelled' ? (
                <div className="bg-red-50 rounded-md p-4 text-red-700 flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  This order was cancelled.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-between">
                    {steps.map((step, stepIdx) => {
                      const isCompleted = currentStepIndex >= stepIdx;
                      const isCurrent = currentStepIndex === stepIdx;
                      const Info = getStatusInfo(step);
                      const Icon = Info.icon;
                      
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <span className={`relative flex h-10 w-10 items-center justify-center rounded-full ${isCompleted ? Info.bg : 'bg-gray-100'} ${isCurrent ? 'ring-4 ring-white' : ''}`}>
                            <Icon className={`h-6 w-6 ${isCompleted ? Info.color : 'text-gray-400'}`} aria-hidden="true" />
                          </span>
                          <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                            {Info.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {order.trackingNumber && (
              <div className="bg-gray-50 rounded-md p-4 mb-8 border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900">Shipping Details</h4>
                <div className="mt-2 text-sm text-gray-600">
                  <p><span className="font-medium">Carrier:</span> {order.shippingCarrier || 'Standard Delivery'}</p>
                  <p><span className="font-medium">Tracking Number:</span> {order.trackingNumber}</p>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-5">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Order Details</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Customer</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.customerName}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.customerPhone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Shipping Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">{order.shippingAddress}</dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-gray-200 pt-5 mt-5">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Items</h4>
              <ul className="divide-y divide-gray-200">
                {order.items.map((item, idx) => (
                  <li key={idx} className="py-3 flex justify-between text-sm">
                    <div className="flex">
                      <span className="text-gray-500 w-6">{item.quantity}x</span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                    </div>
                    <span className="text-gray-900">{(item.price * item.quantity).toLocaleString()} YER</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 flex justify-between text-base font-bold text-gray-900 mt-2">
                <span>Total</span>
                <span>{order.totalAmount.toLocaleString()} YER</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
