import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Printer } from "lucide-react";
import type { CartItem } from "./Cart";

export interface ReceiptData {
  transactionId: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  date: string;
}

interface ReceiptProps {
  data: ReceiptData;
  onNewSale: () => void;
}

export function Receipt({ data, onNewSale }: ReceiptProps) {
  return (
    <div className="mx-auto max-w-sm space-y-4" data-print-receipt>
      <div className="flex flex-col items-center gap-1 pt-4">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <h1 className="text-sm font-semibold">Sale Complete</h1>
        <p className="text-2xs text-muted-foreground">Transaction #{data.transactionId.slice(0, 8)}</p>
      </div>

      <Card>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-medium">Receipt</CardTitle>
          <p className="text-2xs text-muted-foreground">
            {new Date(data.date).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-1">
          {data.items.map((item) => (
            <div key={item.productId} className="flex justify-between text-xs">
              <span>{item.name} × {item.quantity}</span>
              <span>${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t pt-1 mt-2 space-y-0.5">
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>${data.subtotal.toFixed(2)}</span>
            </div>
            {data.discount > 0 && (
              <div className="flex justify-between text-xs text-green-600">
                <span>Discount</span>
                <span>-${data.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold pt-1 border-t">
              <span>Total</span>
              <span>${data.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Payment</span>
              <span className="capitalize">{data.paymentMethod}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-9 text-xs gap-1" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button className="flex-1 h-9 text-xs" onClick={onNewSale}>
          New Sale
        </Button>
      </div>
    </div>
  );
}
