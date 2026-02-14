import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

interface CartProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onCheckout: () => void;
}

export function Cart({ items, total, onUpdateQuantity, onCheckout }: CartProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-2 text-xs font-medium">
          <ShoppingCart className="h-3.5 w-3.5" />
          Cart ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto px-3 py-1 space-y-1">
        {items.length === 0 ? (
          <p className="py-8 text-center text-2xs text-muted-foreground">Tap a product to add it</p>
        ) : (
          items.map((item) => (
            <div key={item.productId} className="flex items-center gap-2 rounded-md border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-2xs text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                >
                  {item.quantity === 1 ? <Trash2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </Button>
                <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="w-14 text-right text-xs font-semibold">${item.subtotal.toFixed(2)}</span>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 border-t px-3 py-3">
        <div className="flex w-full justify-between text-sm font-semibold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <Button className="w-full h-9 text-sm" disabled={items.length === 0} onClick={onCheckout}>
          Checkout
        </Button>
      </CardFooter>
    </Card>
  );
}
