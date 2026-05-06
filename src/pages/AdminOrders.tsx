import { useState, useEffect } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { Order } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { ChevronDown, Package, Check, X, Clock, Truck } from "lucide-react";

export function AdminOrders() {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchOrders = async () => {
      try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, "orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [isAdmin]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status });
      setOrders(current => current.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updateTracking = async (orderId: string, trackingNumber: string, carrier: string = "Standard") => {
    try {
      await updateDoc(doc(db, "orders", orderId), { trackingNumber, shippingCarrier: carrier });
      setOrders(current => current.map(o => o.id === orderId ? { ...o, trackingNumber, shippingCarrier: carrier } : o));
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing': return <Package className="h-4 w-4 text-blue-500" />;
      case 'shipped': return <Truck className="h-4 w-4 text-indigo-500" />;
      case 'delivered': return <Check className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <X className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Orders Management</h2>
      {orders.length === 0 ? (
         <div className="bg-white p-8 text-center rounded-lg border border-gray-200">
           Customer orders will appear here.
         </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="p-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-900 truncate">Order #{order.id}</p>
                    <p className="text-xs text-gray-500 mt-1">{order.customerName} - {order.customerPhone}</p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex space-x-2">
                    <select 
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id!, e.target.value as any)}
                      className="text-sm border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 py-1 pl-2 pr-6"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500">
                      Amount: {order.totalAmount.toLocaleString()} YER
                    </p>
                    <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                      Address: {order.shippingAddress}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center text-sm sm:mt-0">
                    <StatusIcon status={order.status} />
                    <span className="ml-1 capitalize">{order.status}</span>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">Tracking Info</h4>
                  <div className="flex items-center space-x-2 max-w-sm">
                    <input 
                      type="text"
                      placeholder="Tracking Number"
                      defaultValue={order.trackingNumber || ""}
                      onBlur={(e) => {
                         if (e.target.value !== order.trackingNumber) {
                           updateTracking(order.id!, e.target.value);
                         }
                      }}
                      className="block w-full border-gray-300 rounded-md py-1 text-sm focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-4">
                   <p className="text-xs text-gray-500 mb-2">Items: {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
