import { content, PageHeader, ui } from "@/app/UI";
import Products from "./products";

export default function ProductsPage() {
  return (
    <main className={ui.page}>
      <div className={`${ui.container} py-20`}>
        <PageHeader {...content.products} />
        <div className="mt-8"><Products /></div>
      </div>
    </main>
  );
}
