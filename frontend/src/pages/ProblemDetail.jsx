import React from 'react';
import {
  Rocket,
  ChevronLeft,
  Terminal,
  BookOpen,
  FileCode,
  Trophy,
  Activity
} from 'lucide-react';

const ProblemDetail = ({ selectedProblem, setView }) => {
  if (!selectedProblem) {
    return (
      <div className="loading-screen">
        <div className="status-spinner"></div>
        <span>Loading Problem Details...</span>
      </div>
    );
  }

  return (
    <div className="pd-v2-container animate-in">
      {/* Sleek Header */}
      <header className="pd-v2-header">
        <div className="header-nav">
          <button className="back-btn-v2" onClick={() => setView('list')}>
            <ChevronLeft size={16} /> Problems
          </button>
          <div className="breadcrumb-divider">/</div>
          <span className="current-path">{selectedProblem.title}</span>
        </div>
        <div className="header-main">
          <div className="title-section">
            <h1 className="v2-title">{selectedProblem.title}</h1>
            <div className="v2-badges">
              <span className={`pill-badge ${selectedProblem.difficulty?.toLowerCase()}`}>
                {selectedProblem.difficulty}
              </span>
              <span className="pill-badge points">
                <Trophy size={12} /> {selectedProblem.points || 0} pts
              </span>
            </div>
          </div>
          <button className="btn-v2-primary" onClick={() => setView('solve')}>
            Solve <Rocket size={18} />
          </button>
        </div>
      </header>

      <div className="pd-v2-workspace">
        {/* Main Content Area */}
        <div className="pd-v2-content">
          <section className="v2-block">
            <div className="v2-block-header">
              <BookOpen size={18} />
              <h3>Description</h3>
            </div>
            <div className="v2-block-body">
              <p className="bangla-text">{selectedProblem.description_bn}</p>
            </div>
          </section>

          <section className="v2-grid">
            <div className="v2-block">
              <div className="v2-block-header">
                <Terminal size={18} />
                <h3>Input Format</h3>
              </div>
              <div className="v2-block-body">
                <p className="bangla-text-small">{selectedProblem.input_format_bn}</p>
              </div>
            </div>
            <div className="v2-block">
              <div className="v2-block-header">
                <Activity size={18} />
                <h3>Output Format</h3>
              </div>
              <div className="v2-block-body">
                <p className="bangla-text-small">{selectedProblem.output_format_bn}</p>
              </div>
            </div>
          </section>

          <div className="v2-samples-row">
            <section className="v2-block sample">
              <div className="v2-block-header">
                <FileCode size={18} />
                <h3>Sample Input</h3>
              </div>
              <div className="v2-block-body">
                <pre className="v2-code">{selectedProblem.sample_input}</pre>
              </div>
            </section>
            <section className="v2-block sample">
              <div className="v2-block-header">
                <FileCode size={18} />
                <h3>Sample Output</h3>
              </div>
              <div className="v2-block-body">
                <pre className="v2-code">{selectedProblem.sample_output}</pre>
              </div>
            </section>
          </div>
        </div>

        {/* Mini Sidebar */}
        <aside className="pd-v2-sidebar">
          <div className="v2-sidebar-card">
            <h4>Problem Meta</h4>
            <div className="meta-list">
              <div className="meta-item">
                <span className="label">Language</span>
                <span className="val">Python 3.9</span>
              </div>
              <div className="meta-item">
                <span className="label">Time Limit</span>
                <span className="val">2.0s</span>
              </div>
              <div className="meta-item">
                <span className="label">Memory</span>
                <span className="val">128MB</span>
              </div>
            </div>
          </div>

          <div className="v2-sidebar-card info">
            <h4>Guidelines</h4>
            <ul className="v2-guidelines">
              <li>অপ্রয়োজনীয় আউটপুট দেবেন না।</li>
              <li>ইনপুট পড়ার নিয়মগুলো খেয়াল রাখুন।</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ProblemDetail;
