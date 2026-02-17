import React from 'react';
import axios from 'axios';
import { Trash2, ExternalLink, CheckCircle, XCircle, AlertCircle, Clock, History as HistoryIcon } from 'lucide-react';
import Pagination from '../components/Pagination';

const History = ({ filter, setFilter, fetchSubmissions, submissions, onSelect, pagination }) => {
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear your entire submission history? This action cannot be undone.')) {
      try {
        await axios.delete('http://localhost:3000/submissions');
        fetchSubmissions();
      } catch (err) {
        console.error('Failed to clear history', err);
        alert('Failed to clear history');
      }
    }
  };

  const getStatusIcon = (verdict) => {
    switch (verdict) {
      case 'Accepted': return <CheckCircle size={18} className="text-success" />;
      case 'Wrong Answer': return <XCircle size={18} className="text-error" />;
      case 'Running': return <Clock size={18} className="text-accent animate-pulse" />;
      default: return <AlertCircle size={18} className="text-warning" />;
    }
  };

  return (
    <div className="history-view">
      <header className="history-header">
        <div className="header-title-row">
          <div className="title-group">
            <h2>Submission History</h2>
            <p className="subtitle">Track and revisit your past solutions</p>
          </div>
          <button className="btn-clear" onClick={handleClearHistory}>
            <Trash2 size={16} /> Clear History
          </button>
        </div>
        <div className="history-controls">
          <select
            className="filter-dropdown"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              fetchSubmissions(e.target.value, 1);
            }}
          >
            <option value="">All Status</option>
            <option value="Accepted">Accepted</option>
            <option value="Wrong Answer">Wrong Answer</option>
            <option value="Runtime Error">Runtime Error</option>
            <option value="Time Limit Exceeded">Time Limit Exceeded</option>
          </select>
        </div>
      </header>

      <div className="history-container glass">
        <table className="history-table-new">
          <thead>
            <tr>
              <th>Problem Title</th>
              <th>Status</th>
              <th>Submitted At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="history-row-clickable" onClick={() => onSelect(sub)}>
                <td>
                  <div className="problem-cell">
                    <span className="problem-name">{sub.problem_title || 'Custom Code'}</span>
                    <span className={`lang-badge ${sub.language || 'python'}`}>
                      {sub.language || 'python'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="status-cell">
                    {getStatusIcon(sub.verdict)}
                    <span className={`verdict-text ${sub.verdict.toLowerCase().replace(' ', '-')}`}>
                      {sub.verdict}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="date-text">{new Date(sub.created_at).toLocaleString()}</span>
                </td>
                <td>
                  <button className="btn-link">
                    Revisit <ExternalLink size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <div className="empty-state">
            <HistoryIcon size={48} className="empty-icon" />
            <p>No submissions found.</p>
          </div>
        )}
        <Pagination
          total={pagination.total}
          page={pagination.page}
          limit={pagination.limit}
          onPageChange={(p) => fetchSubmissions(filter, p)}
        />
      </div>
    </div>
  );
};

export default History;
