import React from 'react';
import Pagination from '../components/Pagination';

const Leaderboard = ({ leaderboard, pagination, fetchLeaderboard }) => {
  return (
    <div className="leaderboard-view animate-in">
      <header className="history-header">
        <div className="title-group">
          <h1>Global Leaderboard</h1>
          <p className="subtitle">See how you rank against other logic builders</p>
        </div>
      </header>

      <div className="glass leaderboard-table" style={{ marginTop: '20px' }}>
        <div className="table-header">
          <span>Rank</span>
          <span>User</span>
          <span>Solved</span>
          <span>Points</span>
        </div>
        {leaderboard.map((u, i) => (
          <div key={i} className="table-row">
            <span className="rank">#{(pagination.page - 1) * pagination.limit + i + 1}</span>
            <span className="user">{u.username}</span>
            <span className="solved">{u.solved_count}</span>
            <span className="pts">{u.points}</span>
          </div>
        ))}
        {leaderboard.length === 0 && <div className="empty-state"><p>No users found.</p></div>}
      </div>

      <Pagination
        total={pagination.total}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={fetchLeaderboard}
      />
    </div>
  );
};

export default Leaderboard;
