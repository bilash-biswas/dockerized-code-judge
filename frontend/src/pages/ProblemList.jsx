import React, { useState, useCallback } from 'react';
import { CheckCircle, ChevronRight, Search, X } from 'lucide-react';
import Pagination from '../components/Pagination';

const ProblemList = ({ problems, pagination, fetchProblems, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Gather unique tags from all problems on the current page for the pill bar
  const allTags = [...new Set(problems.flatMap(p => p.tags || []))].sort();

  // Local search filter (instant, no re-fetch needed)
  const filteredProblems = searchTerm
    ? problems.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : problems;

  // Trigger server-side fetch with current active filters
  const applyFilter = useCallback((page = 1, newDiff = filterDifficulty, newTag = filterTag) => {
    fetchProblems(page, newTag, newDiff);
  }, [fetchProblems, filterDifficulty, filterTag]);

  const handleDifficultyToggle = (diff) => {
    const next = filterDifficulty === diff ? '' : diff;
    setFilterDifficulty(next);
    fetchProblems(1, filterTag, next);
  };

  const handleTagToggle = (tag) => {
    const next = filterTag === tag ? '' : tag;
    setFilterTag(next);
    fetchProblems(1, next, filterDifficulty);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDifficulty('');
    setFilterTag('');
    fetchProblems(1, '', '');
  };

  const difficultyOptions = ['Easy', 'Medium', 'Hard'];

  return (
    <div className="problem-list-view animate-in">
      <header className="list-header">
        <div className="header-text">
          <h1>Problem Library</h1>
          <p>Sharpen your logic with {pagination.total} diverse challenges.</p>
        </div>
      </header>

      {/* Filter Bar */}
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

        {/* Difficulty Pill Toggles */}
        <div className="filter-pills-row">
          <button
            className={`filter-pill ${filterDifficulty === '' ? 'active' : ''}`}
            onClick={() => { setFilterDifficulty(''); fetchProblems(1, filterTag, ''); }}
          >All</button>
          {difficultyOptions.map(d => (
            <button
              key={d}
              className={`filter-pill diff-${d.toLowerCase()} ${filterDifficulty === d ? 'active' : ''}`}
              onClick={() => handleDifficultyToggle(d)}
            >{d}</button>
          ))}
        </div>

        {/* Tag Pills — shown only when tags exist */}
        {allTags.length > 0 && (
          <div className="filter-pills-row tag-pills-row">
            <span className="pills-label">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter-pill tag-pill ${filterTag === tag ? 'active' : ''}`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag} {filterTag === tag && <X size={10} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Problem Cards */}
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

            {/* Tags on card */}
            {(p.tags || []).length > 0 && (
              <div className="card-tags">
                {p.tags.map(tag => (
                  <span key={tag} className="card-tag-chip">{tag}</span>
                ))}
              </div>
            )}

            <div className="card-footer">
              <span className="points-tag">+{p.points ?? '?'} pts</span>
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
            <button className="btn-v2-secondary" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination — passes active filters to page change */}
      <Pagination
        total={pagination.total}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={(page) => applyFilter(page)}
      />
    </div>
  );
};

export default ProblemList;
