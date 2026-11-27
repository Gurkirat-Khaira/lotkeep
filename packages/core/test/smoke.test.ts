import { expect, it } from "vitest";
import { PRODUCT } from "../src/index";

it("exports product id", () => {
  expect(PRODUCT.id).toBe("dms");
});
