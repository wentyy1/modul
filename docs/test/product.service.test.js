import { ProductService } from "../service/ProductService.js";

test("Create product success", () => {
  const s = new ProductService();
  const p = s.create({ name: "Mouse", price: 100 });
  expect(p.name).toBe("Mouse");
});

test("Create product validation error", () => {
  const s = new ProductService();
  expect(() => s.create({})).toThrow();
});
