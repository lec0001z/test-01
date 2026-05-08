export type Difficulty = "쉬움" | "보통" | "어려움";

export type Recipe = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  cooking_time: number;
  image_url: string | null;
  preview: string;
  full_content: string;
  price: number;
  created_at: string;
};

// 목록 페이지에서는 full_content를 절대 가져오지 않는다.
export type RecipeListItem = Omit<Recipe, "full_content">;

export type PurchaseStatus = "pending" | "paid" | "failed";

export type Purchase = {
  id: string;
  user_id: string;
  recipe_id: string;
  order_id: string;
  payment_key: string | null;
  amount: number;
  status: PurchaseStatus;
  fail_reason: string | null;
  created_at: string;
  paid_at: string | null;
};
