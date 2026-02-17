import React from 'react';
import { ChevronRight, Zap, Shield, Star } from 'lucide-react';

const Landing = ({ setView }) => {
  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Master Competitive Programming</h1>
          <p>Learn, Code, and Compete with the most advanced Python execution engine.</p>
          <div className="hero-btns">
            <button className="btn-primary" onClick={() => setView('register')}>
              Get Started <ChevronRight size={18} />
            </button>
            <button className="btn-secondary" onClick={() => setView('login')}>
              Login
            </button>
          </div>
        </div>
        <div className="hero-infographics">
          <div className="glass stat-card">
            <Zap size={32} />
            <span>100+ Problems</span>
          </div>
          <div className="glass stat-card">
            <Shield size={32} />
            <span>Secure Sandbox</span>
          </div>
          <div className="glass stat-card">
            <Star size={32} />
            <span>Ranked Leaderboard</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
