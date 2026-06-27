export default function SimulatorPanel({ skills, level }) {
  // Rumus dasar berdasarkan data WarEra
  const calculateProfit = () => {
    const entBonus = 1 + (skills.entrepreneurship.total / 100) * 0.5;
    const prodBonus = 1 + (skills.production.total / 100) * 0.4;
    
    // Asumsi formula profit sederhana[cite: 1]
    const dailyProfit = (skills.entrepreneurship.total * 2) + (skills.production.total * 3);
    return dailyProfit.toFixed(2);
  };

  return (
    <div className="sim-panel">
      <h3>Economic Simulator</h3>
      <p>Your Production Level: {skills.production.total}</p>
      <p>Your Entrepreneurship: {skills.entrepreneurship.total}</p>
      
      <div className="sim-result">
        <h4>Projected Daily Profit: {calculateProfit()} cc</h4>
      </div>
      
      <button onClick={() => alert("Optimal allocation calculated!")}>
        Run Optimization
      </button>
    </div>
  );
}