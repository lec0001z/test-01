export type Product = {
  id: string;
  title: string;
  artist: string;
  format: "LP" | "CD";
  price: number;
  image_url: string | null;
  description: string | null;
  created_at: string;
  seller_id: string | null;
  sold: boolean;
  condition: string | null;
};

export type CartItem = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
};

export type CartRow = CartItem & {
  products: Product;
};

export type OrderStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  buyer_id: string;
  order_id: string;
  payment_key: string | null;
  amount: number;
  status: OrderStatus;
  fail_reason: string | null;
  created_at: string;
  paid_at: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  artist: string;
  format: "LP" | "CD";
  price: number;
  quantity: number;
  image_url: string | null;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};
