import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import {
  Send,
  ChevronLeft,
  RotateCcw,
  Terminal,
  FileText,
  Lightbulb,
  History as HistoryIcon,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertTriangle,
  Code2
} from 'lucide-react';

const LANGUAGE_TEMPLATES = {
  python: '# Write your Python solution here\n\ndef solve():\n    # Read input\n    # s = input()\n    # n = int(input())\n    # arr = list(map(int, input().split()))\n    \n    # Write logic here\n    print("Hello World")\n\nsolve()',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ solution here\n    cout << "Hello World" << endl;\n    return 0;\n}',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your Java solution here\n        System.out.println("Hello World");\n    }\n}',
  kotlin: 'import java.util.Scanner\n\nfun main() {\n    // Write your Kotlin solution here\n    println("Hello World")\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your Go solution here\n    fmt.Println("Hello World")\n}',
  php: '<?php\n// Write your PHP solution here\necho "Hello World";\n?>',
  dart: 'void main() {\n  // Write your Dart solution here\n  print("Hello World");\n}',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    printf("Hello World");\n    return 0;\n}',
  sql: '-- Write your SQL query here\nSELECT "Hello World";'
};

const LANGUAGE_EXTENSIONS = {
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  kotlin: 'kotlin',
  go: 'go',
  php: 'php',
  dart: 'dart',
  c: 'c',
  sql: 'sql'
};

