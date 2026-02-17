import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Edit2, Trash2, Search, PlusCircle, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

const ManageProblems = ({ problems, pagination, fetchProblems, API_BASE }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirm, setShowConfirm] = useState(null);

  const filteredProblems = problems.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/problems/${id}`);
      fetchProblems(pagination.page);
      setShowConfirm(null);
    } catch (err) {
      console.error('Failed to delete problem', err);
      alert('Failed to delete problem');
    }
  };

  return (
    <div className="manage-problems-view animate-in">
      <header className="manage-header">
        <div className="header-left">
          <h2>Manage Problems</h2>
          <p className="subtitle">Edit details or remove problems from the platform</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/create')}>
          <PlusCircle size={18} /> Add New Problem
        </button>
      </header>

      <div className="glass filter-bar" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div className="search-group" style={{ flex: 1 }}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search problems by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="manage-table-container glass">
        <table className="manage-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Difficulty</th>
              <th>Points</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length > 0 ? (
              filteredProblems.map(problem => (
                <tr key={problem.id}>
                  <td>
                    <span className="problem-cell">{problem.title}</span>
                  </td>
                  <td>
                    <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td>
                    <span className="points-tag">{problem.points || 0} pts</span>
                  </td>
                  <td>
                    <span className="date-text">
                      {new Date(problem.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="manage-actions">
                      <button className="btn-edit" onClick={() => navigate(`/create/${problem.id}`)}>
                        <Edit2 size={16} /> Edit
                      </button>
                      <button className="btn-delete" onClick={() => setShowConfirm(problem.id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-state">
                  <div className="empty-text">No problems found matching your search.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        total={pagination.total}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={fetchProblems}
      />

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="verdict-overlay-backdrop" onClick={() => setShowConfirm(null)}>
          <div className="verdict-card-v2 failure animate-in" onClick={e => e.stopPropagation()} style={{ minWidth: '400px', padding: '40px' }}>
            <div className="verdict-icon-glow">
              <AlertCircle size={64} className="icon-failure" />
            </div>
            <h3 style={{ color: 'white', marginBottom: '10px' }}>Delete Problem?</h3>
            <p className="verdict-subtext" style={{ marginBottom: '30px' }}>
              Are you sure you want to delete this problem? This action cannot be undone and will remove all associated test cases and submissions.
            </p>
            <div className="manage-actions" style={{ gap: '20px' }}>
              <button className="btn-secondary" onClick={() => setShowConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ background: 'var(--error-color)', boxShadow: '0 4px 15px rgba(218, 54, 51, 0.4)' }}
                onClick={() => handleDelete(showConfirm)}
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProblems;
