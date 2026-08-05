const priceFallback = 'Գինը՝ հարցման դեպքում';

function extractPriceAmount(value) {
  if (typeof value === 'number') return value;
  if (!value) return null;
  if (typeof value === 'object') return extractPriceAmount(value.amount ?? value.display);

  const normalized = String(value).replace(/[^\d.]/g, '');
  return normalized ? Number(normalized) : null;
}

export function getPriceAmount(...values) {
  for (const value of values) {
    const amount = extractPriceAmount(value);
    if (Number.isFinite(amount)) return amount;
  }

  return 0;
}

export function formatAmdPrice(value, fallback = priceFallback) {
  const amount = extractPriceAmount(value);
  if (!Number.isFinite(amount) || amount <= 0) return fallback;

  return `${Math.round(amount).toLocaleString('hy-AM')} ֏`;
}
