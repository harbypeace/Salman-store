import { Link } from "react-router-dom";
import { Product } from "../types";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";

export function ProductCard({ product }: { product: Product }) {
  const { user, signInWithGoogle } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  
  useEffect(() => {
    if (!user || !product.id) return;
    
    const checkWishlist = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "wishlist", product.id!);
        const docSnap = await getDoc(docRef);
        setInWishlist(docSnap.exists());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/wishlist/${product.id}`);
      }
    };
    checkWishlist();
  }, [user, product.id]);

  const toggleWishlist = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!product.id) return;

    const docRef = doc(db, "users", user.uid, "wishlist", product.id);
    
    try {
      if (inWishlist) {
        await deleteDoc(docRef);
        setInWishlist(false);
      } else {
        await setDoc(docRef, {
          productId: product.id,
          addedAt: serverTimestamp()
        });
        setInWishlist(true);
      }
    } catch (error) {
      const type = inWishlist ? OperationType.DELETE : OperationType.CREATE;
      handleFirestoreError(error, type, `users/${user.uid}/wishlist/${product.id}`);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const message = `مرحباً، أود الاستفسار عن المنتج: ${product.name}\n(السعر: ${product.price.toLocaleString()} ريال يمني)\nالرابط: ${currentUrl}/product/${product.id}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <Link to={`/product/${product.id}`} className="block aspect-square w-full overflow-hidden bg-gray-100">
        <img
          src={product.imageUrl || "https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=600&auto=format&fit=crop"}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
        {!product.inStock && (
          <div className="absolute top-2 left-2 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            Out of Stock
          </div>
        )}
      </Link>
      
      <button 
        onClick={toggleWishlist}
        className="absolute top-2 right-2 rounded-full bg-white/80 p-2 text-gray-400 backdrop-blur-sm transition-colors hover:text-red-500 focus:outline-none"
      >
        <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{product.category}</p>
          <p className="text-lg font-bold text-gray-900">{product.price.toLocaleString()} YER</p>
        </div>
        <h3 className="mb-1 text-base font-semibold text-gray-900 leading-tight">
          <Link to={`/product/${product.id}`}>
            {product.name}
          </Link>
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-gray-500">{product.description}</p>
        
        <div className="mt-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center space-x-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          >
            <MessageCircle className="h-5 w-5" />
            <span>طلب عبر واتساب</span>
          </a>
        </div>
      </div>
    </div>
  );
}
