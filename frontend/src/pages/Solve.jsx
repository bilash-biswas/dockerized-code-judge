import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
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
  Code2,
  Settings,
  Maximize2,
  Info
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const LANGUAGE_TEMPLATES = {
  python: '# Write your Python solution here\n\ndef solve():\n    # Read input\n    # s = input()\n    # n = int(input())\n    \n    # Write logic here\n    print("Hello World")\n\nsolve()',
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
  const [activeSidebarTab, setActiveSidebarTab] = useState('description');
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcase'); // 'testcase' or 'result'
  const [showConsole, setShowConsole] = useState(true);
  const [showVerdict, setShowVerdict] = useState(false);
  const [language, setLanguage] = useState('python');
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (result && !loading) {
      setShowVerdict(true);
      setActiveConsoleTab('result');
      const timer = setTimeout(() => {
        setShowVerdict(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [result, loading]);

  useEffect(() => {
    if (!code || code === '# Write your Python solution here\n\ndef solve():\n    # Read input\n    # s = input()\n    # n = int(input())\n    \n    # Write logic here\n    print("Hello World")\n\nsolve()') {
      setCode(LANGUAGE_TEMPLATES[language]);
    }
  }, [language, code, setCode]);

  // Update custom input when test case changes
  useEffect(() => {
    if (selectedProblem?.test_cases?.length > 0) {
      setCustomInput(selectedProblem.test_cases[activeTestCaseIdx].input);
    } else if (selectedProblem?.sample_input) {
      setCustomInput(selectedProblem.sample_input);
    }
  }, [selectedProblem, activeTestCaseIdx]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang]);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setActiveConsoleTab('result');
    setRunResult({ verdict: 'Pending', actual_output: 'Executing test case...' });

    try {
      // For "Run", we use the playground mode (no problem_id) but with our custom input
      const res = await axios.post(`${API_BASE}/submit`, {
        code,
        language,
        input: customInput,
        expected_output: testCases[activeTestCaseIdx]?.expected_output
      });

      // Wait for result via polling
      let attempts = 0;
      const poll = setInterval(async () => {
        try {
          const check = await axios.get(`${API_BASE}/jobs/${res.data.jobId}`);
          if (check.data.state === 'completed' || attempts > 20) {
            clearInterval(poll);
            setRunResult(check.data.result);
            setIsRunning(false);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
          clearInterval(poll);
          setIsRunning(false);
        }
        attempts++;
      }, 1000);

    } catch (err) {
      setRunResult({ verdict: 'Error', actual_output: err.message });
      setIsRunning(false);
    }
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
  const testCases = selectedProblem.test_cases || (selectedProblem.sample_input ? [{ input: selectedProblem.sample_input, expected_output: selectedProblem.sample_output, is_sample: true }] : []);

  return (
    <div className="solve-container animate-in">
      {/* Top Navbar */}
      <div className="solve-nav-v3 glass">
        <div className="nav-left">
          <button onClick={() => setView('detail')} className="back-btn-rounded" title="Back">
            <ChevronLeft size={20} />
          </button>
          <div className="problem-info-pill">
            <span className="p-title">{selectedProblem.title}</span>
            <div className={`p-diff ${selectedProblem.difficulty?.toLowerCase()}`}></div>
          </div>
        </div>

        <div className="nav-center">
          <div className="lang-pill">
            <Code2 size={16} />
            <select value={language} onChange={handleLanguageChange}>
              <option value="python">Python 3</option>
              <option value="cpp">C++ 17</option>
              <option value="java">Java 17</option>
              <option value="kotlin">Kotlin</option>
              <option value="go">Go 1.21</option>
              <option value="php">PHP 8.2</option>
              <option value="dart">Dart</option>
              <option value="c">C</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>

        <div className="nav-right">
          <button className="btn-icon-v3" onClick={() => setCode(LANGUAGE_TEMPLATES[language])} title="Reset Code">
            <RotateCcw size={18} />
          </button>
          <button className="btn-icon-v3" title="Settings">
            <Settings size={18} />
          </button>
          <div className="action-btns">
            <button className="btn-run-v3" disabled={loading || isRunning} onClick={handleRun}>
              <Play size={16} /> Run
            </button>
            <button className="btn-submit-v3" disabled={loading || isRunning} onClick={handleSubmit}>
              <Send size={16} /> Submit
            </button>
          </div>
        </div>
      </div>

      <div className="solve-main-v3">
        {/* Left Pane - Problem Description */}
        <div className="pane-v3 description-pane glass">
          <div className="pane-tabs-v3">
            <button className={activeSidebarTab === 'description' ? 'active' : ''} onClick={() => setActiveSidebarTab('description')}>
              <FileText size={16} /> Description
            </button>
            <button className={activeSidebarTab === 'history' ? 'active' : ''} onClick={() => setActiveSidebarTab('history')}>
              <HistoryIcon size={16} /> Submissions
            </button>
            <button className={activeSidebarTab === 'hints' ? 'active' : ''} onClick={() => setActiveSidebarTab('hints')}>
              <Lightbulb size={16} /> Editorial
            </button>
          </div>

          <div className="pane-content-v3">
            {activeSidebarTab === 'description' && (
              <div className="description-view animate-in">
                <h2 className="v3-h2">{selectedProblem.title}</h2>
                <div className="v3-meta">
                  <span className={`v3-tag ${selectedProblem.difficulty?.toLowerCase()}`}>{selectedProblem.difficulty}</span>
                  <span className="v3-tag points"><Trophy size={14} /> {selectedProblem.points || 0}</span>
                  {selectedProblem.is_solved && (
                    <span className="v3-tag solved-tag"><CheckCircle size={14} /> Solved</span>
                  )}
                </div>
                {(selectedProblem.tags || []).length > 0 && (
                  <div className="v3-tags-row">
                    {selectedProblem.tags.map(tag => (
                      <span key={tag} className="v3-tag-chip">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="v3-desc-body">
                  <p className="bangla-para">{selectedProblem.description_bn}</p>

                  <div className="v3-section">
                    <h4><Info size={16} /> Input Format</h4>
                    <p>{selectedProblem.input_format_bn}</p>
                  </div>

                  <div className="v3-section">
                    <h4><Info size={16} /> Output Format</h4>
                    <p>{selectedProblem.output_format_bn}</p>
                  </div>

                  {testCases.filter(tc => tc.is_sample).map((tc, idx) => (
                    <div className="v3-sample-card" key={idx}>
                      <div className="sample-header">Sample Case {idx + 1}</div>
                      <div className="sample-grid">
                        <div className="sample-item">
                          <span>Input</span>
                          <pre>{tc.input}</pre>
                        </div>
                        <div className="sample-item">
                          <span>Output</span>
                          <pre>{tc.expected_output}</pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSidebarTab === 'history' && (
              <div className="history-view-v3 animate-in">
                <h3 className="v3-h3">Submission History</h3>
                <div className="v3-history-list">
                  {problemSubmissions.length > 0 ? (
                    problemSubmissions.map(sub => (
                      <div key={sub.id} className="v3-history-item">
                        <div className="v3-hi-status">
                          <span className={`verdict-v3 ${sub.verdict ? sub.verdict.toLowerCase().replace(' ', '-') : 'pending'}`}>
                            {sub.verdict === 'Accepted' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {sub.verdict || 'Processing'}
                          </span>
                          <span className="v3-hi-date">{new Date(sub.created_at).toLocaleString()}</span>
                        </div>
                        <div className="v3-hi-lang">{sub.language}</div>
                      </div>
                    ))
                  ) : (
                    <div className="v3-empty">No submissions yet</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Editor & Console */}
        <div className="pane-v3 editor-pane">
          <div className="editor-top-v3 glass">
            <div className="et-left">
              <Code2 size={16} /> <span>Main.{LANGUAGE_EXTENSIONS[language]}</span>
            </div>
            <div className="et-right">
              <Maximize2 size={14} className="icon-subtle" />
            </div>
          </div>

          <div className="editor-container-v3">
            <Editor
              height="100%"
              language={LANGUAGE_EXTENSIONS[language]}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val)}
              onMount={(editor) => {
                editor.focus();
              }}
              options={{
                fontSize: 16,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: true,
                lineHeight: 24,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8
                }
              }}
            />
          </div>

          {/* LeetCode Style Bottom Console */}
          <div className={`solve-console-v3 glass ${showConsole ? 'expanded' : 'collapsed'}`}>
            <div className="console-nav-v3">
              <div className="cn-tabs">
                <button className={activeConsoleTab === 'testcase' ? 'active' : ''} onClick={() => { setActiveConsoleTab('testcase'); setShowConsole(true); }}>
                  Testcase
                </button>
                <button className={activeConsoleTab === 'result' ? 'active' : ''} onClick={() => { setActiveConsoleTab('result'); setShowConsole(true); }}>
                  Result
                </button>
              </div>
              <button className="cn-toggle" onClick={() => setShowConsole(!showConsole)}>
                <span>Console</span>
                {showConsole ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>

            {showConsole && (
              <div className="console-body-v3">
                {activeConsoleTab === 'testcase' ? (
                  <div className="testcase-view animate-in">
                    <div className="case-tabs">
                      {testCases.map((tc, idx) => (
                        <button
                          key={idx}
                          className={activeTestCaseIdx === idx ? 'active' : ''}
                          onClick={() => setActiveTestCaseIdx(idx)}
                        >
                          Case {idx + 1}
                        </button>
                      ))}
                    </div>
                    <div className="case-content">
                      <label>Input =</label>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter your input here..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="result-view-v3 animate-in">
                    {(isRunning || loading) ? (
                      <div className="loading-results">
                        <div className="status-spinner large"></div>
                        <p>Running your code...</p>
                      </div>
                    ) : (runResult || result) ? (
                      <div className="results-content">
                        <div className={`res-verdict ${(runResult || result).verdict?.toLowerCase().replace(' ', '-')}`}>
                          {(runResult || result).verdict === 'Accepted' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                          {(runResult || result).verdict}
                        </div>

                        <div className="res-details">
                          <div className="res-item">
                            <label>Input</label>
                            <pre>{customInput}</pre>
                          </div>
                          <div className="res-item">
                            <label>Output</label>
                            <pre className="actual">{(runResult || result).actual_output || (runResult || result).output || 'No output'}</pre>
                          </div>
                          {selectedProblem.test_cases?.[activeTestCaseIdx]?.expected_output && (
                            <div className="res-item">
                              <label>Expected</label>
                              <pre>{selectedProblem.test_cases[activeTestCaseIdx].expected_output}</pre>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="res-idle">
                        <Play size={40} />
                        <p>No results yet. Run or Submit your code to see the output.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verdict Animation Overlay */}
      {showVerdict && result && result.verdict === 'Accepted' && (
        <div className="verdict-confetti animate-fade-in">
          <div className="success-card poof">
            <Trophy size={60} color="#ffd700" />
            <h1>All Test Cases Passed!</h1>
            <p>You've solved "{selectedProblem.title}"</p>
            <button className="btn-v3-accent" onClick={() => setShowVerdict(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solve;
