const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { 
  createSubmission, updateSubmission, query, getProblems, getProblemById, createProblem, addTestCase, getTestCases, getLatestAcceptedCode,
  createUser, findUserByEmail, findUserByUsername, getUserById, getLeaderboard, deleteSubmissions, updateProblem, deleteProblem, clearTestCases,
  getProblemsCount, getSubmissions, getSubmissionsCount, getLeaderboardCount, getDifficultyPoints
} = require('./db');
const { runCode } = require('./executor');
require('dotenv').config();

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

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`Socket ${socket.id} joined room user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

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
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
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
  try {
    const problems = await getProblems(req.user?.id, limit, offset);
    const total = await getProblemsCount();
    res.json({ data: problems, total, page, limit });
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
  const { title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, test_cases } = req.body;
  try {
    const problem = await createProblem(title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty);
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
  const { title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, test_cases } = req.body;
  try {
    const problem = await updateProblem(req.params.id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty);
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

server.listen(PORT, () => {
  console.log(`Execution Engine running on port ${PORT}`);
});
