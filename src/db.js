const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const query = (text, params) => pool.query(text, params);

const createUser = async (username, email, passwordHash) => {
  const text = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, points, created_at;
  `;
  const res = await query(text, [username, email, passwordHash]);
  return res.rows[0];
};

const findUserByEmail = async (email) => {
  const res = await query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0];
};

const findUserByUsername = async (username) => {
  const res = await query('SELECT * FROM users WHERE username = $1', [username]);
  return res.rows[0];
};

const getUserById = async (id) => {
  const res = await query('SELECT id, username, email, points, bio, avatar_url, elo_rating, created_at FROM users WHERE id = $1', [id]);
  return res.rows[0];
};

const getLeaderboard = async (limit = 20, offset = 0) => {
  const res = await query(`
    SELECT username, points, avatar_url, created_at,
    (SELECT count(*) FROM solved_problems sp WHERE sp.user_id = u.id) as solved_count
    FROM users u 
    ORDER BY points DESC LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return res.rows;
};

const getLeaderboardCount = async () => {
  const res = await query('SELECT count(*) FROM users');
  return parseInt(res.rows[0].count);
};

const createSubmission = async (code, input, expected_output, problem_id = null, user_id = null, language = 'python') => {
  const text = `
    INSERT INTO submissions (code, input, expected_output, problem_id, user_id, language, verdict, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'Pending', 'PENDING')
    RETURNING *;
  `;
  const res = await query(text, [code, input, expected_output, problem_id, user_id, language]);
  return res.rows[0];
};

const updateSubmission = async (id, actual_output, verdict, status) => {
  const text = `
    UPDATE submissions
    SET actual_output = $2, verdict = $3, status = $4
    WHERE id = $1
    RETURNING *;
  `;
  const res = await query(text, [id, actual_output, verdict, status]);
  return res.rows[0];
};

