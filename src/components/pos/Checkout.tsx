import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import type { CartItem } from "./Cart";

interface CheckoutProps {
  cart: CartItem[];
  total: number;
  onConfirm: (paymentMethod: string, discount: number, customerId?: string) => void;
  onBack: () => void;
}

export function Checkout({ cart, total, onConfirm, onBack }: CheckoutProps) {
  const { userRole } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");

  const { data: customers = [] } = useQuery({
    queryKey: ["checkout-customers", userRole?.company_id],
    queryFn: async () => {
      if (!userRole?.company_id) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("company_id", userRole.company_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.company_id,
  });

  const finalTotal = total - discount;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(paymentMethod, discount, customerId || undefined);
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to cart
      </Button>

      <h1 className="text-sm font-semibold">Checkout</h1>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1">
          {cart.map((item) => (
            <div key={item.productId} className="flex justify-between text-xs">
              <span>{item.name} × {item.quantity}</span>
              <span className="font-medium">${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-1 mt-2 flex justify-between text-xs font-medium">
            <span>Subtotal</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium">Customer (optional)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Walk-in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Walk-in customer</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium">Discount</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Input
            type="number"
            min={0}
            max={total}
            step={0.01}
            value={discount || ""}
            onChange={(e) => setDiscount(Math.min(Number(e.target.value) || 0, total))}
            placeholder="0.00"
            className="h-8 text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
            {["cash", "card", "mobile"].map((m) => (
              <div key={m} className="flex items-center gap-2">
                <RadioGroupItem value={m} id={m} />
                <Label htmlFor={m} className="text-xs capitalize cursor-pointer">{m}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-lg bg-muted p-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-lg font-bold text-primary">${finalTotal.toFixed(2)}</span>
      </div>

      <Button className="w-full h-10" onClick={handleConfirm} disabled={loading || finalTotal <= 0}>
        {loading ? "Processing..." : `Complete Sale — $${finalTotal.toFixed(2)}`}
      </Button>
    </div>
  );
}
