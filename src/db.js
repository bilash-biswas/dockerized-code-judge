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
  const res = await query('SELECT id, username, email, points, bio, avatar_url, created_at FROM users WHERE id = $1', [id]);
  return res.rows[0];
};

const getLeaderboard = async (limit = 20, offset = 0) => {
  const res = await query(`
    SELECT username, points, 
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

const getProblems = async (userId = null, limit = 20, offset = 0) => {
  const res = await query(`
    SELECT p.*, 
    CASE WHEN $1::uuid IS NOT NULL THEN
      EXISTS (SELECT 1 FROM solved_problems sp WHERE sp.problem_id = p.id AND sp.user_id = $1)
    ELSE
      FALSE
    END as is_solved
    FROM problems p 
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);
  return res.rows;
};

const getProblemsCount = async () => {
  const res = await query('SELECT count(*) FROM problems');
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

const createProblem = async (title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty) => {
  const text = `
    INSERT INTO problems (title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const res = await query(text, [title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty]);
  return res.rows[0];
};

const updateProblem = async (id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty) => {
  const text = `
    UPDATE problems
    SET title = $2, description_bn = $3, input_format_bn = $4, output_format_bn = $5, 
        sample_input = $6, sample_output = $7, difficulty = $8
    WHERE id = $1
    RETURNING *;
  `;
  const res = await query(text, [id, title, description_bn, input_format_bn, output_format_bn, sample_input, sample_output, difficulty]);
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

const getDifficultyPoints = (difficulty) => {
  switch (difficulty ? difficulty.toLowerCase() : 'easy') {
    case 'hard': return 3;
    case 'medium': return 2;
    default: return 1;
  }
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
  getDifficultyPoints
};
