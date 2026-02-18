"use client";

import { useState, useEffect } from "react";
import { getProducts, ProductProps } from "../handlers/products";
import { request } from "../handlers/auth";

const Products = () => {
  const [products, setProducts] = useState<ProductProps[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const data = await getProducts();
      setProducts(data);
    };
    fetchProducts();
  }, []);

  return (
    <div className="w-full flex flex-wrap justify-center gap-6 z-50">
      {products.map(({ product_id, product_name, price, stripe_price_id }) => (
        <div
          key={product_id}
          className="flex flex-col justify-between w-56 p-6 gap-4 border-[3px] border-black dark:border-white bg-pink-200 dark:bg-pink-900 shadow-[4px_4px_0px_0px_black] dark:shadow-[4px_4px_0px_0px_white] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_black] dark:hover:shadow-[6px_6px_0px_0px_white] transition-all duration-150"
        >
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-extrabold tracking-tight text-black dark:text-white">
              {product_name}
            </h3>
            <p className="text-sm font-bold text-black/60 dark:text-white/60">
              ${price} / month
            </p>
          </div>

          <button
            className="w-full py-2 px-4 bg-black dark:bg-white text-white dark:text-black font-extrabold tracking-wide text-sm uppercase border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_black] dark:shadow-[3px_3px_0px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-100 cursor-pointer"
            onClick={async () => {
              const { url } = await request("/payment/create-checkout-session", {
                method: "POST",
                body: JSON.stringify({ price_id: stripe_price_id }),
              });
              window.location.href = url;
            }}
          >
            Checkout
          </button>
        </div>
      ))}
    </div>
  );
};

export default Products;