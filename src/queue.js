
const { Queue, Worker } = require('bullmq');
const { runCode } = require('./executor');
const { updateSubmission, query, getDifficultyPoints, getProblemById } = require('./db');
const IORedis = require('ioredis');

// Connect to Redis
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Create Queue
const submissionQueue = new Queue('submissionQueue', { connection });

// Redis Publisher for Socket.io
const redisPublisher = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null
});

// Worker Processor
const worker = new Worker('submissionQueue', async (job) => {
  const { submissionId, code, language, input, testCases, problemId, userId, isPlayground } = job.data;
  console.log(`Processing job ${job.id} for submission ${submissionId || 'playground'}`);

  try {
    if (!isPlayground) {
      await updateSubmission(submissionId, null, 'Running', 'RUNNING');
    }

    let finalVerdict = 'Accepted';
    let lastOutput = '';

    if (!isPlayground && testCases && testCases.length > 0) {
      // Problem Submission Strategy
      for (const testCase of testCases) {
        const result = await runCode(code, testCase.input, language);
        lastOutput = result.output;

        if (result.verdict !== 'Success') {
          finalVerdict = result.verdict;
          break;
        }

        if (result.output !== testCase.expected_output.trim()) {
          finalVerdict = 'Wrong Answer';
          break;
        }
      }
    } else {
      // Playground Strategy
      const result = await runCode(code, input || '', language);
      lastOutput = result.output;
      
      if (result.verdict !== 'Success') {
        finalVerdict = result.verdict;
      } else {
        finalVerdict = 'Accepted';
      }
    }

    // Update DB if it's a saved submission
    if (!isPlayground && submissionId) {
      await updateSubmission(submissionId, lastOutput, finalVerdict, 'COMPLETED');

      // Update Points if Accepted
      if (finalVerdict === 'Accepted' && userId && problemId) {
        const alreadySolvedRes = await query(
          'SELECT 1 FROM solved_problems WHERE user_id = $1 AND problem_id = $2',
          [userId, problemId]
        );
        
        if (alreadySolvedRes.rowCount === 0) {
          const problem = await getProblemById(problemId);
          const pts = getDifficultyPoints(problem.difficulty);
          await query('BEGIN');
          await query('INSERT INTO solved_problems (user_id, problem_id) VALUES ($1, $2)', [userId, problemId]);
          await query('UPDATE users SET points = points + $1 WHERE id = $2', [pts, userId]);
          await query('COMMIT');
        }
      }
    }

    // Publish to Redis for Real-time Update
    if (userId && submissionId) {
        // Saved Submission Update
        await redisPublisher.publish('submission_updates', JSON.stringify({
            userId,
            type: 'submission_completed',
            payload: {
                submissionId,
                verdict: finalVerdict,
                actual_output: lastOutput,
                status: 'COMPLETED'
            }
        }));
    } else if (userId && isPlayground) {
        // Playground Update
        await redisPublisher.publish('submission_updates', JSON.stringify({
            userId,
            type: 'playground_completed',
            payload: {
                jobId: job.id,
                verdict: finalVerdict,
                actual_output: lastOutput,
                status: 'COMPLETED'
            }
        }));
    }

    return {
      actual_output: lastOutput,
      verdict: finalVerdict,
      status: 'COMPLETED'
    };

  } catch (err) {
    console.error(`Job ${job.id} failed:`, err);
    if (!isPlayground && submissionId) {
        await updateSubmission(submissionId, err.message, 'Error', 'COMPLETED');
    }
    throw err;
  }
}, { connection, concurrency: 5 }); // Process 5 jobs at a time

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} failed with ${err.message}`);
});

module.exports = { submissionQueue };
