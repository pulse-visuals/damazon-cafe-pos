// Cart line items are keyed by product + sorted modifier option ids, so
// re-adding the exact same customization increments quantity instead of
// creating a duplicate line.
export function lineKey(productId, modifierOptionIds = []) {
  return `${productId}::${[...modifierOptionIds].sort().join(",")}`;
}

export function lineUnitPrice(product, modifiers) {
  const base = Number(product.price);
  const modTotal = modifiers.reduce((sum, m) => sum + Number(m.priceDelta), 0);
  return base + modTotal;
}
