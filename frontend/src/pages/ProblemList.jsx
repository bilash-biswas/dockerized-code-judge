import React, { useState } from 'react';
import { CheckCircle, ChevronRight, Search, Filter, X } from 'lucide-react';
import Pagination from '../components/Pagination';

const ProblemList = ({ problems, pagination, fetchProblems, onSelect }) => {
  const getDifficultyPoints = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 1;
      case 'Medium': return 2;
      case 'Hard': return 3;
      default: return 0;
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === '' || p.difficulty === filterDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="problem-list-view animate-in">
      <header className="list-header">
        <div className="header-text">
          <h1>Problem Library</h1>
          <p>Sharpen your logic with {pagination.total} diverse challenges.</p>
        </div>
      </header>

      {/* Modern Filter Bar */}
      <div className="filter-bar-v2 glass">
        <div className="search-box-v2">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search problems by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-group">
          <div className="filter-item">
            <Filter size={16} />
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      <div className="problems-grid">
        {filteredProblems.map(p => (
          <div key={p.id} className="glass problem-card" onClick={() => onSelect(p)}>
            <div className="problem-card-top">
              <div className="card-status">
                <span className={`difficulty ${p.difficulty.toLowerCase()}`}>{p.difficulty}</span>
                {p.is_solved && (
                  <div className="solved-badge">
                    <CheckCircle size={12} /> Solved
                  </div>
                )}
              </div>
              <h3>{p.title}</h3>
            </div>
            <p className="card-desc-en">Points: {getDifficultyPoints(p.difficulty)}</p>
            <div className="card-footer">
              <span className="points-tag">+{getDifficultyPoints(p.difficulty)} pts</span>
              <div className="btn-go">
                Solve <ChevronRight size={16} />
              </div>
            </div>
          </div>
        ))}
        {filteredProblems.length === 0 && (
          <div className="empty-results glass">
            <Search size={48} className="empty-icon" />
            <h3>No problems found</h3>
            <p>Try adjusting your search or filters.</p>
            <button className="btn-v2-secondary" onClick={() => { setSearchTerm(''); setFilterDifficulty(''); }}>
              Reset Filters
            </button>
          </div>
        )}
      </div>

      <Pagination
        total={pagination.total}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={fetchProblems}
      />
    </div>
  );
};

export default ProblemList;
