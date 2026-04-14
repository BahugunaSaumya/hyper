export type Product = {
  title: string;
  slug: string;
  desc: string;
  MRP: number;
  price: number;
  "discount percentage": string;
  gender: string;
  sizes: string;
  image: string;
  new_launch: boolean;
  categories: string[];
};

export type ProductModel = {
  title: string;
  slug: string;
  mrp: number;
  price: number;
  discount_percentage: string;
  gender: string;
  sizes: string[];
  image: string;
  new_launch: boolean;
  categories: string[];
};
