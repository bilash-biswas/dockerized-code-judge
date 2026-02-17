const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '../temp');

// Language configuration
const LANGUAGE_CONFIG = {
  python: {
    extension: 'py',
    image: 'python-runner',
    compile: null,
    execute: (runId) => `python3 "/home/sandbox/temp/${runId}.py"`
  },
  cpp: {
    extension: 'cpp',
    image: 'cpp-runner',
    compile: (runId) => `g++ -o "/home/sandbox/temp/${runId}" "/home/sandbox/temp/${runId}.cpp" -std=c++17`,
    execute: (runId) => `"/home/sandbox/temp/${runId}"`
  },
  java: {
    extension: 'java',
    image: 'java-runner',
    compile: (runId) => `javac "/home/sandbox/temp/Main.java"`,
    execute: (runId) => `java -cp "/home/sandbox/temp" Main`
  },
  kotlin: {
    extension: 'kt',
    image: 'kotlin-runner',
    compile: (runId) => `kotlinc "/home/sandbox/temp/${runId}.kt" -include-runtime -d "/home/sandbox/temp/${runId}.jar"`,
    execute: (runId) => `java -jar "/home/sandbox/temp/${runId}.jar"`
  },
  go: {
    extension: 'go',
    image: 'go-runner',
    compile: null,
    execute: (runId) => `go run "/home/sandbox/temp/${runId}.go"`
  },
  php: {
    extension: 'php',
    image: 'php-runner',
    compile: null,
    execute: (runId) => `php "/home/sandbox/temp/${runId}.php"`
  },
  dart: {
    extension: 'dart',
    image: 'dart-runner',
    compile: null,
    execute: (runId) => `dart run "/home/sandbox/temp/${runId}.dart"`
  },
  c: {
    extension: 'c',
    image: 'c-runner',
    compile: (runId) => `gcc -o "/home/sandbox/temp/${runId}" "/home/sandbox/temp/${runId}.c"`,
    execute: (runId) => `"/home/sandbox/temp/${runId}"`
  },
  sql: {
    extension: 'sql',
    image: 'sql-runner',
    compile: null,
    execute: (runId) => `sqlite3 :memory: < "/home/sandbox/temp/${runId}.sql"`
  }
};

const runCode = (code, input, language = 'python', timeout = 5000) => {
  return new Promise((resolve) => {
    const config = LANGUAGE_CONFIG[language];
    if (!config) {
      return resolve({ verdict: 'Error', output: `Unsupported language: ${language}`, duration: 0 });
    }

    const runId = uuidv4();
    const fileName = language === 'java' ? 'Main' : runId;
    const codeFile = path.join(TEMP_DIR, `${fileName}.${config.extension}`);
    const inputFile = path.join(TEMP_DIR, `${runId}.txt`);
    const compiledFile = path.join(TEMP_DIR, runId);

    // Write code and input to temp files with full permissions
    try {
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o777 });
      }
      fs.chmodSync(TEMP_DIR, 0o777); // Ensure directory is writable

      fs.writeFileSync(codeFile, code, { mode: 0o777 });
      fs.writeFileSync(inputFile, input || '', { mode: 0o777 });
    } catch (err) {
      console.error('File write error:', err);
      return resolve({ verdict: 'Internal Error', output: 'Failed to write code to disk', duration: 0 });
    }

    const mountSource = process.env.DOCKER_TEMP_VOLUME || TEMP_DIR;
    const start = Date.now();

    // Compilation step (if needed)
    if (config.compile) {
      const compileCmd = `docker run --rm --network none --memory 256m --cpus 0.5 -v "${mountSource}:/home/sandbox/temp" ${config.image} sh -c "${config.compile(runId)}"`;
      
      exec(compileCmd, { timeout: 10000 }, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          cleanup();
          return resolve({ 
            verdict: 'Compilation Error', 
            output: compileStderr || compileError.message, 
            duration: (Date.now() - start) / 1000 
          });
        }

        // Execute compiled code
        executeCode();
      });
    } else {
      // Execute directly
      executeCode();
    }

    function executeCode() {
      const executeCmd = `docker run --rm -i --network none --memory 128m --cpus 0.5 -v "${mountSource}:/home/sandbox/temp" ${config.image} sh -c "${config.execute(runId)}" < "${inputFile}"`;
      
      const child = exec(executeCmd, { timeout }, (error, stdout, stderr) => {
        const duration = (Date.now() - start) / 1000;
        cleanup();

        if (error) {
          if (child.killed || error.signal === 'SIGTERM') {
            return resolve({ verdict: 'Time Limit Exceeded', output: stderr || 'Execution timed out', duration });
          }
          return resolve({ verdict: 'Runtime Error', output: stderr || error.message, duration });
        }

        resolve({ verdict: 'Success', output: stdout.trim(), duration });
      });
    }

    function cleanup() {
      try {
        if (fs.existsSync(codeFile)) fs.unlinkSync(codeFile);
        if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
        if (fs.existsSync(compiledFile)) fs.unlinkSync(compiledFile);
        if (fs.existsSync(`${compiledFile}.jar`)) fs.unlinkSync(`${compiledFile}.jar`);
        if (fs.existsSync(path.join(TEMP_DIR, 'Main.class'))) fs.unlinkSync(path.join(TEMP_DIR, 'Main.class'));
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }
  });
};

module.exports = { runCode };
