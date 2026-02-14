import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart, type CartItem } from "@/components/pos/Cart";
import { Checkout } from "@/components/pos/Checkout";
import { Receipt, type ReceiptData } from "@/components/pos/Receipt";

interface Product {
  id: string;
  name: string;
  price: number | null;
  category: string | null;
  quantity: number | null;
  sku: string | null;
}

type Step = "browse" | "checkout" | "receipt";

export default function POS() {
  const { userRole } = useAuth();
  const companyId = userRole?.company_id;

  const [search, setSearch] = useState("");
  const [step, setStep] = useState<Step>("browse");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["pos-products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, category, quantity, sku")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartItems]
  );

  const addToCart = (product: Product) => {
    if ((product.quantity ?? 0) <= 0) return;
    setCartItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.price ?? 0),
          quantity: 1,
          subtotal: Number(product.price ?? 0),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.productId !== productId);
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity, subtotal: item.unitPrice * quantity }
          : item
      );
    });
  };

  const handleConfirm = async (
    paymentMethod: string,
    discount: number,
    customerId?: string
  ) => {
    const finalTotal = Math.max(0, total - discount);
    let transactionId = `local-${Date.now()}`;

    if (companyId) {
      const { data: txData } = await supabase
        .from("transactions")
        .insert({
          company_id: companyId,
          customer_id: customerId,
          type: "sale",
          amount: finalTotal,
          currency: "USD",
          status: "completed",
          description: "POS sale",
          transaction_date: new Date().toISOString(),
          payment_method: paymentMethod,
        })
        .select("id")
        .single();

      if (txData?.id) {
        transactionId = txData.id;

        await Promise.all(
          cartItems.map((item) =>
            supabase.from("pos_line_items").insert({
              company_id: companyId,
              transaction_id: transactionId,
              product_id: item.productId,
              product_name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              subtotal: item.subtotal,
            })
          )
        );
      }

      await Promise.all(
        cartItems.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          const newQty = Math.max(0, Number(product?.quantity ?? 0) - item.quantity);
          return supabase.from("products").update({ quantity: newQty }).eq("id", item.productId);
        })
      );
    }

    setReceipt({
      transactionId,
      items: cartItems,
      subtotal: total,
      discount,
      total: finalTotal,
      paymentMethod,
      date: new Date().toISOString(),
    });
    setStep("receipt");
    setCartItems([]);
    refetch();
  };

  if (step === "checkout") {
    return (
      <Checkout
        cart={cartItems}
        total={total}
        onBack={() => setStep("browse")}
        onConfirm={handleConfirm}
      />
    );
  }

  if (step === "receipt" && receipt) {
    return (
      <Receipt
        data={receipt}
        onNewSale={() => {
          setReceipt(null);
          setStep("browse");
        }}
      />
    );
  }

  return (
    <div className="grid min-h-[70vh] grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <ProductGrid
        products={products}
        loading={isLoading}
        search={search}
        onSearchChange={setSearch}
        onAddToCart={addToCart}
      />
      <Cart
        items={cartItems}
        total={total}
        onUpdateQuantity={updateQuantity}
        onCheckout={() => setStep("checkout")}
      />
    </div>
  );
}
