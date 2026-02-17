
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import {
  Play,
  Terminal,
  RotateCcw,
  Code2,
  Trash2
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import '../index.css';

const LANGUAGE_TEMPLATES = {
  python: '# Write your Python code here\nprint("Hello from Playground")',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello from Playground" << endl;\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Playground");\n    }\n}',
  kotlin: 'fun main() {\n    println("Hello from Playground")\n}',
  go: 'package main\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from Playground")\n}',
  php: '<?php\necho "Hello from Playground";\n?>',
  dart: 'void main() {\n  print("Hello from Playground");\n}',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello from Playground");\n    return 0;\n}',
  sql: 'SELECT "Hello from Playground";'
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

const Playground = ({ user }) => {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGE_TEMPLATES['python']);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setStatusLoading] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handlePlaygroundUpdate = (data) => {
      // Only update if it matches our current job
      if (data.jobId === currentJobId) {
        setOutput(data);
        setStatusLoading(false);
        setCurrentJobId(null);
      }
    };

    socket.on('playground_completed', handlePlaygroundUpdate);

    return () => {
      socket.off('playground_completed', handlePlaygroundUpdate);
    };
  }, [socket, currentJobId]);

  // Reset code when language changes
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(LANGUAGE_TEMPLATES[newLang]);
  };

  const handleRun = async () => {
    setStatusLoading(true);
    setOutput(null);
    try {
      const res = await axios.post('http://localhost:3000/submit', {
        code,
        input,
        language,
        problem_id: null, // Playground run
        user_id: user?.id
      });

      if (res.data.status === 'PENDING' && res.data.jobId) {
        setCurrentJobId(res.data.jobId);
        // We now wait for the socket event instead of polling
      } else {
        // Fallback for immediate response
        setOutput(res.data);
        setStatusLoading(false);
      }
    } catch (err) {
      setStatusLoading(false);
      setOutput({
        verdict: 'Error',
        actual_output: `Execution failed: ${err.message}`
      });
    }
  };

  return (
    <div className="solve-container">
      {/* Top Bar for Playground */}
      <div className="solve-top-bar glass">
        <div className="left-section">
          <div className="problem-meta">
            <Code2 size={24} className="text-accent" />
            <span className="problem-title-small">Code Playground</span>
          </div>
        </div>

        <div className="center-section">
          <div className="language-selector">
            <select value={language} onChange={handleLanguageChange} className="lang-select">
              <option value="python">Python</option>
              <option value="cpp">C++ (GCC)</option>
              <option value="java">Java 17</option>
              <option value="kotlin">Kotlin</option>
              <option value="go">Go</option>
              <option value="php">PHP</option>
              <option value="dart">Dart</option>
              <option value="c">C (GCC)</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>

        <div className="top-bar-right">
          <button className="btn-secondary" onClick={() => setCode(LANGUAGE_TEMPLATES[language])}>
            <RotateCcw size={16} /> Reset
          </button>
          <button className="btn-primary" disabled={loading} onClick={handleRun}>
            <Play size={16} /> {loading ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      <div className="playground-workspace">
        {/* Editor Area */}
        <div className="playground-editor glass">
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
              automaticLayout: true,
              scrollBeyondLastLine: false,
              padding: { top: 20 },
            }}
          />
        </div>

        {/* IO Panel (Right Side or Bottom) */}
        <div className="playground-io glass">
          {/* Input Section */}
          <div className="io-section input-section">
            <div className="io-header">
              <span>Input (Stdin)</span>
            </div>
            <textarea
              className="io-textarea"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter standard input here..."
            />
          </div>

          {/* Output Section */}
          <div className="io-section output-section">
            <div className="io-header">
              <Terminal size={14} />
              <span>Output</span>
            </div>
            <pre className={`io-output ${output?.verdict === 'Error' ? 'error' : ''}`}>
              {loading ? 'Executing...' : (output?.actual_output || 'Run code to see output')}
            </pre>
            {output && (
              <div className="run-meta">
                <span>Time: {output.execution_time || '0'}s</span>
                {output.verdict && output.verdict !== 'Accepted' && (
                  <span className="verdict-tag fail">{output.verdict}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playground;
