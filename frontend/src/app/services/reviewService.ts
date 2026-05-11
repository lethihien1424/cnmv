import { apiRequest } from './api';

export interface Review {
  id: string;
  product_id: string;
  buyer_id: string;
  order_id: string;
  rating: number;
  comment: string;
  created_at: string;
  buyer?: {
    id: string;
    username: string;
  };
}

export const getReviewsByProduct = async (productId: string): Promise<Review[]> => {
  try {
    return await apiRequest<Review[]>(`/reviews/product/${productId}`);
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return [];
  }
};
