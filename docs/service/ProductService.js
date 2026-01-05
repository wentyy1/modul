import { Product } from "../domain/Product.js";

export class ProductService {
  constructor() {
    this.products = [];
  }

  create(data) {
    if (!data.name) throw new Error("NAME_REQUIRED");
    const p = new Product(Date.now(), data.name, data.type, data.brand, data.price);
    this.products.push(p);
    return p;
  }

  list() {
    return this.products;
  }
}
