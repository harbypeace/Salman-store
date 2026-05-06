import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export function Cart() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
        <h2 className="mt-2 text-lg font-medium text-gray-900">Your cart is empty</h2>
        <p className="mt-1 text-sm text-gray-500">Looks like you haven't added anything to your cart yet.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:max-w-7xl lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Shopping Cart</h1>
      <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
        <section aria-labelledby="cart-heading" className="lg:col-span-7">
          <h2 id="cart-heading" className="sr-only">Items in your shopping cart</h2>
          <ul role="list" className="divide-y divide-gray-200 border-b border-t border-gray-200">
            {items.map((product) => (
              <li key={product.id} className="flex py-6 sm:py-10">
                <div className="flex-shrink-0">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-md object-cover object-center sm:h-32 sm:w-32"
                  />
                </div>

                <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                  <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                    <div>
                      <div className="flex justify-between">
                        <h3 className="text-sm">
                          <Link to={`/product/${product.id}`} className="font-medium text-gray-700 hover:text-gray-800">
                            {product.name}
                          </Link>
                        </h3>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900">{product.price.toLocaleString()} YER</p>
                    </div>

                    <div className="mt-4 sm:mt-0 sm:pr-9">
                      <div className="flex items-center border border-gray-300 rounded-md max-w-min">
                        <button 
                          onClick={() => updateQuantity(product.id!, product.quantity - 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="px-4 text-sm font-medium">{product.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(product.id!, product.quantity + 1)}
                          className="p-2 text-gray-600 hover:text-gray-900"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="absolute right-0 top-0">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id!)}
                          className="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500"
                        >
                          <span className="sr-only">Remove</span>
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order summary */}
        <section
          aria-labelledby="summary-heading"
          className="mt-16 rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
        >
          <h2 id="summary-heading" className="text-lg font-medium text-gray-900">
            Order summary
          </h2>

          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Subtotal</dt>
              <dd className="text-sm font-medium text-gray-900">{cartTotal.toLocaleString()} YER</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="flex items-center text-sm text-gray-600">
                <span>Shipping estimate</span>
              </dt>
              <dd className="text-sm font-medium text-gray-900">Calculated at checkout</dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">Order total</dt>
              <dd className="text-base font-medium text-gray-900">{cartTotal.toLocaleString()} YER</dd>
            </div>
          </dl>

          <div className="mt-6">
            <Link
              to="/checkout"
              className="w-full rounded-md border border-transparent bg-green-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-50 text-center block"
            >
              Checkout
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