const getProblems = async (userId = null, limit = 20, offset = 0, tag = null, difficulty = null, search = null) => {
  const params = [userId, limit, offset];
  let filters = [];

  if (tag) {
    params.push(tag);
    filters.push(`$${params.length} = ANY(p.tags)`);
  }
  if (difficulty) {
    params.push(difficulty);
    filters.push(`p.difficulty ILIKE $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    filters.push(`p.title ILIKE $${params.length}`);
  }

  const whereClause = filters.length > 0 ? 'AND ' + filters.join(' AND ') : '';

  const res = await query(`
    SELECT p.*, 
    CASE WHEN $1::uuid IS NOT NULL THEN
      EXISTS (SELECT 1 FROM solved_problems sp WHERE sp.problem_id = p.id AND sp.user_id = $1)
    ELSE
      FALSE
    END as is_solved,
    COUNT(*) OVER() as total_filtered_count
    FROM problems p 
    WHERE TRUE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `, params);
  return res.rows;
};

const getProblemsCount = async (tag = null, difficulty = null) => {
  const params = [];
  let filters = [];

  if (tag) {
    params.push(tag);
    filters.push(`$${params.length} = ANY(tags)`);
  }
  if (difficulty) {
    params.push(difficulty);
    filters.push(`difficulty ILIKE $${params.length}`);
  }

  const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
  const res = await query(`SELECT count(*) FROM problems ${whereClause}`, params);
  return parseInt(res.rows[0].count);
};

const getLatestAcceptedCode = async (problem_id, userId = null) => {
  if (!userId) return null;
  const res = await query(`
    SELECT code FROM submissions 
    WHERE problem_id = $1 AND user_id = $2 AND verdict = 'Accepted' 
    ORDER BY created_at DESC LIMIT 1
  `, [problem_id, userId]);
  return res.rows[0]?.code || null;
};

const getProblemById = async (id) => {
  const res = await query('SELECT * FROM problems WHERE id = $1', [id]);
  return res.rows[0];
};

const createProblem = async (title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points = 1, tags = []) => {
  const text = `
    INSERT INTO problems (title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *;
  `;
  const res = await query(text, [title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags]);
  return res.rows[0];
};

const updateProblem = async (id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags = []) => {
  const text = `
    UPDATE problems
    SET title = $2, description_bn = $3, input_format_bn = $4, output_format_bn = $5, 
        sample_input = $6, sample_output = $7, difficulty = $8, points = $9, tags = $10
    WHERE id = $1
    RETURNING *;
  `;
  const res = await query(text, [id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty, points, tags]);
  return res.rows[0];
};

const deleteProblem = async (id) => {
  const res = await query('DELETE FROM problems WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
};

const clearTestCases = async (problem_id) => {
  await query('DELETE FROM test_cases WHERE problem_id = $1', [problem_id]);
};

const addTestCase = async (problem_id, input, expected_output, is_sample = false) => {
  const text = `
    INSERT INTO test_cases (problem_id, input, expected_output, is_sample)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const res = await query(text, [problem_id, input, expected_output, is_sample]);
  return res.rows[0];
};

const getTestCases = async (problem_id) => {
  const res = await query('SELECT * FROM test_cases WHERE problem_id = $1', [problem_id]);
  return res.rows;
};

const deleteSubmissions = async (userId) => {
  const res = await query('DELETE FROM submissions WHERE user_id = $1 RETURNING *', [userId]);
  return res.rows;
};

const getSubmissions = async (userId, verdict = null, limit = 20, offset = 0) => {
  let whereClause = 'WHERE s.user_id = $3';
  const params = [limit, offset, userId];
  
  if (verdict) {
    whereClause += ' AND s.verdict = $4';
    params.push(verdict);
  }

  const res = await query(`
    SELECT s.*, p.title as problem_title 
    FROM submissions s 
    LEFT JOIN problems p ON s.problem_id = p.id 
    ${whereClause}
    ORDER BY s.created_at DESC 
    LIMIT $1 OFFSET $2
  `, params);
  return res.rows;
};

const getSubmissionsCount = async (userId, verdict = null) => {
  let whereClause = 'WHERE user_id = $1';
  const params = [userId];
  
  if (verdict) {
    whereClause += ' AND verdict = $2';
    params.push(verdict);
  }
  
  const res = await query(`SELECT count(*) FROM submissions ${whereClause}`, params);
  return parseInt(res.rows[0].count);
};

// getDifficultyPoints kept for backwards compatibility — now just reads problem.points directly in queue.js
// Fallback helper used only if problem.points is missing
const getDifficultyPoints = (difficulty) => {
  const map = { hard: 3, medium: 2, easy: 1 };
  return map[(difficulty || 'easy').toLowerCase()] || 1;
};

// ============ BATTLE FUNCTIONS ============

const createBattle = async (player1Id, problemId, timeLimit = 600) => {
  const res = await query(`
    INSERT INTO battles (player1_id, problem_id, time_limit, status)
    VALUES ($1, $2, $3, 'waiting')
    RETURNING *;
  `, [player1Id, problemId, timeLimit]);
  return res.rows[0];
};

const startBattle = async (battleId, player2Id) => {
  const res = await query(`
    UPDATE battles SET player2_id = $2, status = 'active', started_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [battleId, player2Id]);
  return res.rows[0];
};

const updateBattleSubmission = async (battleId, playerId, code, language, verdict, submitTime) => {
  // Determine if this player is player1 or player2
  const battle = await query('SELECT player1_id, player2_id FROM battles WHERE id = $1', [battleId]);
  if (!battle.rows[0]) return null;

  const isPlayer1 = battle.rows[0].player1_id === playerId;
  const prefix = isPlayer1 ? 'player1' : 'player2';

  const res = await query(`
    UPDATE battles
    SET ${prefix}_code = $2, ${prefix}_language = $3, ${prefix}_verdict = $4, ${prefix}_submit_time = $5
    WHERE id = $1
    RETURNING *;
  `, [battleId, code, language, verdict, submitTime]);
  return res.rows[0];
};

const completeBattle = async (battleId, winnerId, eloChange) => {
  const res = await query(`
    UPDATE battles SET winner_id = $2, elo_change = $3, status = 'completed', ended_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [battleId, winnerId, eloChange]);
  return res.rows[0];
};

const cancelBattle = async (battleId) => {
  const res = await query(`
    UPDATE battles SET status = 'cancelled', ended_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [battleId]);
  return res.rows[0];
};

const getBattleById = async (battleId) => {
  const res = await query(`
    SELECT b.*,
      u1.username as player1_username, u1.elo_rating as player1_elo,
      u2.username as player2_username, u2.elo_rating as player2_elo,
      p.title as problem_title, p.difficulty as problem_difficulty
    FROM battles b
    LEFT JOIN users u1 ON b.player1_id = u1.id
    LEFT JOIN users u2 ON b.player2_id = u2.id
    LEFT JOIN problems p ON b.problem_id = p.id
    WHERE b.id = $1;
  `, [battleId]);
  return res.rows[0];
};

const getBattleHistory = async (userId, limit = 20, offset = 0) => {
  const res = await query(`
    SELECT b.*,
      u1.username as player1_username, u1.elo_rating as player1_elo,
      u2.username as player2_username, u2.elo_rating as player2_elo,
      p.title as problem_title
    FROM battles b
    LEFT JOIN users u1 ON b.player1_id = u1.id
    LEFT JOIN users u2 ON b.player2_id = u2.id
    LEFT JOIN problems p ON b.problem_id = p.id
    WHERE (b.player1_id = $1 OR b.player2_id = $1) AND b.status = 'completed'
    ORDER BY b.ended_at DESC
    LIMIT $2 OFFSET $3;
  `, [userId, limit, offset]);
  return res.rows;
};

const getBattleHistoryCount = async (userId) => {
  const res = await query(
    `SELECT count(*) FROM battles WHERE (player1_id = $1 OR player2_id = $1) AND status = 'completed'`,
    [userId]
  );
  return parseInt(res.rows[0].count);
};

const updateElo = async (userId, newElo) => {
  const res = await query('UPDATE users SET elo_rating = $2 WHERE id = $1 RETURNING *', [userId, newElo]);
  return res.rows[0];
};

const getEloLeaderboard = async (limit = 20, offset = 0) => {
  const res = await query(`
    SELECT username, elo_rating, points, avatar_url, created_at,
      (SELECT count(*) FROM battles b WHERE (b.player1_id = u.id OR b.player2_id = u.id) AND b.status = 'completed') as battles_played,
      (SELECT count(*) FROM battles b WHERE b.winner_id = u.id) as battles_won
    FROM users u
    ORDER BY elo_rating DESC
    LIMIT $1 OFFSET $2;
  `, [limit, offset]);
  return res.rows;
};

const getRandomProblem = async (difficulty = 'Any') => {
  if (!difficulty || difficulty.toLowerCase() === 'any') {
    const res = await query('SELECT * FROM problems ORDER BY RANDOM() LIMIT 1');
    return res.rows[0];
  } else {
    // Exact match for 'Easy', 'Medium', 'Hard'
    const res = await query('SELECT * FROM problems WHERE difficulty ILIKE $1 ORDER BY RANDOM() LIMIT 1', [difficulty]);
    // Fallback if no problems of that difficulty exist
    if (res.rowCount === 0) {
      console.warn(`No problems found for difficulty ${difficulty}, falling back to any`);
      const fallback = await query('SELECT * FROM problems ORDER BY RANDOM() LIMIT 1');
      return fallback.rows[0];
    }
    return res.rows[0];
  }
};

// ============ PROFILE FUNCTIONS ============

const getUserProfileStats = async (username) => {
  // 1. Get user core data & determine ID
  const userRes = await query(`
    SELECT id, username, email, bio, avatar_url, points, elo_rating, created_at,
           (SELECT count(*) FROM users u2 WHERE u2.points > users.points) + 1 as points_rank,
           (SELECT count(*) FROM users u3 WHERE u3.elo_rating > users.elo_rating) + 1 as elo_rank
    FROM users 
    WHERE username = $1
  `, [username]);
  
  if (userRes.rowCount === 0) return null;
  const user = userRes.rows[0];
  const userId = user.id;

  // 2. Problem stats
  const probStats = await query(`
    SELECT p.difficulty, COUNT(*) as count 
    FROM solved_problems sp
    JOIN problems p ON sp.problem_id = p.id
    WHERE sp.user_id = $1
    GROUP BY p.difficulty
  `, [userId]);

  const solvedByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
  probStats.rows.forEach(r => {
    solvedByDifficulty[r.difficulty] = parseInt(r.count);
  });

  // 3. Battle stats
  const battleStats = await query(`
    SELECT 
      count(*) as total_battles,
      count(*) filter (where winner_id = $1) as won_battles
    FROM battles 
    WHERE (player1_id = $1 OR player2_id = $1) AND status = 'completed'
  `, [userId]);

  // 4. Recent activity
  const recentAct = await query(`
    SELECT s.id, s.verdict, s.language, s.created_at, p.title as problem_title
    FROM submissions s
    JOIN problems p ON s.problem_id = p.id
    WHERE s.user_id = $1
    ORDER BY s.created_at DESC
    LIMIT 10
  `, [userId]);

  return {
    ...user,
    solved_by_difficulty: solvedByDifficulty,
    battle_stats: {
      total: parseInt(battleStats.rows[0].total_battles) || 0,
      won: parseInt(battleStats.rows[0].won_battles) || 0
    },
    recent_activity: recentAct.rows
  };
};

const updateUserProfile = async (userId, bio, avatarUrl) => {
  const res = await query(`
    UPDATE users 
    SET bio = $2, avatar_url = $3 
    WHERE id = $1 
    RETURNING id, username, bio, avatar_url
  `, [userId, bio, avatarUrl]);
  return res.rows[0];
};


module.exports = {
  query,
  getProblems,
  getProblemById,
  createProblem,
  addTestCase,
  createSubmission,
  updateSubmission,
  getTestCases,
  getLatestAcceptedCode,
  deleteSubmissions,
  createUser,
  findUserByEmail,
  findUserByUsername,
  getUserById,
  getLeaderboard,
  updateProblem,
  deleteProblem,
  clearTestCases,
  getProblemsCount,
  getSubmissions,
  getSubmissionsCount,
  getLeaderboardCount,
  getDifficultyPoints,
  // Battle functions
  createBattle,
  startBattle,
  updateBattleSubmission,
  completeBattle,
  cancelBattle,
  getBattleById,
  getBattleHistory,
  getBattleHistoryCount,
  updateElo,
  getEloLeaderboard,
  getRandomProblem,
  getUserProfileStats,
  updateUserProfile
};

