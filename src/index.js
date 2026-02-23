require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
  createSubmission, updateSubmission, query, getProblems, getProblemById, createProblem, addTestCase, getTestCases, getLatestAcceptedCode,
  createUser, findUserByEmail, findUserByUsername, getUserById, getLeaderboard, deleteSubmissions, updateProblem, deleteProblem, clearTestCases,
  getProblemsCount, getSubmissions, getSubmissionsCount, getLeaderboardCount, getDifficultyPoints,
  createBattle, startBattle, updateBattleSubmission, completeBattle, cancelBattle,
  getBattleById, getBattleHistory, getBattleHistoryCount, updateElo, getEloLeaderboard, getRandomProblem,
  getUserProfileStats, updateUserProfile
} = require('./db');
const { runCode } = require('./executor');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all for now, restrict in production
    methods: ["GET", "POST"]
  }
});

const IORedis = require('ioredis');
const redisSubscriber = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// ============ BATTLE MATCHMAKING STATE ============
const battleQueue = []; // In-memory queue: [{userId, socketId, elo, timestamp}]
const activeBattles = new Map(); // battleId -> {startedAt, timeLimit, timer, player1, player2}

// ELO Calculation
function calculateElo(winnerElo, loserElo, kFactor = 32) {
  const expectedWin = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const change = Math.round(kFactor * (1 - expectedWin));
  return change;
}

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined room user_${userId}`);
    }
  });

  // ============ BATTLE SOCKET EVENTS ============

  socket.on('battle_join_queue', async (data) => {
    const { userId, difficulty = 'Any' } = data;
    if (!userId) return;

    // Remove if already in queue
    const existingIdx = battleQueue.findIndex(q => q.userId === userId);
    if (existingIdx !== -1) battleQueue.splice(existingIdx, 1);

    const user = await getUserById(userId);
    if (!user) return;

    battleQueue.push({
      userId,
      socketId: socket.id,
      elo: user.elo_rating || 1200,
      difficulty,
      timestamp: Date.now()
    });

    socket.emit('battle_searching', { message: 'Searching for opponent...', queueSize: battleQueue.length });
    console.log(`User ${user.username} (ELO: ${user.elo_rating}) joined battle queue. Queue size: ${battleQueue.length}`);

    // Try immediate match
    await tryMatchmaking();
  });

  socket.on('battle_leave_queue', (data) => {
    const { userId } = data;
    const idx = battleQueue.findIndex(q => q.userId === userId);
    if (idx !== -1) {
      battleQueue.splice(idx, 1);
      socket.emit('battle_queue_left', { message: 'Left matchmaking queue' });
      console.log(`User ${userId} left battle queue. Queue size: ${battleQueue.length}`);
    }
  });

  socket.on('battle_typing', (data) => {
    const { battleId, userId, lineCount, language } = data;
    const battle = activeBattles.get(battleId);
    if (!battle) return;

    // Send to opponent
    const opponentId = String(battle.player1) === String(userId) ? battle.player2 : battle.player1;
    io.to(`user_${opponentId}`).emit('battle_opponent_typing', {
      battleId,
      lineCount,
      language
    });
  });

  socket.on('battle_forfeit', async (data) => {
    const { battleId, userId } = data;
    await handleBattleForfeit(battleId, userId);
  });

  socket.on('disconnect', () => {
    // Remove from battle queue on disconnect
    const idx = battleQueue.findIndex(q => q.socketId === socket.id);
    if (idx !== -1) {
      console.log(`Disconnected user removed from battle queue`);
      battleQueue.splice(idx, 1);
    }
    console.log('User disconnected:', socket.id);
  });
});

// ============ MATCHMAKING ENGINE ============

async function tryMatchmaking() {
  if (battleQueue.length < 2) return;

  // Sort by ELO for closest match
  battleQueue.sort((a, b) => a.elo - b.elo);

  // Find best pair (closest ELO AND compatible difficulty)
  let bestPair = null;
  let bestDiff = Infinity;
  let agreedDifficulty = 'Any';

  // O(N^2) search within queue for compatibility. Queue size usually small.
  for (let i = 0; i < battleQueue.length; i++) {
    for (let j = i + 1; j < battleQueue.length; j++) {
      const p1 = battleQueue[i];
      const p2 = battleQueue[j];

      // Difficulty compatibility check
      const d1 = p1.difficulty.toLowerCase();
      const d2 = p2.difficulty.toLowerCase();
      let matchDifficulty = 'any';

      if (d1 === d2) {
        matchDifficulty = d1;
      } else if (d1 === 'any') {
        matchDifficulty = d2;
      } else if (d2 === 'any') {
        matchDifficulty = d1;
      } else {
        continue; // Incompatible difficulties (e.g. Easy vs Hard)
      }

      const diff = Math.abs(p1.elo - p2.elo);
      const maxWait = Math.max(
        Date.now() - p1.timestamp,
        Date.now() - p2.timestamp
      );

      // Expand acceptable range based on wait time
      const acceptableRange = 200 + (maxWait / 1000) * 20;

      if (diff <= acceptableRange && diff < bestDiff) {
        bestDiff = diff;
        bestPair = [i, j]; // Note j is always > i
        agreedDifficulty = matchDifficulty;
      }
    }
  }

  if (!bestPair) return;

  const player2 = battleQueue.splice(bestPair[1], 1)[0]; // Remove higher index first
  const player1 = battleQueue.splice(bestPair[0], 1)[0]; // Then lower index

  console.log(`Match found! ${player1.userId} (ELO:${player1.elo}) vs ${player2.userId} (ELO:${player2.elo}) - Difficulty: ${agreedDifficulty}`);

  // Pick random problem matching criteria
  const problem = await getRandomProblem(agreedDifficulty);
  if (!problem) {
    console.error('No problems available for battle with difficulty:', agreedDifficulty);
    io.to(`user_${player1.userId}`).emit('battle_error', { message: 'No suitable problems available' });
    io.to(`user_${player2.userId}`).emit('battle_error', { message: 'No suitable problems available' });
    return;
  }

  const testCases = await getTestCases(problem.id);

  // Create battle in DB
  const battle = await createBattle(player1.userId, problem.id, 600);
  await startBattle(battle.id, player2.userId);

  const battleData = {
    battleId: battle.id,
    problem: { ...problem, test_cases: testCases.filter(tc => tc.is_sample) },
    timeLimit: 600,
    startsIn: 5 // 5 second countdown
  };

  const p1User = await getUserById(player1.userId);
  const p2User = await getUserById(player2.userId);

  // Emit match found to both
  io.to(`user_${player1.userId}`).emit('battle_found', {
    ...battleData,
    you: { username: p1User.username, elo: p1User.elo_rating },
    opponent: { username: p2User.username, elo: p2User.elo_rating }
  });

  io.to(`user_${player2.userId}`).emit('battle_found', {
    ...battleData,
    you: { username: p2User.username, elo: p2User.elo_rating },
    opponent: { username: p1User.username, elo: p1User.elo_rating }
  });

  // Store active battle state
  const battleState = {
    startedAt: Date.now() + 5000, // After countdown
    timeLimit: 600,
    player1: player1.userId,
    player2: player2.userId,
    player1Submitted: false,
    player2Submitted: false,
    problemId: problem.id,
    testCases
  };

  activeBattles.set(battle.id, battleState);

  // Start battle after countdown
  setTimeout(() => {
    io.to(`user_${player1.userId}`).emit('battle_start', { battleId: battle.id, startedAt: Date.now() });
    io.to(`user_${player2.userId}`).emit('battle_start', { battleId: battle.id, startedAt: Date.now() });

    // Set timer for battle end
    battleState.timer = setTimeout(async () => {
      await handleBattleTimeout(battle.id);
    }, 600 * 1000);
  }, 5000);
}

// Periodic matchmaking check
setInterval(() => {
  if (battleQueue.length >= 2) tryMatchmaking();
}, 2000);

async function handleBattleTimeout(battleId) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  const dbBattle = await getBattleById(battleId);
  if (!dbBattle || dbBattle.status === 'completed') return;

  // Determine winner based on submissions
  await determineBattleWinner(battleId);
}

async function handleBattleForfeit(battleId, userId) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  const winnerId = String(battle.player1) === String(userId) ? battle.player2 : battle.player1;
  const loserElo = (await getUserById(userId))?.elo_rating || 1200;
  const winnerElo = (await getUserById(winnerId))?.elo_rating || 1200;
  const eloChange = calculateElo(winnerElo, loserElo);

  await updateElo(winnerId, winnerElo + eloChange);
  await updateElo(userId, Math.max(0, loserElo - eloChange));
  await completeBattle(battleId, winnerId, eloChange);

  if (battle.timer) clearTimeout(battle.timer);
  activeBattles.delete(battleId);

  const winnerUser = await getUserById(winnerId);
  const loserUser = await getUserById(userId);

  const result = {
    battleId,
    winnerId,
    winnerUsername: winnerUser.username,
    reason: 'forfeit',
    eloChange,
    player1: { userId: battle.player1, elo: String(battle.player1) === String(winnerId) ? winnerElo + eloChange : loserElo - eloChange },
    player2: { userId: battle.player2, elo: String(battle.player2) === String(winnerId) ? winnerElo + eloChange : loserElo - eloChange }
  };

  io.to(`user_${battle.player1}`).emit('battle_end', result);
  io.to(`user_${battle.player2}`).emit('battle_end', result);
}

async function determineBattleWinner(battleId) {
  const battle = activeBattles.get(battleId);
  if (!battle) return;

  const dbBattle = await getBattleById(battleId);
  if (!dbBattle || dbBattle.status === 'completed') return;

  if (battle.timer) clearTimeout(battle.timer);

  const p1Accepted = dbBattle.player1_verdict === 'Accepted';
  const p2Accepted = dbBattle.player2_verdict === 'Accepted';

  let winnerId = null;
  let reason = 'draw';

  if (p1Accepted && p2Accepted) {
    // Both accepted -> faster wins
    winnerId = parseFloat(dbBattle.player1_submit_time) <= parseFloat(dbBattle.player2_submit_time)
      ? dbBattle.player1_id : dbBattle.player2_id;
    reason = 'speed';
  } else if (p1Accepted) {
    winnerId = dbBattle.player1_id;
    reason = 'accepted';
  } else if (p2Accepted) {
    winnerId = dbBattle.player2_id;
    reason = 'accepted';
  }

  let eloChange = 0;
  const p1Elo = dbBattle.player1_elo || 1200;
  const p2Elo = dbBattle.player2_elo || 1200;

  if (winnerId) {
    const loserId = winnerId === dbBattle.player1_id ? dbBattle.player2_id : dbBattle.player1_id;
    const winnerElo = winnerId === dbBattle.player1_id ? p1Elo : p2Elo;
    const loserElo = winnerId === dbBattle.player1_id ? p2Elo : p1Elo;
    eloChange = calculateElo(winnerElo, loserElo);

    await updateElo(winnerId, winnerElo + eloChange);
    await updateElo(loserId, Math.max(0, loserElo - eloChange));
  }

  await completeBattle(battleId, winnerId, eloChange);
  activeBattles.delete(battleId);

  const winnerUser = winnerId ? await getUserById(winnerId) : null;

  const result = {
    battleId,
    winnerId,
    winnerUsername: winnerUser?.username || null,
    reason,
    eloChange,
    player1: {
      userId: dbBattle.player1_id,
      username: dbBattle.player1_username,
      verdict: dbBattle.player1_verdict,
      submitTime: dbBattle.player1_submit_time,
      elo: winnerId === dbBattle.player1_id ? p1Elo + eloChange : (winnerId ? p1Elo - eloChange : p1Elo)
    },
    player2: {
      userId: dbBattle.player2_id,
      username: dbBattle.player2_username,
      verdict: dbBattle.player2_verdict,
      submitTime: dbBattle.player2_submit_time,
      elo: winnerId === dbBattle.player2_id ? p2Elo + eloChange : (winnerId ? p2Elo - eloChange : p2Elo)
    }
  };

  io.to(`user_${dbBattle.player1_id}`).emit('battle_end', result);
  io.to(`user_${dbBattle.player2_id}`).emit('battle_end', result);
}

// Redis Pub/Sub Listener
redisSubscriber.subscribe('submission_updates', (err, count) => {
  if (err) console.error('Failed to subscribe to submission_updates:', err);
});

redisSubscriber.on('message', (channel, message) => {
  if (channel === 'submission_updates') {
    const data = JSON.parse(message);
    const { userId, type, payload } = data;
    
    // Emit to specific user
    if (userId) {
      io.to(`user_${userId}`).emit(type, payload);
    }
    
    // Check for global leaderboard updates
    if (type === 'submission_completed' && payload.verdict === 'Accepted') {
       io.emit('leaderboard_update', { message: 'Leaderboard updated' });
    }
  }
});

app.use(cors());
app.use(express.json());

// Enhanced request logging
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`${new Date().toISOString()} - INCOMING: ${req.method} ${req.url}`);
  if (req.method !== 'GET') {
    console.log('REQ BODY:', JSON.stringify(req.body).substring(0, 500));
  }
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - COMPLETED: ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.get('/ping', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;

// Middleware for Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const optionalAuthenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = null;
      return next();
    }
    req.user = user;
    next();
  });
};

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingEmail = await findUserByEmail(email);
    const existingUser = await findUserByUsername(username);
    if (existingEmail || existingUser) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const user = await createUser(username, email, hash);
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    const { password_hash, ...userData } = user;
    res.json({ user: userData, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/leaderboard', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const leaderboard = await getLeaderboard(limit, offset);
    const total = await getLeaderboardCount();
    res.json({ data: leaderboard, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { submissionQueue } = require('./queue');

// ... (rest of imports)

app.post('/submit', async (req, res) => {
  const { code, problem_id, user_id, language = 'python' } = req.body;
  const input = req.body.input || null;
  const expected_output = req.body.expected_output || null;

  if (!code && !problem_id) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    let submission;
    let testCases = [];

    if (problem_id) {
      // Create initial submission record ONLY for problems
      submission = await createSubmission(code, input, expected_output, problem_id, user_id, language);
      await updateSubmission(submission.id, null, 'Queued', 'PENDING'); // Initial status PENDING
      
      // Fetch test cases to pass to worker
      testCases = await getTestCases(problem_id);
    }

    // Add job to Queue
    const job = await submissionQueue.add('executeCode', {
      submissionId: submission ? submission.id : null,
      code,
      language,
      input,
      expected_output,
      testCases,
      problemId: problem_id,
      userId: user_id,
      isPlayground: !problem_id
    });

    res.json({
      message: 'Submission queued',
      jobId: job.id,
      submissionId: submission ? submission.id : null,
      status: 'PENDING',
      verdict: 'Queued' // Visual feedback for frontend
    });

  } catch (err) {
    console.error('Submission Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.get('/submissions', authenticateToken, async (req, res) => {
  const { verdict } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const submissions = await getSubmissions(req.user.id, verdict, limit, offset);
    const total = await getSubmissionsCount(req.user.id, verdict);
    res.json({ data: submissions, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/submissions', authenticateToken, async (req, res) => {
  try {
    await deleteSubmissions(req.user.id);
    res.json({ message: 'History cleared successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/problems', optionalAuthenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const tag = req.query.tag || null;
  const difficulty = req.query.difficulty || null;
  const search = req.query.search || null;
  try {
    const problems = await getProblems(req.user?.id, limit, offset, tag, difficulty, search);
    const total = problems.length > 0 ? parseInt(problems[0].total_filtered_count) : 0;
    const cleanProblems = problems.map(({ total_filtered_count, ...p }) => p);
    res.json({ data: cleanProblems, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/problems/:id', optionalAuthenticateToken, async (req, res) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) return res.status(404).json({ error: 'Not Found' });
    const testCases = await getTestCases(req.params.id);
    const solvedCode = await getLatestAcceptedCode(req.params.id, req.user?.id);
    res.json({ ...problem, test_cases: testCases, solved_code: solvedCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/problems', async (req, res) => {
  const { title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags, test_cases } = req.body;
  const resolvedPoints = points != null ? parseInt(points) : ({ Easy: 1, Medium: 2, Hard: 3 }[difficulty] || 1);
  const resolvedTags = Array.isArray(tags) ? tags : [];
  try {
    const problem = await createProblem(title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, resolvedPoints, resolvedTags);
    if (test_cases && Array.isArray(test_cases)) {
      for (const tc of test_cases) {
        await addTestCase(problem.id, tc.input, tc.expected_output, tc.is_sample);
      }
    }
    res.json(problem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/problems/:id', async (req, res) => {
  const { title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags, test_cases } = req.body;
  const resolvedPoints = points != null ? parseInt(points) : ({ Easy: 1, Medium: 2, Hard: 3 }[difficulty] || 1);
  const resolvedTags = Array.isArray(tags) ? tags : [];
  try {
    const problem = await updateProblem(req.params.id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, resolvedPoints, resolvedTags);
    await clearTestCases(req.params.id);
    if (test_cases && Array.isArray(test_cases)) {
      for (const tc of test_cases) {
        await addTestCase(req.params.id, tc.input, tc.expected_output, tc.is_sample);
      }
    }
    res.json(problem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.delete('/problems/:id', async (req, res) => {
  try {
    const problem = await deleteProblem(req.params.id);
    res.json({ message: 'Problem deleted successfully', problem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/submissions/:id', async (req, res) => {
  try {
    const submissionId = req.params.id;
    // For playground jobs, they don't have a DB submission. 
    // We might need to check job status from Queue if we want to poll playground results.
    // However, existing DB function `getSubmissionById` (which we need to add/expose) would be good.
    // For now, let's assume this is for Saved Submissions.
    
    // We can reuse getSubmissions but filter by ID? Or add a new DB function.
    // Let's add a specific query here for simplicity or update db.js
    const result = await query('SELECT * FROM submissions WHERE id = $1', [submissionId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/jobs/:id', async (req, res) => {
  try {
     const job = await submissionQueue.getJob(req.params.id);
     if (!job) {
       return res.status(404).json({ error: 'Job not found' });
     }
     
     const state = await job.getState();
     const result = job.returnvalue;
     
     res.json({
       id: job.id,
       state,
       result, 
       error: job.failedReason
     });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ============ BATTLE REST ENDPOINTS ============

app.get('/battles/history/me', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const battles = await getBattleHistory(req.user.id, limit, offset);
    const total = await getBattleHistoryCount(req.user.id);
    res.json({ data: battles, total, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/battles/elo-leaderboard', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  try {
    const leaderboard = await getEloLeaderboard(limit, offset);
    res.json({ data: leaderboard, page, limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/battles/:id', authenticateToken, async (req, res) => {
  try {
    const battle = await getBattleById(req.params.id);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    // Get full test cases if battle is active and user is a participant
    if (battle.status === 'active' &&
      (battle.player1_id === req.user.id || battle.player2_id === req.user.id)) {
      const testCases = await getTestCases(battle.problem_id);
      const problem = await getProblemById(battle.problem_id);
      battle.problem = { ...problem, test_cases: testCases };
    }

    res.json(battle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/battles/:id/submit', authenticateToken, async (req, res) => {
  const { code, language = 'python' } = req.body;
  const battleId = req.params.id;
  const userId = req.user.id;

  try {
    const battle = activeBattles.get(battleId);
    if (!battle) return res.status(404).json({ error: 'Battle not found or already ended' });

    const dbBattle = await getBattleById(battleId);
    if (!dbBattle || dbBattle.status !== 'active') {
      return res.status(400).json({ error: 'Battle is not active' });
    }

    const isPlayer1 = String(dbBattle.player1_id) === String(userId);
    const isPlayer2 = String(dbBattle.player2_id) === String(userId);
    if (!isPlayer1 && !isPlayer2) return res.status(403).json({ error: 'Not a participant' });

    // Check if already submitted
    if ((isPlayer1 && battle.player1Submitted) || (isPlayer2 && battle.player2Submitted)) {
      return res.status(400).json({ error: 'Already submitted' });
    }

    const submitTime = (Date.now() - battle.startedAt) / 1000;

    // Run against all test cases
    let finalVerdict = 'Accepted';
    let lastOutput = '';

    for (let i = 0; i < battle.testCases.length; i++) {
      const tc = battle.testCases[i];
      const result = await runCode(code, tc.input, language);
      lastOutput = result.output;

      if (result.verdict !== 'Success') {
        finalVerdict = result.verdict;
        break;
      }

      const normalizedOutput = result.output.trim().replace(/\r\n/g, '\n');
      const normalizedExpected = (tc.expected_output || '').trim().replace(/\r\n/g, '\n');

      if (normalizedOutput !== normalizedExpected) {
        finalVerdict = 'Wrong Answer';
        break;
      }
    }

    // Update battle record
    await updateBattleSubmission(battleId, userId, code, language, finalVerdict, submitTime);

    if (isPlayer1) battle.player1Submitted = true;
    else battle.player2Submitted = true;

    // Notify opponent
    const opponentId = isPlayer1 ? battle.player2 : battle.player1;
    io.to(`user_${opponentId}`).emit('battle_opponent_submitted', {
      battleId,
      verdict: finalVerdict,
      submitTime
    });

    // Notify submitter of their own result
    io.to(`user_${userId}`).emit('battle_submission_result', {
      battleId,
      verdict: finalVerdict,
      output: lastOutput,
      submitTime
    });

    // Check if battle should end
    if (battle.player1Submitted && battle.player2Submitted) {
      await determineBattleWinner(battleId);
    } else if (finalVerdict === 'Accepted') {
      // If one player got Accepted, give opponent 60 more seconds max
      if (battle.timer) clearTimeout(battle.timer);
      battle.timer = setTimeout(async () => {
        await determineBattleWinner(battleId);
      }, 60 * 1000); // 60s grace period
    }

    res.json({ verdict: finalVerdict, output: lastOutput, submitTime });
  } catch (err) {
    console.error('Battle submit Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});



// ============ PROFILE REST ENDPOINTS ============

app.get('/users/:username/profile', optionalAuthenticateToken, async (req, res) => {
  let { username } = req.params;
  if (username === 'me') {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    username = user.username;
  }
  
  try {
    const stats = await getUserProfileStats(username);
    if (!stats) return res.status(404).json({ error: 'User not found' });
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.put('/users/me/profile', authenticateToken, async (req, res) => {
  const { bio, avatar_url } = req.body;
  try {
    const updated = await updateUserProfile(req.user.id, bio, avatar_url);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message, stack: err.stack });
});

server.listen(PORT, () => {
  console.log(`Execution Engine running on port ${PORT}`);
});
