/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { ProductDetails } from "./pages/ProductDetails";
import { Wishlist } from "./pages/Wishlist";
import { Admin } from "./pages/Admin";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { TrackOrder } from "./pages/TrackOrder";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Navbar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
