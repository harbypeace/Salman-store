import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Product } from "../types";
import { ProductCard } from "../components/ProductCard";

export function Wishlist() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchWishlist = async () => {
      try {
        const q = query(collection(db, "users", user.uid, "wishlist"), orderBy("addedAt", "desc"));
        const snapshot = await getDocs(q);
        
        const productsMap: Product[] = [];
        for (const wishlistDoc of snapshot.docs) {
          const pId = wishlistDoc.data().productId;
          const pRef = doc(db, "products", pId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            productsMap.push({ id: pSnap.id, ...pSnap.data() } as Product);
          }
        }
        
        setWishlistProducts(productsMap);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/wishlist`);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Wishlist</h2>
        <p className="text-gray-500 mb-8">Sign in to view and manage your saved products.</p>
        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center rounded-xl border border-transparent bg-green-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-green-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Your Wishlist
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {wishlistProducts.length} items saved
          </p>
        </div>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-300 rounded-lg">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No items saved</h3>
          <p className="mt-1 text-sm text-gray-500">Go back to products to add some items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 gap-x-6 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
