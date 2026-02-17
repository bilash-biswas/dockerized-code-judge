import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout, History, User, Trophy, LogOut, Cpu, PlusSquare, Home, Settings, Code2 } from 'lucide-react';
import { Routes, Route, Navigate, useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import './index.css';

// Import Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import ProblemList from './pages/ProblemList';
import ProblemDetail from './pages/ProblemDetail';
import Solve from './pages/Solve';
import HistoryPage from './pages/History';
import CreateProblem from './pages/CreateProblem';
import Dashboard from './pages/Dashboard';
import ManageProblems from './pages/ManageProblems';
import Playground from './pages/Playground';

const API_BASE = 'http://localhost:3000';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Route-aware wrappers
const ProblemDetailWrapper = ({ fetchProblemById, selectedProblem, navigate }) => {
  const { id } = useParams();
  useEffect(() => {
    if (id) fetchProblemById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <ProblemDetail
      selectedProblem={selectedProblem}
      setView={(v) => navigate(v === 'list' ? '/problems' : `/solve/${id}`)}
    />
  );
};

const SolveWrapper = ({ fetchProblemById, selectedProblem, navigate, code, setCode, loading, result, submitSolution, setResult, submissions }) => {
  const { id } = useParams();
  useEffect(() => {
    if (id) fetchProblemById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Solve
      selectedProblem={selectedProblem}
      setView={(v) => navigate(v === 'detail' ? `/problems/${id}` : '/problems')}
      code={code}
      setCode={setCode}
      loading={loading}
      result={result}
      submitSolution={submitSolution}
      setResult={setResult}
      submissions={submissions}
    />
  );
};

function AppContent() {
  const { user, login, register, logout, loading: authLoading, fetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [problemsData, setProblemsData] = useState({ data: [], total: 0, page: 1, limit: 20 });
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [code, setCode] = useState('');
  const [submissionsData, setSubmissionsData] = useState({ data: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('');
  const [leaderboardData, setLeaderboardData] = useState({ data: [], total: 0, page: 1, limit: 20 });

  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (user) {
      fetchProblems();
      fetchSubmissions();
      // Only redirect to dashboard if at root or landing/login/register
      const authRoutes = ['/', '/login', '/register', '/landing'];
      if (authRoutes.includes(location.pathname)) {
        navigate('/dashboard');
      }
    } else if (!authLoading) {
      const protectedRoutes = ['/dashboard', '/problems', '/solve', '/history', '/profile', '/leaderboard', '/create'];
      if (protectedRoutes.some(route => location.pathname.startsWith(route))) {
        navigate('/login');
      }
    }
  }, [user, authLoading, location.pathname]);

  const fetchProblems = async (page = 1) => {
    try {
      const res = await axios.get(`${API_BASE}/problems?page=${page}`);
      setProblemsData(res.data);
    } catch (err) {
      console.error('Failed to fetch problems', err);
    }
  };

  const fetchSubmissions = async (verdict = '', page = 1) => {
    try {
      const query = `?page=${page}${verdict ? `&verdict=${verdict}` : ''}`;
      const res = await axios.get(`${API_BASE}/submissions${query}`);
      setSubmissionsData(res.data);
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    }
  };

  const fetchProblemById = async (id) => {
    if (selectedProblem?.id === parseInt(id)) return;
    try {
      const res = await axios.get(`${API_BASE}/problems/${id}`);
      setSelectedProblem(res.data);
      setCode(res.data.solved_code || '# write your python solution here\n\n');
      setResult(null);
    } catch (err) {
      console.error('Failed to fetch problem details', err);
    }
  };

  const handleSelectProblem = async (problemOrId) => {
    const id = typeof problemOrId === 'object' ? problemOrId.id : problemOrId;
    await fetchProblemById(id);
    navigate(`/problems/${id}`);
  };

  const handleSelectSubmission = async (sub) => {
    try {
      const res = await axios.get(`${API_BASE}/problems/${sub.problem_id}`);
      setSelectedProblem(res.data);
      setCode(sub.code);
      setResult({
        verdict: sub.verdict,
        actual_output: sub.actual_output
      });
      navigate(`/solve/${sub.problem_id}`);
    } catch (err) {
      console.error('Failed to load submission', err);
    }
  };

  const fetchLeaderboard = async (page = 1) => {
    try {
      const res = await axios.get(`${API_BASE}/leaderboard?page=${page}`);
      setLeaderboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(authData.email, authData.password);
      setAuthError('');
      navigate('/dashboard');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(authData.username, authData.email, authData.password);
      setAuthError('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Registration failed');
    }
  };

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('submission_completed', (data) => {
      // Only handle if it matches the current problem or if we want to show a notification
      // For now, if we are loading and this is a submission result, show it
      if (loading) { // Simple check, ideally check submission ID
        setResult({
          verdict: data.verdict,
          actual_output: data.actual_output
        });
        setLoading(false);
        fetchSubmissions();
        if (data.verdict === 'Accepted') {
          fetchUser();
        }
      } else {
        // Just refresh history if we aren't waiting for a result (e.g. background processing)
        fetchSubmissions();
      }
    });

    socket.on('leaderboard_update', () => {
      fetchLeaderboard();
    });

    return () => {
      socket.off('submission_completed');
      socket.off('leaderboard_update');
    };
  }, [socket, loading, fetchUser]);

  const submitSolution = async (solutionCode, solutionLanguage) => {
    setLoading(true);
    setResult({ verdict: 'Queued', actual_output: 'Waiting for worker...' }); // Immediate feedback
    try {
      const res = await axios.post(`${API_BASE}/submit`, {
        code: solutionCode,
        language: solutionLanguage,
        problem_id: selectedProblem?.id,
        user_id: user.id
      });

      if (res.data.status !== 'PENDING') {
        // Fallback for synchronous or immediate error
        setResult(res.data);
        setLoading(false);
        fetchSubmissions();
      }
      // If PENDING, we just wait for the socket event
    } catch (err) {
      console.error(err);
      setResult({
        verdict: 'Error',
        actual_output: `Failed to connect to server: ${err.message}`
      });
      setLoading(false);
    }
  };

  const getDifficultyPoints = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 100;
      case 'Medium': return 200;
      case 'Hard': return 300;
      default: return 0;
    }
  };

  if (authLoading) return <div className="loading-screen">Loading...</div>;

  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);

  return (
    <div className="container">
      {user && !isAuthPage && (
        <nav className="side-nav">
          <div className="nav-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <Cpu size={24} />
            <span>LogicBuild</span>
          </div>
          <div className="nav-items">
            <button onClick={() => navigate('/dashboard')} className={location.pathname === '/dashboard' ? 'active' : ''}>
              <Home size={20} /> Dashboard
            </button>
            <button onClick={() => navigate('/problems')} className={location.pathname.startsWith('/problems') ? 'active' : ''}>
              <Layout size={20} /> Problems
            </button>
            <button onClick={() => navigate('/playground')} className={location.pathname === '/playground' ? 'active' : ''}>
              <Code2 size={20} /> Playground
            </button>
            <button onClick={() => { navigate('/leaderboard'); fetchLeaderboard(); }} className={location.pathname === '/leaderboard' ? 'active' : ''}>
              <Trophy size={20} /> Leaderboard
            </button>
            <button onClick={() => navigate('/history')} className={location.pathname === '/history' ? 'active' : ''}>
              <History size={20} /> History
            </button>
            <button onClick={() => navigate('/profile')} className={location.pathname === '/profile' ? 'active' : ''}>
              <User size={20} /> Profile
            </button>
            <button onClick={() => navigate('/manage')} className={location.pathname.startsWith('/manage') || location.pathname.startsWith('/create') ? 'active' : ''}>
              <Settings size={20} /> Manage
            </button>
          </div>
          <div className="nav-bottom">
            <div className="user-info">
              <span className="user-pts">★ {user.points} pts</span>
            </div>
            <button onClick={logout} className="logout-btn">
              <LogOut size={20} /> Logout
            </button>
          </div>
        </nav>
      )}

      <div className={`main-content ${(!user || isAuthPage) ? 'full-width' : ''}`}>
        <Routes>
          <Route path="/" element={<Landing setView={(v) => navigate(`/${v}`)} />} />
          <Route path="/login" element={<Login API_BASE={API_BASE} onLogin={login} />} />
          <Route path="/register" element={<Register API_BASE={API_BASE} onRegister={register} />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard
                API_BASE={API_BASE}
                user={user}
                problems={problemsData.data}
                submissions={submissionsData.data}
                handleSelectProblem={handleSelectProblem}
              />
            </ProtectedRoute>
          } />

          <Route path="/problems" element={
            <ProtectedRoute>
              <ProblemList
                problems={problemsData.data}
                pagination={problemsData}
                fetchProblems={fetchProblems}
                onSelect={handleSelectProblem}
              />
            </ProtectedRoute>
          } />

          <Route path="/problems/:id" element={
            <ProtectedRoute>
              <ProblemDetailWrapper
                fetchProblemById={fetchProblemById}
                selectedProblem={selectedProblem}
                navigate={navigate}
              />
            </ProtectedRoute>
          } />

          <Route path="/solve/:id?" element={
            <ProtectedRoute>
              <SolveWrapper
                fetchProblemById={fetchProblemById}
                selectedProblem={selectedProblem}
                navigate={navigate}
                code={code}
                setCode={setCode}
                loading={loading}
                result={result}
                submitSolution={submitSolution}
                setResult={setResult}
                submissions={submissionsData.data}
              />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute>
              <HistoryPage
                submissions={submissionsData.data}
                pagination={submissionsData}
                fetchSubmissions={fetchSubmissions}
                onSelect={handleSelectSubmission}
                filter={historyFilter}
                setFilter={setHistoryFilter}
                API_BASE={API_BASE}
              />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard" element={
            <ProtectedRoute>
              <Leaderboard
                leaderboard={leaderboardData.data}
                pagination={leaderboardData}
                fetchLeaderboard={fetchLeaderboard}
              />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={<ProtectedRoute><Profile user={user} /></ProtectedRoute>} />

          <Route path="/create/:id?" element={
            <ProtectedRoute>
              <CreateProblem API_BASE={API_BASE} fetchProblems={fetchProblems} />
            </ProtectedRoute>
          } />

          <Route path="/playground" element={
            <ProtectedRoute>
              <Playground user={user} />
            </ProtectedRoute>
          } />

          <Route path="/manage" element={
            <ProtectedRoute>
              <ManageProblems
                problems={problemsData.data}
                pagination={problemsData}
                fetchProblems={fetchProblems}
                API_BASE={API_BASE}
              />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