const Solve = ({ selectedProblem, setView, code, setCode, loading, result, submitSolution, setResult, submissions }) => {
  const [activeTab, setActiveTab] = useState('description');
  const [showConsole, setShowConsole] = useState(true);
  const [showVerdict, setShowVerdict] = useState(false);
  const [language, setLanguage] = useState('python');

  useEffect(() => {
    if (result && !loading) {
      setShowVerdict(true);
      const timer = setTimeout(() => {
        setShowVerdict(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, loading]);

  useEffect(() => {
    // Set initial template if code is empty or language changes
    if (!code || code === '# write code here\n') { // Check for initial placeholder too
      setCode(LANGUAGE_TEMPLATES[language]);
    }
  }, [language, code, setCode]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang]);
  };

  const handleSubmit = () => {
    submitSolution(code, language);
  };

  if (!selectedProblem) {
    return (
      <div className="loading-screen">
        <div className="status-spinner"></div>
        <span>Loading Problem Details...</span>
      </div>
    );
  }

  const problemSubmissions = submissions.filter(s => s.problem_id === selectedProblem.id);

  return (
    <div className="solve-container">
      {/* Top Bar */}
      <div className="solve-top-bar glass">
        <div className="left-section">
          <button onClick={() => setView('detail')} className="icon-btn" title="Back to Problems">
            <ChevronLeft size={20} />
          </button>
          <div className="problem-meta">
            <span className="problem-title-small">{selectedProblem.title}</span>
            <span className={`difficulty-dot ${selectedProblem.difficulty?.toLowerCase()}`}></span>
          </div>
        </div>

        <div className="center-section">
          <div className="language-selector">
            <Code2 size={16} className="lang-icon" />
            <select value={language} onChange={handleLanguageChange} className="lang-select">
              <option value="python">Python</option>
              <option value="cpp">C++ (GCC 12)</option>
              <option value="java">Java 17</option>
              <option value="kotlin">Kotlin 1.9</option>
              <option value="go">Go 1.21</option>
              <option value="php">PHP 8.2</option>
              <option value="dart">Dart</option>
              <option value="c">C (GCC)</option>
              <option value="sql">SQL (SQLite)</option>
            </select>
          </div>
        </div>
        <div className="top-bar-right">
          <button className="btn-secondary" onClick={() => setCode(LANGUAGE_TEMPLATES[language])}>
            <RotateCcw size={16} /> Reset
          </button>
          <button className="btn-primary" disabled={loading} onClick={handleSubmit}>
            <Send size={16} /> Submit
          </button>
        </div>
      </div>

      <div className="solve-workspace">
        {/* Left Sidebar - Tabs */}
        <div className="workspace-sidebar glass">
          <div className="sidebar-tabs">
            <button
              className={activeTab === 'description' ? 'active' : ''}
              onClick={() => setActiveTab('description')}
            >
              <FileText size={18} /> Description
            </button>
            <button
              className={activeTab === 'hints' ? 'active' : ''}
              onClick={() => setActiveTab('hints')}
            >
              <Lightbulb size={18} /> Tips
            </button>
            <button
              className={activeTab === 'history' ? 'active' : ''}
              onClick={() => setActiveTab('history')}
            >
              <HistoryIcon size={18} /> History
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'description' && (
              <div className="tab-pane animate-in">
                <h3>{selectedProblem.title}</h3>
                <div className="difficulty-tag-row">
                  <span className={`tag ${selectedProblem.difficulty?.toLowerCase()}`}>
                    {selectedProblem.difficulty}
                  </span>
                  <span className="tag-points">{selectedProblem.points || 0} pts</span>
                </div>
                <div className="problem-desc-mini">
                  <p>{selectedProblem.description_bn}</p>
                </div>
                <div className="format-mini">
                  <h4>ইনপুট ফরম্যাট:</h4>
                  <p>{selectedProblem.input_format_bn}</p>
                  <h4>আউটপুট ফরম্যাট:</h4>
                  <p>{selectedProblem.output_format_bn}</p>
                </div>
                <div className="sample-mini">
                  <h4>স্যাম্পল ইনপুট:</h4>
                  <pre>{selectedProblem.sample_input}</pre>
                  <h4>স্যাম্পল আউটপুট:</h4>
                  <pre>{selectedProblem.sample_output}</pre>
                </div>
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="tab-pane animate-in">
                <h3>কোডিং টিপস</h3>
                <div className="tips-list">
                  <div className="tip-item">
                    <h5>ইনপুট নেয়া</h5>
                    <code>n = int(input())</code>
                    <p>একটি ইন্টিজার ইনপুট নিতে এটি ব্যবহার করুন।</p>
                  </div>
                  <div className="tip-item">
                    <h5>লিস্ট ইনপুট</h5>
                    <code>a, b = list(map(int, input().split()))</code>
                    <p>একাধিক সংখ্যা এক লাইনে নিতে এটি সবচেয়ে কার্যকর।</p>
                  </div>
                  <div className="tip-item">
                    <h5>আউটপুট</h5>
                    <code>print(f"Result: {result}")</code>
                    <p>formatted স্ট্রিং ব্যবহার করলে আউটপুট সুন্দর হয়।</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="tab-pane animate-in">
                <h3>আপনার সাবমিশন</h3>
                <div className="mini-history-list">
                  {problemSubmissions.length > 0 ? (
                    problemSubmissions.map(sub => (
                      <div key={sub.id} className="mini-history-item">
                        <div className="mini-sub-meta">
                          <span className={`verdict-dot ${sub.verdict ? sub.verdict.toLowerCase().replace(' ', '-') : 'pending'}`}></span>
                          <span className="mini-date">{new Date(sub.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="mini-verdict">{sub.verdict || 'Processing'}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-text">কোন সাবমিশন পাওয়া যায়নি</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Section */}
        <div className="workspace-main">
          <div className="editor-wrapper glass">
            <Editor
              height="100%"
              defaultLanguage="python"
              language={LANGUAGE_EXTENSIONS[language]}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val)}
              options={{
                fontSize: 18,
                fontFamily: 'JetBrains Mono',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20 },
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: true,
              }}
            />
          </div>

          {/* Terminal Console */}
          <div className={`console-tray glass ${showConsole ? 'expanded' : 'collapsed'}`}>
            <div className="console-header" onClick={() => setShowConsole(!showConsole)}>
              <div className="header-left">
                <Terminal size={16} />
                <span>Console</span>
                {loading && <div className="status-spinner"></div>}
              </div>
              <div className="header-right">
                {showConsole ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </div>
            </div>

            {showConsole && (
              <div className="console-body">
                {result ? (
                  <div className="result-content animate-in">
                    <div className="result-header-row">
                      <span className={`result-verdict-large ${result.verdict ? result.verdict.toLowerCase().replace(' ', '-') : 'pending'}`}>
                        {result.verdict === 'Accepted' ? <CheckCircle size={20} /> :
                          (result.verdict === 'Queued' || result.verdict === 'Running' || result.verdict === 'Pending' || !result.verdict) ? <Clock size={20} className="spin-slow" /> : <XCircle size={20} />}
                        {result.verdict || 'Processing...'}
                      </span>
                    </div>
                    <div className="output-section">
                      <h5>আউটপুট:</h5>
                      <pre className="terminal-output">{result.actual_output || 'No output produced.'}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="console-idle">
                    <Play size={32} className="idle-icon" />
                    <p>আপনার কোড রান করুন বা সাবমিট করুন ফলাফল দেখতে।</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verdict Overlay Animation */}
      {showVerdict && result && result.verdict && (
        <div className={`verdict-overlay-backdrop animate-fade-in`}>
          <div className={`verdict-card-v2 animate-pop-in ${result.verdict === 'Accepted' ? 'success' : 'failure'}`}>
            <div className="verdict-icon-glow">
              {result.verdict === 'Accepted' ? (
                <CheckCircle size={80} className="icon-success" />
              ) : (
                <AlertTriangle size={80} className="icon-failure" />
              )}
            </div>
            <h1 className="verdict-text-large">{result.verdict}</h1>
            <p className="verdict-subtext">
              {result.verdict === 'Accepted'
                ? 'Great job! Your solution passed all test cases.'
                : 'Your solution did not pass. Check the console for details.'}
            </p>
            {result.verdict === 'Accepted' && (
              <div className="reward-badge">
                <Trophy size={18} /> +{selectedProblem.points || 0} Points
              </div>
            )}
            <div className="verdict-progress-bar">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solve;
