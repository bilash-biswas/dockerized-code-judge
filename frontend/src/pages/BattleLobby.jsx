import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Swords, Search, Shield, Trophy, Clock,
  ChevronRight, Zap, Star, X
} from 'lucide-react';
import '../styles/battle.css';

const API_BASE = 'http://localhost:3000';

const BattleLobby = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();

  const [searching, setSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [difficulty, setDifficulty] = useState('Any');
  const [countdown, setCountdown] = useState(null); // null | {you, opponent, battleId, problem, count}
  const [battleHistory, setBattleHistory] = useState([]);

  // Fetch battle history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/battles/history/me`);
        setBattleHistory(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch battle history:', err);
      }
    };
    fetchHistory();
  }, []);

  // Search timer
  useEffect(() => {
    let interval;
    if (searching) {
      interval = setInterval(() => {
        setSearchTime(t => t + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }
    return () => clearInterval(interval);
  }, [searching]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('battle_searching', (data) => {
      setSearching(true);
    });

    socket.on('battle_found', (data) => {
      setSearching(false);
      setSearchTime(0);
      // Start countdown
      setCountdown({
        you: data.you,
        opponent: data.opponent,
        battleId: data.battleId,
        problem: data.problem,
        count: data.startsIn
      });
    });

    socket.on('battle_start', (data) => {
      // Navigate to battle arena
      navigate(`/battle/${data.battleId}`);
    });

    socket.on('battle_error', (data) => {
      setSearching(false);
      setSearchTime(0);
      alert(data.message || 'Battle error');
    });

    socket.on('battle_queue_left', () => {
      setSearching(false);
      setSearchTime(0);
    });

    return () => {
      socket.off('battle_searching');
      socket.off('battle_found');
      socket.off('battle_start');
      socket.off('battle_error');
      socket.off('battle_queue_left');
    };
  }, [socket, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!countdown) return;
    if (countdown.count <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(prev => prev ? { ...prev, count: prev.count - 1 } : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleFindBattle = () => {
    if (!socket || !user) return;
    socket.emit('battle_join_queue', { userId: user.id, difficulty });
    setSearching(true);
  };

  const handleCancelSearch = () => {
    if (!socket || !user) return;
    socket.emit('battle_leave_queue', { userId: user.id });
    setSearching(false);
    setSearchTime(0);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Countdown Overlay */}
      {countdown && (
        <div className="countdown-overlay">
          <div className="countdown-vs">
            <div className="countdown-player">
              <div className="cp-name">{countdown.you.username}</div>
              <div className="cp-elo">ELO {countdown.you.elo}</div>
            </div>
            <div className="countdown-vs-text">⚔️ VS</div>
            <div className="countdown-player">
              <div className="cp-name">{countdown.opponent.username}</div>
              <div className="cp-elo">ELO {countdown.opponent.elo}</div>
            </div>
          </div>
          {countdown.count > 0 ? (
            <div className="countdown-number" key={countdown.count}>{countdown.count}</div>
          ) : (
            <div className="countdown-go">GO!</div>
          )}
        </div>
      )}

      <div className="battle-lobby animate-in">
        <div className="battle-lobby-card">
          <h1>⚔️ Code Battle</h1>
          <p className="subtitle">Challenge opponents to a 1v1 coding duel</p>

          <div className="elo-display">
            <div>
              <div className="elo-label">Your Rating</div>
              <div className="elo-value">{user?.elo_rating || 1200}</div>
            </div>
          </div>

          {!searching ? (
            <div className="battle-controls">
              <div className="difficulty-selector">
                {['Any', 'Easy', 'Medium', 'Hard'].map((d) => (
                  <button
                    key={d}
                    className={`diff-btn ${difficulty === d ? 'active' : ''} ${d.toLowerCase()}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <button className="btn-find-battle" onClick={handleFindBattle}>
                <Swords size={22} /> Find Battle
              </button>
            </div>
          ) : (
            <div className="searching-container">
              <div className="search-pulse">
                <Search size={36} color="white" />
              </div>
              <div className="searching-text">Searching for opponent...</div>
              <div className="search-timer">
                <Clock size={14} /> {formatTime(searchTime)}
              </div>
              <button className="btn-cancel-search" onClick={handleCancelSearch}>
                <X size={16} /> Cancel Search
              </button>
            </div>
          )}
        </div>

        {/* Battle History */}
        {battleHistory.length > 0 && (
          <div className="battle-history-section">
            <h3>Recent Battles</h3>
            {battleHistory.slice(0, 5).map(b => {
              const isPlayer1 = b.player1_id === user?.id;
              const myVerdict = isPlayer1 ? 'Player 1' : 'Player 2';
              const opponentName = isPlayer1 ? b.player2_username : b.player1_username;
              const won = b.winner_id === user?.id;
              const isDraw = !b.winner_id;

              return (
                <div key={b.id} className="battle-history-item">
                  <div className="bhi-players">
                    vs <strong>{opponentName || 'Unknown'}</strong>
                    <span style={{ marginLeft: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                      {b.problem_title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`bhi-elo ${won ? 'positive' : isDraw ? '' : 'negative'}`}>
                      {won ? `+${b.elo_change}` : isDraw ? '±0' : `-${b.elo_change}`}
                    </span>
                    <span className={`bhi-result ${won ? 'won' : isDraw ? 'draw' : 'lost'}`}>
                      {won ? 'Victory' : isDraw ? 'Draw' : 'Defeat'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default BattleLobby;
