import type { PaymentMethod } from "@/lib/types";

export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "UPI", "CARD"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};
