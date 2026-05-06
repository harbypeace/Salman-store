import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Product } from "../types";
import { Heart, MessageCircle, ArrowLeft, Truck, Banknote, ShoppingCart } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

export function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const { user, signInWithGoogle } = useAuth();
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `products/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const checkWishlist = async () => {
      try {
        const docRef = doc(db, "users", user.uid, "wishlist", id);
        const docSnap = await getDoc(docRef);
        setInWishlist(docSnap.exists());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/wishlist/${id}`);
      }
    };
    checkWishlist();
  }, [user, id]);

  const toggleWishlist = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!id) return;

    const docRef = doc(db, "users", user.uid, "wishlist", id);
    try {
      if (inWishlist) {
        await deleteDoc(docRef);
        setInWishlist(false);
      } else {
        await setDoc(docRef, { productId: id, addedAt: serverTimestamp() });
        setInWishlist(true);
      }
    } catch (error) {
      const type = inWishlist ? OperationType.DELETE : OperationType.CREATE;
      handleFirestoreError(error, type, `users/${user.uid}/wishlist/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Product not found</h2>
        <Link to="/" className="mt-4 inline-block text-green-600 hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const message = `مرحباً، أود طلب المنتج: ${product.name}\n(السعر: ${product.price.toLocaleString()} ريال يمني)\nالرابط: ${currentUrl}`;
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '';
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/" className="mb-6 inline-flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to products</span>
      </Link>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
        {/* Image gallery */}
        <div className="flex flex-col-reverse">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={product.imageUrl || "https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop"}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>

        {/* Product info */}
        <div className="mt-10 px-4 sm:px-0 lg:mt-0">
          <div className="mb-2">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{product.category}</h2>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h1>
          
          <div className="mt-3 relative">
            <h2 className="sr-only">Product information</h2>
            <p className="text-3xl tracking-tight text-gray-900">{product.price.toLocaleString()} YER</p>
            {!product.inStock && (
              <div className="mt-2 inline-flex items-center rounded-full bg-red-100 px-3 py-0.5 text-sm font-medium text-red-800">
                Out of Stock
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="sr-only">Description</h3>
            <div className="space-y-6 text-base text-gray-700 whitespace-pre-wrap">
              {product.description}
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => addToCart(product)}
              disabled={!product.inStock}
              className="flex max-w-xs flex-1 items-center justify-center space-x-2 rounded-xl border border-transparent bg-green-600 px-8 py-4 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-full disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Add to Cart</span>
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex max-w-xs flex-1 items-center justify-center space-x-2 rounded-xl border border-transparent bg-[#25D366] px-8 py-4 text-base font-medium text-white shadow-sm hover:bg-[#128C7E] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2 sm:w-full"
            >
              <MessageCircle className="h-6 w-6" />
              <span>WhatsApp</span>
            </a>

            <button
              onClick={toggleWishlist}
              className={`flex items-center justify-center space-x-2 rounded-xl border px-8 py-4 text-base font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${
                inWishlist 
                  ? 'border-gray-200 bg-gray-50 text-red-500 hover:bg-gray-100 focus:ring-gray-500' 
                  : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50 focus:ring-gray-500'
              }`}
            >
              <Heart className={`h-6 w-6 ${inWishlist ? 'fill-red-500' : ''}`} />
              <span>{inWishlist ? 'Saved' : 'Add to Wishlist'}</span>
            </button>
          </div>

          <div className="mt-8 flex flex-col space-y-3 border-t border-gray-200 pt-6 text-sm text-gray-600">
            <div className="flex items-center space-x-3">
              <Banknote className="h-5 w-5 text-green-600" />
              <span>الدفع عند الاستلام أو تحويل عبر الكريمي (Pay on Delivery or Kuraimi Transfer)</span>
            </div>
            <div className="flex items-center space-x-3">
              <Truck className="h-5 w-5 text-green-600" />
              <span>توصيل متوفر لجميع المحافظات اليمنية (Delivery to all Yemeni Governorates)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
