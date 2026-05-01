export type Product = {
  id: string;
  title: string;
  artist: string;
  format: "LP" | "CD";
  price: number;
  image_url: string | null;
  description: string | null;
  created_at: string;
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
