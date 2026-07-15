export default function StatsCard({ wealth }) {
  if (!wealth) return null;
  return (
    <div className="stats-card">
      <h3>Wealth Breakdown</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>Companies: {wealth.companies.toFixed(2)} cc</li>
        <li>Weapons: {wealth.weapons.toFixed(2)} cc</li>
        <li>Equipment: {wealth.equipments.toFixed(2)} cc</li>
        <li>Cash: {wealth.money.toFixed(2)} cc</li>
      </ul>
      <strong>Total: {wealth.total.toLocaleString()} cc</strong>
    </div>
  );
}