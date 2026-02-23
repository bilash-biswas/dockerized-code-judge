import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, Swords, Shield, Target } from 'lucide-react';
import Pagination from '../components/Pagination';
import '../styles/leaderboard.css';

const API_BASE = 'http://localhost:3000';

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('points'); // 'points' | 'elo'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    fetchData(1);
  }, [activeTab]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      if (activeTab === 'points') {
        const res = await axios.get(`${API_BASE}/leaderboard?page=${page}`);
        setData(res.data.data);
        setPagination({ page: res.data.page, limit: res.data.limit, total: res.data.total });
      } else {
        const res = await axios.get(`${API_BASE}/battles/elo-leaderboard?page=${page}`);
        setData(res.data.data);
        // ELO leaderboard might not have 'total' count yet, fallback mapping
        setPagination({ page: res.data.page, limit: res.data.limit, total: res.data.total || 100 });
      }
    } catch (err) {
      console.error('Failed to load leaderboard', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  const calculateWinRate = (won, played) => {
    if (!played || played === 0) return 0;
    return Math.round((won / played) * 100);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="leaderboard-view animate-in">
      <header className="history-header" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div className="title-group">
          <h1>Global Rankings</h1>
          <p className="subtitle">See how you rank against the world's best developers</p>
        </div>
      </header>

      <div className="leaderboard-tabs">
        <button
          className={`lb-tab ${activeTab === 'points' ? 'active' : ''}`}
          onClick={() => setActiveTab('points')}
        >
          <Trophy size={18} /> Top Coders (Points)
        </button>
        <button
          className={`lb-tab ${activeTab === 'elo' ? 'active elo' : ''}`}
          onClick={() => setActiveTab('elo')}
        >
          <Swords size={18} /> Top Warriors (ELO)
        </button>
      </div>

      <div className="glass-table">
        {activeTab === 'points' ? (
          // POINTS HEADER
          <div className="lb-header-row lb-points-grid">
            <span>Rank</span>
            <span>User</span>
            <span className="hide-mobile">Solved</span>
            <span>Points</span>
          </div>
        ) : (
          // ELO HEADER
          <div className="lb-header-row lb-elo-grid">
            <span>Rank</span>
            <span>User</span>
            <span className="hide-mobile">Battles Won</span>
            <span className="hide-mobile">Win Rate</span>
            <span>ELO</span>
          </div>
        )}

        {loading ? (
          <div className="loading-screen" style={{ height: '200px' }}>
            <div className="status-spinner"></div>
          </div>
        ) : (
          data.length > 0 ? (
            data.map((u, i) => {
              const rank = (pagination.page - 1) * pagination.limit + i + 1;
              const badgeClass = getRankBadgeClass(rank);

              if (activeTab === 'points') {
                return (
                  <Link to={`/profile/${u.username}`} key={i} className={`lb-row lb-points-grid ${badgeClass}`}>
                    <div className="rank-badge">#{rank}</div>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {u.avatar_url ? <img src={u.avatar_url} alt="avatar" /> : u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-details">
                        <span className="user-name">{u.username}</span>
                        <span className="user-meta">Joined {formatDate(u.created_at)}</span>
                      </div>
                    </div>
                    <div className="stat-cell hide-mobile">
                      <Target size={16} color="#a0a0b0" /> {u.solved_count}
                    </div>
                    <div className="stat-cell highlight-points">
                      {u.points}
                    </div>
                  </Link>
                );
              } else {
                const winRate = calculateWinRate(parseInt(u.battles_won), parseInt(u.battles_played));
                return (
                  <Link to={`/profile/${u.username}`} key={i} className={`lb-row lb-elo-grid ${badgeClass}`}>
                    <div className="rank-badge">#{rank}</div>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {u.avatar_url ? <img src={u.avatar_url} alt="avatar" /> : u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-details">
                        <span className="user-name">{u.username}</span>
                        <span className="user-meta">{u.battles_played} total battles</span>
                      </div>
                    </div>
                    <div className="stat-cell hide-mobile">
                      <Shield size={16} color="#4facfe" /> {u.battles_won}
                    </div>
                    <div className="stat-cell hide-mobile">
                      {winRate}%
                      <div className="winrate-bar">
                        <div className="winrate-fill" style={{ width: `${winRate}%` }}></div>
                      </div>
                    </div>
                    <div className="stat-cell highlight-elo">
                      {u.elo_rating}
                    </div>
                  </Link>
                );
              }
            })
          ) : (
            <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
              <p>No users found.</p>
            </div>
          )
        )}
      </div>

      {!loading && data.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <Pagination
            total={pagination.total}
            page={pagination.page}
            limit={pagination.limit}
            onPageChange={fetchData}
          />
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
