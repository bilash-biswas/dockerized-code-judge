import React from 'react';
import {
  BarChart3,
  Trophy,
  CheckCircle,
  Clock,
  Play,
  ArrowRight
} from 'lucide-react';

const Dashboard = ({ user, problems, submissions, handleSelectProblem }) => {
  if (!user) return null;

  const solvedProblemsCount = problems.filter(p => p.is_solved).length;
  const recentSubmissions = submissions
    .filter(s => s.verdict === 'Accepted')
    .slice(0, 5);

  const stats = [
    { label: 'Total Points', val: user.points, icon: <Trophy className="text-warning" />, color: 'rgba(210, 153, 34, 0.1)' },
    { label: 'Solved', val: solvedProblemsCount, icon: <CheckCircle className="text-success" />, color: 'rgba(63, 185, 80, 0.1)' },
    { label: 'Submissions', val: submissions.length, icon: <BarChart3 className="text-accent" />, color: 'rgba(47, 129, 247, 0.1)' },
  ];

  return (
    <div className="dashboard-view animate-in">
      <header className="dash-header">
        <h1>Welcome back, {user.username}! 🚀</h1>
        <p>You're on a roll. Keep solving to climb the leaderboard.</p>
      </header>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card-v2 glass" style={{ borderColor: stat.color }}>
            <div className="stat-icon-wrap" style={{ background: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-val">{stat.val}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-workspace">
        <div className="dash-main">
          <section className="dash-section glass">
            <div className="section-header">
              <Clock size={20} />
              <h3>Recently Solved</h3>
            </div>
            <div className="section-body recent-list">
              {recentSubmissions.length > 0 ? (
                recentSubmissions.map(sub => {
                  const prob = problems.find(p => p.id === sub.problem_id);
                  return (
                    <div key={sub.id} className="recent-item" onClick={() => handleSelectProblem(prob)}>
                      <div className="item-info">
                        <span className="item-title">{prob?.title || 'Custom Problem'}</span>
                        <span className="item-time">{new Date(sub.created_at).toLocaleDateString()}</span>
                      </div>
                      <ArrowRight size={18} className="item-arrow" />
                    </div>
                  );
                })
              ) : (
                <div className="empty-dash-state">
                  <Play size={40} />
                  <p>You haven't solved any problems yet. Start your journey today!</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="dash-side">
          <div className="ad-card glass">
            <h4>Quick Solve</h4>
            <p>Ready for a challenge? Jump into a new problem.</p>
            <button className="btn-v2-primary" onClick={() => { /* This would logically go to problem list if clicking from here */ }}>
              Browse All
            </button>
          </div>

          <div className="progress-mini-card glass">
            <h4>Platform Stats</h4>
            <div className="mini-stat">
              <span>Community Rank</span>
              <span className="val">Coming Soon</span>
            </div>
            <div className="mini-stat">
              <span>Avg. Runtime</span>
              <span className="val">~1.2s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
