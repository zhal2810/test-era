export default function PlayerCard({ data }) {
  return (
    <div className="player-card">
      <img src={data.avatarUrl} alt={data.username} style={{ width: '80px', borderRadius: '50%' }} />
      <h2>{data.username}</h2>
      <p>Level: {data.leveling.level}</p>
      <p>Military Rank: {data.militaryRank}</p>
    </div>
  );
}