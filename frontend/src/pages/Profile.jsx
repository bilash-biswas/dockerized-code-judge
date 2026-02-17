import React from 'react';

const Profile = ({ user }) => {
  if (!user) return null;
  return (
    <div className="profile-view">
      <div className="glass profile-header">
        <div className="profile-avatar">
          {user.username[0].toUpperCase()}
        </div>
        <div className="profile-details">
          <h1>{user.username}</h1>
          <p>{user.email}</p>
          <div className="profile-stats">
            <div className="stat">
              <span className="stat-label">Total Points</span>
              <span className="stat-val">{user.points}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Rank</span>
              <span className="stat-val">#1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
