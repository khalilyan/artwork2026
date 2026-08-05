export function getProductBadgeLabel(product) {
  const badge = String(product?.badge ?? product?.sale?.label ?? '').trim();
  const percent = Number(product?.sale?.percent ?? 0);
  const formattedPercent = Number.isFinite(percent) && percent > 0
    ? `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`
    : '';
  const legacyOffPercent = badge.match(/(\d+(?:\.\d+)?)\s*%?\s*off\b/i)?.[1];

  if (!badge) return '';
  if (product?.sale?.isActive) return formattedPercent ? `${formattedPercent} ԶԵՂՉ` : 'ԶԵՂՉ';
  if (legacyOffPercent) return `${legacyOffPercent}% ԶԵՂՉ`;
  if (/^sale$/i.test(badge)) return 'ԶԵՂՉ';

  return badge;
}
