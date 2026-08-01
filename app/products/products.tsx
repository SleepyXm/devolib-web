"use client";

import { useEffect, useState } from "react";
import { request } from "../handlers/auth";
import { getProducts, ProductProps } from "../handlers/products";
import { Action, Empty, Panel, ui } from "../UI";

export default function Products() {
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then(setProducts).finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty title="Loading plans">Reading available runtime capacity.</Empty>;
  if (!products.length) {
    return <Empty title="Plans are not configured">Add product records to PostgreSQL to make checkout options available.</Empty>;
  }

  return (
    <div className="grid grid-cols-3 gap-px border border-white/10 bg-white/10 max-lg:grid-cols-2 max-sm:grid-cols-1">
      {products.map((product) => (
        <Panel className="grid min-h-64 content-between border-0 p-6" key={product.product_id}>
          <div>
            <span className={ui.micro}>LIDE capacity</span>
            <h2 className="mt-5 text-xl font-medium">{product.product_name}</h2>
            <p className="text-sm text-white/45">${product.price} / month</p>
          </div>
          <Action
            onClick={async () => {
              const { url } = await request("/payment/create-checkout-session", {
                method: "POST",
                body: JSON.stringify({ price_id: product.stripe_price_id }),
              });
              window.location.href = url;
            }}
          >
            Continue to checkout
          </Action>
        </Panel>
      ))}
    </div>
  );
}
