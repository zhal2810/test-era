export const AE_PP_PER_DAY = {
  1: 24,
  2: 48,
  3: 72,
  4: 96,
  5: 120,
  6: 144,
  7: 186,
};

export const MAX_AE_LEVEL = 7;

/**
 * Menghitung total efisiensi produksi sebuah company beserta breakdown notes-nya.
 *
 * @param {object} comp        - Objek company (butuh comp.itemCode)
 * @param {object} regionData  - Data region (butuh regionData.deposit, regionData.countryData)
 * @param {object} countryData - Data negara (butuh taxes.market, strategicResources.bonuses.productionPercent)
 * @param {object} partyData   - Data partai penguasa (butuh ethnicBonusPercent, name) - opsional
 */
export function calculateCompanyProduction(comp, regionData, countryData, partyData) {
  // Fallback: kalau countryData tidak diberikan langsung, coba ambil dari regionData.countryData
  const resolvedCountryData = countryData || regionData?.countryData;

  let totalEfficiency = 100;
  const notes = [];

  // 1. Pajak Produksi (Beban Ekonomi Politik)
  const taxRate = resolvedCountryData?.taxes?.market || 0;
  if (taxRate > 0) {
    totalEfficiency -= taxRate;
    notes.push(`-${taxRate}% Pajak Pasar Negara${resolvedCountryData?.name ? ` (${resolvedCountryData.name})` : ''}`);
  } else {
    notes.push(`0% Pajak Pasar (Bebas Pajak)`);
  }

  // 2. Bonus Strategic Resources (Buff Nasional)
  const strategicBonus = resolvedCountryData?.strategicResources?.bonuses?.productionPercent || 0;
  if (strategicBonus !== 0) {
    totalEfficiency += strategicBonus;
    notes.push(`${strategicBonus > 0 ? '+' : ''}${strategicBonus}% Bonus Strategis Negara (Coal/SR)`);
  } else {
    notes.push(`0% Tidak ada Bonus Strategis`);
  }

  // 3. Bonus Etnis (Kebijakan Partai Penguasa)
  const ethnicBonus = partyData?.ethnicBonusPercent || 0;
  if (ethnicBonus !== 0) {
    totalEfficiency += ethnicBonus;
    notes.push(`${ethnicBonus > 0 ? '+' : ''}${ethnicBonus}% Bonus Kebijakan Partai (${partyData?.name || 'Partai'})`);
  }

  // 4. Bonus Deposit Wilayah (Data dari regionData)
  if (regionData?.deposit?.type) {
    if (regionData.deposit.type === comp?.itemCode) {
      const depositBonus = regionData.deposit.bonusPercent || 0;
      totalEfficiency += depositBonus;
      notes.push(`+${depositBonus}% Bonus Deposit Wilayah (${regionData.deposit.type})`);
    } else {
      notes.push(`0% Wilayah ini depositnya ${regionData.deposit.type}, bukan ${comp?.itemCode}`);
    }
  }

  return {
    totalEfficiency,
    breakdownNotes: notes,
  };
}