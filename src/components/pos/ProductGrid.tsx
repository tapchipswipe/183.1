import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  quantity: number | null;
  sku: string | null;
}

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  onAddToCart: (product: Product) => void;
}

export function ProductGrid({ products, loading, search, onSearchChange, onAddToCart }: ProductGridProps) {
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Point of Sale</h1>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 text-sm"
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="mb-2 h-8 w-8" />
          <p className="text-xs">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer p-3 transition-colors hover:bg-accent/50 active:scale-[0.98]"
              onClick={() => onAddToCart(product)}
            >
              <p className="text-xs font-medium truncate">{product.name}</p>
              <p className="text-2xs text-muted-foreground truncate">{product.category || "Uncategorized"}</p>
              <p className="mt-1 text-sm font-semibold text-primary">
                ${(product.price ?? 0).toFixed(2)}
              </p>
              {product.quantity !== null && (
                <p className="text-2xs text-muted-foreground">Stock: {product.quantity}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
