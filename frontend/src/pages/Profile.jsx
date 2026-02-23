import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Award, Target, Swords, Clock, Edit3, Save, X, Calendar, Edit2, Zap } from 'lucide-react';
import '../styles/profile.css';

const API_BASE = 'http://localhost:3000';

const Profile = () => {
  const { username } = useParams();
  const { user: authUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  const targetUsername = username || 'me';

  useEffect(() => {
    if (authLoading) return;
    if (targetUsername === 'me' && !authUser) {
      navigate('/login');
      return;
    }

    fetchProfile();
  }, [targetUsername, authUser, authLoading]);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      // Need token if fetching 'me', or just optional for public profile
      const config = {};
      if (localStorage.getItem('token')) {
        config.headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      }
      const res = await axios.get(`${API_BASE}/users/${targetUsername}/profile`, config);
      setProfile(res.data);
      setEditBio(res.data.bio || '');
      setEditAvatar(res.data.avatar_url || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
      await axios.put(`${API_BASE}/users/me/profile`, { bio: editBio, avatar_url: editAvatar }, config);
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      alert('Failed to save profile');
    }
  };

  if (loading || authLoading) return <div className="loading-screen"><div className="status-spinner"></div></div>;
  if (error) return <div className="profile-dashboard"><div className="glass" style={{ padding: '2rem', textAlign: 'center', color: '#ff6b6b' }}>{error}</div></div>;
  if (!profile) return null;

  const isOwner = authUser && authUser.id === profile.id;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatRelTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const totalSolved = Object.values(profile.solved_by_difficulty).reduce((a, b) => a + b, 0);
  const winRate = profile.battle_stats.total > 0
    ? Math.round((profile.battle_stats.won / profile.battle_stats.total) * 100)
    : 0;

  return (
    <div className="profile-dashboard animate-in">

      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="profile-info">
          <h1>{profile.username}</h1>
          <p><Calendar size={14} style={{ display: 'inline', marginRight: '5px' }} /> Joined {formatDate(profile.created_at)}</p>

          {isEditing ? (
            <div className="edit-bio-area" style={{ marginBottom: '1rem' }}>
              <input type="text" placeholder="Avatar Image URL (optional)" value={editAvatar} onChange={e => setEditAvatar(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '4px' }} />
              <textarea placeholder="Write a short bio..." value={editBio} onChange={e => setEditBio(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.5rem', borderRadius: '4px', minHeight: '80px' }} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={handleSaveProfile} className="v3-btn primary"><Save size={16} /> Save</button>
                <button onClick={() => setIsEditing(false)} className="v3-btn secondary"><X size={16} /> Cancel</button>
              </div>
            </div>
          ) : (
            <div className="profile-bio">
              {profile.bio ? profile.bio : <span style={{ opacity: 0.5, fontStyle: 'italic' }}>No bio provided.</span>}
            </div>
          )}
        </div>

        {isOwner && !isEditing && (
          <button className="profile-edit-btn" onClick={() => setIsEditing(true)}>
            <Edit3 size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="profile-grid">

        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          <div className="profile-card">
            <h3><Target size={20} color="#6bcb77" /> Coding Rankings</h3>
            <div className="stats-container">
              <div className="stat-box points">
                <span className="lbl">Total Points</span>
                <span className="val">{profile.points}</span>
                <span style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Global Rank: <strong style={{ color: '#fff' }}>#{profile.points_rank}</strong></span>
              </div>
              <div className="stat-box elo">
                <span className="lbl">Battle ELO</span>
                <span className="val">{profile.elo_rating}</span>
                <span style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Global Rank: <strong style={{ color: '#fff' }}>#{profile.elo_rank}</strong></span>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <h3><Zap size={20} color="#f9ca24" /> Problem Solving Progress</h3>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totalSolved}</span> <span style={{ color: '#a0a0b0' }}>Problems Solved</span>
            </div>

            <div className="progress-section">
              <div className="progress-item">
                <div className="progress-label"><span>Easy</span> <span>{profile.solved_by_difficulty.Easy}</span></div>
                <div className="progress-bar-bg"><div className="progress-bar-fill easy" style={{ width: `${Math.min(100, (profile.solved_by_difficulty.Easy / Math.max(1, totalSolved)) * 100)}%` }}></div></div>
              </div>
              <div className="progress-item">
                <div className="progress-label"><span>Medium</span> <span>{profile.solved_by_difficulty.Medium}</span></div>
                <div className="progress-bar-bg"><div className="progress-bar-fill medium" style={{ width: `${Math.min(100, (profile.solved_by_difficulty.Medium / Math.max(1, totalSolved)) * 100)}%` }}></div></div>
              </div>
              <div className="progress-item">
                <div className="progress-label"><span>Hard</span> <span>{profile.solved_by_difficulty.Hard}</span></div>
                <div className="progress-bar-bg"><div className="progress-bar-fill hard" style={{ width: `${Math.min(100, (profile.solved_by_difficulty.Hard / Math.max(1, totalSolved)) * 100)}%` }}></div></div>
              </div>
            </div>
          </div>

          <div className="profile-card">
            <h3><Swords size={20} color="#ff6b6b" /> 1v1 Battle Record</h3>
            <div className="stats-container">
              <div className="stat-box">
                <span className="lbl">Battles Won</span>
                <span className="val">{profile.battle_stats.won}</span>
                <span style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Out of {profile.battle_stats.total} total</span>
              </div>
              <div className="stat-box winrate">
                <span className="lbl">Win Rate</span>
                <span className="val">{winRate}%</span>
                <span style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>Dominance</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div>
          <div className="recent-activity">
            <h3><Clock size={20} color="#a29bfe" /> Recent Submissions</h3>

            {profile.recent_activity.length > 0 ? (
              <div className="activity-list">
                {profile.recent_activity.map(act => {
                  const vClass = act.verdict === 'Accepted' ? 'Accepted'
                    : act.verdict === 'Time Limit Exceeded' ? 'Time'
                      : act.verdict === 'Wrong Answer' ? 'Wrong' : 'Runtime';
                  return (
                    <div className={`activity-item ${vClass}`} key={act.id}>
                      <div className="act-left">
                        <span className="act-title">{act.problem_title || 'Unknown Problem'}</span>
                        <div className="act-meta">
                          <span>{act.language}</span> • <span>{formatRelTime(act.created_at)}</span>
                        </div>
                      </div>
                      <div className="act-right">
                        <div className={`act-verdict ${vClass}`}>{act.verdict}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', opacity: 0.5 }}>
                <Edit2 size={32} style={{ marginBottom: '1rem' }} />
                <p>No recent activity yet.<br />Time to solve some problems!</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
