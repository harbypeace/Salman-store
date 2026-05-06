import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    city: "",
  });

  const SHIPPING_COST = 2000; // Example flat shipping rate in YER
  const finalTotal = cartTotal + SHIPPING_COST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.id!,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      }));

      const newOrder = {
        userId: user?.uid || null,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        shippingAddress: `${formData.shippingAddress}, ${formData.city}`,
        totalAmount: finalTotal,
        status: "pending",
        items: orderItems,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "orders"), newOrder);
      
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: newOrder.customerName,
            customerEmail: newOrder.customerEmail,
            orderId: docRef.id,
            items: newOrder.items,
            totalAmount: newOrder.totalAmount
          })
        });
      } catch (err) {
        console.error("Failed to trigger confirmation email", err);
      }

      clearCart();
      
      // Navigate to order tracking page with the order ID as state or search param
      navigate(`/track-order?id=${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "orders");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-xl font-medium">Your cart is empty</h2>
        <button onClick={() => navigate("/")} className="mt-4 text-green-600 hover:text-green-500">
          Continue shopping &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-medium text-gray-900">Contact Information</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    id="customerEmail"
                    required
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    id="customerPhone"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-gray-900">Shipping Address</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700">Street Address</label>
                  <input
                    type="text"
                    id="shippingAddress"
                    required
                    value={formData.shippingAddress}
                    onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City / Governorate</label>
                  <input
                    type="text"
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Place Order (Cash on Delivery)"}
            </button>
          </form>
        </div>

        <div>
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li key={item.id} className="py-4 flex text-sm">
                  <img src={item.imageUrl} alt={item.name} referrerPolicy="no-referrer" className="h-16 w-16 rounded-md object-cover border border-gray-200" />
                  <div className="ml-4 flex-1 flex flex-col">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-gray-500">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-medium text-gray-900">{(item.price * item.quantity).toLocaleString()} YER</span>
                </li>
              ))}
            </ul>
            <div className="pt-4 border-t border-gray-200 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{cartTotal.toLocaleString()} YER</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">{SHIPPING_COST.toLocaleString()} YER</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                <span>Total</span>
                <span>{finalTotal.toLocaleString()} YER</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
