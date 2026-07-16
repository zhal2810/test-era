export const MAX_AE_LEVEL = 10;

export const AE_PP_PER_DAY = Object.fromEntries(
  Array.from({ length: MAX_AE_LEVEL + 1 }, (_, level) => [level, level * 4])
);

export function calculateCompanyProduction(comp, regionData, countryData) {
  const baseEfficiency = 100;
  const regionalBonus = regionData?.deposit?.bonusPercent ?? 0;
  const countryBonus = countryData?.taxes?.market ?? 0;
  const totalEfficiency = Math.max(0, baseEfficiency + regionalBonus - countryBonus);

  const breakdownNotes = [
    `${baseEfficiency}% Baseline produksi`,
    `${regionalBonus >= 0 ? '+' : ''}${regionalBonus}% Bonus wilayah`,
    `${countryBonus >= 0 ? '+' : ''}${countryBonus}% Pajak negara`,
    `= ${totalEfficiency}% Estimasi efisiensi`,
  ];

  return { totalEfficiency, breakdownNotes };
}
