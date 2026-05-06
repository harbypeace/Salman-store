import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, ShoppingCart, User, Heart, Settings } from "lucide-react";

export function Navbar() {
  const { user, isAdmin, signInWithGoogle, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between p-4 px-6">
        <Link to="/" className="flex items-center space-x-2">
          <ShoppingCart className="h-6 w-6 text-green-600" />
          <span className="text-xl font-bold tracking-tight text-gray-900">WhatsAppStore</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/wishlist" className="p-2 text-gray-600 hover:text-green-600 transition-colors">
            <Heart className="h-5 w-5" />
          </Link>
          
          {isAdmin && (
            <Link to="/admin" className="p-2 text-gray-600 hover:text-green-600 transition-colors">
              <Settings className="h-5 w-5" />
            </Link>
          )}

          {user ? (
            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="flex items-center space-x-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center space-x-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
