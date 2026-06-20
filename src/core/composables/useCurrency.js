const CURRENCY_CONFIG = {
  USD: { code: 'USD', locale: 'en-US', symbol: '$' },
  ARS: { code: 'ARS', locale: 'es-AR', symbol: '$' },
  EUR: { code: 'EUR', locale: 'de-DE', symbol: '€' },
  BRL: { code: 'BRL', locale: 'pt-BR', symbol: 'R$' },
}

export function formatCurrency(value, currencyCode = 'USD') {
  const cfg = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD
  return Number(value).toLocaleString(cfg.locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function getMonedas() {
  return Object.entries(CURRENCY_CONFIG).map(([code, cfg]) => ({
    code,
    label: `${cfg.symbol} ${code} — ${cfg.locale}`,
  }))
}
