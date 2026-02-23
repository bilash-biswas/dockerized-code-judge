import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  Send, Clock, Code2, Flag, Trophy, XCircle,
  CheckCircle, Info, Minus, Zap
} from 'lucide-react';
import '../styles/battle.css';

const API_BASE = 'http://localhost:3000';

const LANGUAGE_TEMPLATES = {
  python: '# Write your solution here\n\ndef solve():\n    # Read input\n    # n = int(input())\n    \n    print("Hello World")\n\nsolve()',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    cout << "Hello World" << endl;\n    return 0;\n}',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}',
};

const LANGUAGE_EXTENSIONS = {
  python: 'python', cpp: 'cpp', java: 'java', c: 'c', go: 'go',
  kotlin: 'kotlin', php: 'php', dart: 'dart', sql: 'sql'
};

const BattleArena = () => {
  const { id: battleId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();

  const [battle, setBattle] = useState(null);
  const [code, setCode] = useState(LANGUAGE_TEMPLATES.python);
  const [language, setLanguage] = useState('python');
  const [timeLeft, setTimeLeft] = useState(600);
  const [battleStartedAt, setBattleStartedAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myResult, setMyResult] = useState(null);
  const [opponentInfo, setOpponentInfo] = useState({
    typing: false,
    lineCount: 0,
    language: 'python',
    submitted: false,
    verdict: null,
    lastTypingTime: 0,
  });
  const [battleResult, setBattleResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const typingTimeoutRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch battle data
  useEffect(() => {
    const fetchBattle = async () => {
      try {
        const res = await axios.get(`${API_BASE}/battles/${battleId}`);
        setBattle(res.data);
        if (res.data.started_at) {
          setBattleStartedAt(new Date(res.data.started_at).getTime());
        }
      } catch (err) {
        console.error('Failed to fetch battle:', err);
      }
    };
    fetchBattle();
  }, [battleId]);

  // Timer countdown
  useEffect(() => {
    if (!battleStartedAt || !battle) return;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - battleStartedAt) / 1000;
      const remaining = Math.max(0, (battle.time_limit || 600) - elapsed);
      setTimeLeft(Math.floor(remaining));

      if (remaining <= 0) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [battleStartedAt, battle]);

  // Socket events for battle
  useEffect(() => {
    if (!socket) return;

    socket.on('battle_opponent_typing', (data) => {
      if (data.battleId === battleId) {
        setOpponentInfo(prev => ({
          ...prev,
          typing: true,
          lineCount: data.lineCount,
          language: data.language,
          lastTypingTime: Date.now()
        }));

        // Reset typing indicator after 2 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setOpponentInfo(prev => ({ ...prev, typing: false }));
        }, 2000);
      }
    });

    socket.on('battle_opponent_submitted', (data) => {
      if (data.battleId === battleId) {
        setOpponentInfo(prev => ({
          ...prev,
          submitted: true,
          verdict: data.verdict,
          typing: false
        }));
      }
    });

    socket.on('battle_submission_result', (data) => {
      if (data.battleId === battleId) {
        setMyResult(data);
        setSubmitting(false);
        setHasSubmitted(true);
      }
    });

    socket.on('battle_end', (data) => {
      if (data.battleId === battleId) {
        setBattleResult(data);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    });

    return () => {
      socket.off('battle_opponent_typing');
      socket.off('battle_opponent_submitted');
      socket.off('battle_submission_result');
      socket.off('battle_end');
    };
  }, [socket, battleId]);

  // Send typing updates
  const handleCodeChange = useCallback((val) => {
    setCode(val);
    if (socket && user && battleId) {
      const lineCount = (val || '').split('\n').length;
      socket.emit('battle_typing', {
        battleId,
        userId: user.id,
        lineCount,
        language
      });
    }
  }, [socket, user, battleId, language]);

  const handleSubmit = async () => {
    if (submitting || hasSubmitted) return;
    setSubmitting(true);

    try {
      await axios.post(`${API_BASE}/battles/${battleId}/submit`, {
        code,
        language
      });
      // Result comes via socket event
    } catch (err) {
      console.error('Submit error:', err);
      setMyResult({
        verdict: 'Error',
        output: err.response?.data?.error || err.message
      });
      setSubmitting(false);
    }
  };

  const handleForfeit = () => {
    if (!socket || !user) return;
    if (window.confirm('Are you sure you want to forfeit? You will lose ELO.')) {
      socket.emit('battle_forfeit', { battleId, userId: user.id });
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (!hasSubmitted) {
      setCode(LANGUAGE_TEMPLATES[newLang] || `// Write your ${newLang} solution`);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeLeft > 300) return 'green';
    if (timeLeft > 60) return 'yellow';
    return 'red';
  };

  // Determine my info and opponent info from battle data
  const isPlayer1 = battle?.player1_id === user?.id;
  const myUsername = isPlayer1 ? battle?.player1_username : battle?.player2_username;
  const myElo = isPlayer1 ? battle?.player1_elo : battle?.player2_elo;
  const oppUsername = isPlayer1 ? battle?.player2_username : battle?.player1_username;
  const oppElo = isPlayer1 ? battle?.player2_elo : battle?.player1_elo;
  const problem = battle?.problem;

  if (!battle) {
    return (
      <div className="loading-screen">
        <div className="status-spinner"></div>
        <span>Loading Battle...</span>
      </div>
    );
  }

  return (
    <div className="battle-arena">
      {/* Battle Result Overlay */}
      {battleResult && (
        <BattleResultOverlay
          result={battleResult}
          userId={user?.id}
          onPlayAgain={() => navigate('/battle')}
          onBack={() => navigate('/dashboard')}
        />
      )}

      {/* Top Bar */}
      <div className="battle-top-bar">
        <div className="battle-player-info you">
          <span className="bpi-name">🟢 {myUsername || 'You'}</span>
          <span className="bpi-elo">{myElo || 1200}</span>
        </div>

        <div className="battle-vs">VS</div>

        <div className={`battle-timer ${getTimerClass()}`}>
          <Clock size={18} />
          {formatTimer(timeLeft)}
        </div>

        <div className="battle-vs">VS</div>

        <div className="battle-player-info opponent">
          <span className="bpi-name">🔴 {oppUsername || 'Opponent'}</span>
          <span className="bpi-elo">{oppElo || 1200}</span>
        </div>
      </div>

      {/* Main Area */}
      <div className="battle-main">
        {/* Problem Pane */}
        <div className="battle-problem-pane">
          <h2>{problem?.title || 'Loading problem...'}</h2>

          {problem?.difficulty && (
            <div className={`v3-tag ${problem.difficulty.toLowerCase()}`} style={{ marginBottom: '1rem', display: 'inline-block' }}>
              {problem.difficulty}
            </div>
          )}

          <div className="bp-section">
            <p style={{ whiteSpace: 'pre-line' }}>{problem?.description_bn}</p>
          </div>

          {problem?.input_format_bn && (
            <div className="bp-section">
              <h4><Info size={14} /> Input Format</h4>
              <p>{problem.input_format_bn}</p>
            </div>
          )}

          {problem?.output_format_bn && (
            <div className="bp-section">
              <h4><Info size={14} /> Output Format</h4>
              <p>{problem.output_format_bn}</p>
            </div>
          )}

          {problem?.test_cases?.filter(tc => tc.is_sample).map((tc, idx) => (
            <div key={idx} className="bp-section">
              <h4>Sample {idx + 1}</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Input</span>
                  <pre>{tc.input}</pre>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Output</span>
                  <pre>{tc.expected_output}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Editor Area */}
        <div className="battle-editor-area">
          <div className="battle-editor-header">
            <div className="lang-select">
              <Code2 size={16} />
              <select value={language} onChange={handleLanguageChange} disabled={hasSubmitted}>
                <option value="python">Python 3</option>
                <option value="cpp">C++ 17</option>
                <option value="java">Java 17</option>
                <option value="c">C</option>
                <option value="go">Go 1.21</option>
              </select>
            </div>

            <div className="battle-actions">
              <button
                className="btn-battle-forfeit"
                onClick={handleForfeit}
                disabled={hasSubmitted || !!battleResult}
              >
                <Flag size={14} /> Forfeit
              </button>
              <button
                className="btn-battle-submit"
                onClick={handleSubmit}
                disabled={submitting || hasSubmitted || !!battleResult}
              >
                <Send size={16} />
                {submitting ? 'Judging...' : hasSubmitted ? 'Submitted' : 'Submit'}
              </button>
            </div>
          </div>

          <div className="battle-editor-wrapper">
            <Editor
              height="100%"
              language={LANGUAGE_EXTENSIONS[language] || language}
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: 15,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: true,
                lineHeight: 22,
                readOnly: hasSubmitted,
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

          {/* My result */}
          {myResult && (
            <div className={`my-submission-result ${myResult.verdict === 'Accepted' ? 'accepted' : 'failed'}`}>
              {myResult.verdict === 'Accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {' '}{myResult.verdict}
              {myResult.submitTime && (
                <span style={{ marginLeft: '0.5rem', opacity: 0.7, fontSize: '0.8rem' }}>
                  in {myResult.submitTime.toFixed(1)}s
                </span>
              )}
            </div>
          )}
        </div>

        {/* Opponent Panel */}
        <div className="opponent-panel">
          <h3>Opponent</h3>

          <div className="opponent-status-card">
            <div className="osc-name">{oppUsername || '???'}</div>
            <div className="osc-elo">ELO {oppElo || 1200}</div>
          </div>

          <div className="opponent-stat">
            <span className="os-label">Language</span>
            <span className="os-value">{opponentInfo.language || '—'}</span>
          </div>

          <div className="opponent-stat">
            <span className="os-label">Lines</span>
            <span className="os-value">{opponentInfo.lineCount || 0}</span>
          </div>

          {opponentInfo.typing && !opponentInfo.submitted && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              Typing...
            </div>
          )}

          {opponentInfo.submitted && (
            <div className={`opponent-submitted-badge ${opponentInfo.verdict === 'Accepted' ? 'accepted' : 'failed'}`}>
              {opponentInfo.verdict === 'Accepted' ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {opponentInfo.verdict}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Battle Result Overlay Component
const BattleResultOverlay = ({ result, userId, onPlayAgain, onBack }) => {
  const won = result.winnerId === userId;
  const isDraw = !result.winnerId;

  const resultClass = won ? 'victory' : isDraw ? 'draw' : 'defeat';
  const icon = won
    ? <Trophy size={64} />
    : isDraw
      ? <Minus size={64} />
      : <XCircle size={64} />;

  const title = won ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';

  const reasonText = {
    speed: 'Both solved it — faster submission wins!',
    accepted: 'Correct solution beats incorrect',
    forfeit: 'Opponent forfeited the battle',
    draw: 'Neither player submitted a correct solution',
  }[result.reason] || '';

  const eloText = won
    ? `+${result.eloChange}`
    : isDraw
      ? '±0'
      : `-${result.eloChange}`;

  const eloClass = won ? 'positive' : isDraw ? 'neutral' : 'negative';

  return (
    <div className="battle-result-overlay">
      <div className={`battle-result-card ${resultClass}`}>
        <div className="result-icon">{icon}</div>
        <div className="result-title">{title}</div>
        <div className="result-reason">{reasonText}</div>

        <div className={`elo-change-display ${eloClass}`}>
          {eloText} ELO
        </div>

        <div className="result-players">
          <div className="result-player">
            <div className="rp-name" style={{ color: result.player1?.userId === userId ? '#6bcb77' : '#ff6b6b' }}>
              {result.player1?.username || 'Player 1'}
            </div>
            <div className={`rp-verdict ${result.player1?.verdict === 'Accepted' ? 'accepted' : 'failed'}`}>
              {result.player1?.verdict || 'No Submit'}
            </div>
            {result.player1?.submitTime && (
              <div className="rp-time">{parseFloat(result.player1.submitTime).toFixed(1)}s</div>
            )}
          </div>
          <div className="result-player">
            <div className="rp-name" style={{ color: result.player2?.userId === userId ? '#6bcb77' : '#ff6b6b' }}>
              {result.player2?.username || 'Player 2'}
            </div>
            <div className={`rp-verdict ${result.player2?.verdict === 'Accepted' ? 'accepted' : 'failed'}`}>
              {result.player2?.verdict || 'No Submit'}
            </div>
            {result.player2?.submitTime && (
              <div className="rp-time">{parseFloat(result.player2.submitTime).toFixed(1)}s</div>
            )}
          </div>
        </div>

        <button className="btn-play-again" onClick={onPlayAgain}>
          <Zap size={18} /> Play Again
        </button>
        <br />
        <button className="btn-back-lobby" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default BattleArena;
