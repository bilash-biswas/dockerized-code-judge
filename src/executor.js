const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

let k8sApi;
let k8s;

async function initK8s() {
    if (k8sApi) return k8sApi;
    
    // Dynamic import for ESM package in CJS
    k8s = await import('@kubernetes/client-node');
    
    const kc = new k8s.KubeConfig();
    try {
        kc.loadFromDefault();
    } catch (e) {
        kc.loadFromCluster();
    }
    k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    return k8sApi;
}

// Language configuration
const LANGUAGE_CONFIG = {
  python: { extension: 'py', image: 'python-runner:latest', compile: null, execute: (fileName) => `python3 "${fileName}.py"` },
  cpp: { extension: 'cpp', image: 'cpp-runner:latest', compile: (fileName) => `g++ -o "${fileName}" "${fileName}.cpp" -std=c++17`, execute: (fileName) => `./"${fileName}"` },
  java: { extension: 'java', image: 'java-runner:latest', compile: (fileName) => `javac "Main.java"`, execute: (fileName) => `java Main` },
  kotlin: { extension: 'kt', image: 'kotlin-runner:latest', compile: (fileName) => `kotlinc "${fileName}.kt" -include-runtime -d "${fileName}.jar"`, execute: (fileName) => `java -jar "${fileName}.jar"` },
  go: { extension: 'go', image: 'go-runner:latest', compile: null, execute: (fileName) => `go run "${fileName}.go"` },
  php: { extension: 'php', image: 'php-runner:latest', compile: null, execute: (fileName) => `php "${fileName}.php"` },
  dart: { extension: 'dart', image: 'dart-runner:latest', compile: null, execute: (fileName) => `dart run "${fileName}.dart"` },
  c: { extension: 'c', image: 'c-runner:latest', compile: (fileName) => `gcc -o "${fileName}" "${fileName}.c"`, execute: (fileName) => `./"${fileName}"` },
  sql: { extension: 'sql', image: 'sql-runner:latest', compile: null, execute: (fileName) => `sqlite3 :memory: < "${fileName}.sql"` }
};

const runCode = async (code, input, language = 'python', timeout = 5000) => {
    const strategy = process.env.EXECUTION_STRATEGY || 'k8s';
    
    if (strategy === 'docker') {
        return runCodeDocker(code, input, language, timeout);
    }

    try {
        return await runCodeK8s(code, input, language, timeout);
    } catch (err) {
        console.error('K8s Execution failed, falling back to Docker:', err.message);
        return runCodeDocker(code, input, language, timeout);
    }
};

const runCodeK8s = async (code, input, language = 'python', timeout = 5000) => {
  const api = await initK8s();
  const start = Date.now();
  const config = LANGUAGE_CONFIG[language];
  if (!config) return { verdict: 'Error', output: `Unsupported language: ${language}`, duration: 0 };

  const SANDBOX_NAMESPACE = process.env.K8S_SANDBOX_NAMESPACE || 'code-judge-sandbox';
  console.log(`Executing code in namespace: ${SANDBOX_NAMESPACE}`);

  const runId = uuidv4();
  const podName = `run-${runId}`;
  const fileName = language === 'java' ? 'Main' : runId;

  // For K8s, we need to cd into /home/sandbox/temp because that's where we write files
  let script = `
mkdir -p /home/sandbox/temp && cd /home/sandbox/temp
cat <<EOF > ${fileName}.${config.extension}
${code}
EOF
cat <<EOF > input.txt
${input || ''}
EOF
`;
  if (config.compile) script += `${config.compile(fileName)} && ${config.execute(fileName)} < input.txt`;
  else script += `${config.execute(fileName)} < input.txt`;

  const podManifest = {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name: podName,
      namespace: SANDBOX_NAMESPACE,
      labels: { app: 'execution-sandbox', runId: runId }
    },
    spec: {
      restartPolicy: 'Never',
      containers: [{
        name: 'runner',
        image: config.image,
        imagePullPolicy: 'IfNotPresent',
        command: ['sh', '-c', script],
        resources: { limits: { memory: '256Mi', cpu: '0.5' } },
        volumeMounts: [{ name: 'temp-storage', mountPath: '/home/sandbox/temp' }]
      }],
      volumes: [{ name: 'temp-storage', emptyDir: {} }]
    }
  };

  try {
    console.log(`Creating pod ${podName} in namespace ${SANDBOX_NAMESPACE}...`);
    // Modern @kubernetes/client-node (1.0+) uses object-based parameters
    await api.createNamespacedPod({ namespace: SANDBOX_NAMESPACE, body: podManifest });
    
    const result = await waitForPodCompletion(api, podName, SANDBOX_NAMESPACE, timeout);
    const logsRes = await api.readNamespacedPodLog({ name: podName, namespace: SANDBOX_NAMESPACE });
    const output = (logsRes.body || logsRes || '').trim();
    await api.deleteNamespacedPod({ name: podName, namespace: SANDBOX_NAMESPACE });
    return { verdict: result.verdict, output, duration: (Date.now() - start) / 1000 };
  } catch (err) {
    console.error('K8s Execution Error:', err);
    try { await api.deleteNamespacedPod({ name: podName, namespace: SANDBOX_NAMESPACE }); } catch {}
    throw err;
  }
};

const runCodeDocker = async (code, input, language = 'python', timeout = 5000) => {
    const start = Date.now();
    const config = LANGUAGE_CONFIG[language];
    if (!config) return { verdict: 'Error', output: `Unsupported language: ${language}`, duration: 0 };

    const runId = uuidv4();
    const fileName = language === 'java' ? 'Main' : runId;
    const tempDir = path.join(__dirname, '../temp', runId);
    
    // Ensure temp dir exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const codePath = path.join(tempDir, `${fileName}.${config.extension}`);
    const inputPath = path.join(tempDir, 'input.txt');

    fs.writeFileSync(codePath, code);
    fs.writeFileSync(inputPath, input || '');

    const volumeName = process.env.DOCKER_TEMP_VOLUME || 'execution_engine_temp';
    
    const script = config.compile 
        ? `${config.compile(fileName)} && ${config.execute(fileName)} < input.txt`
        : `${config.execute(fileName)} < input.txt`;

    try {
        // Use single quotes for sh -c to prevent inner double quotes from breaking the command
        const fullDockerCmd = `docker run --rm -v ${volumeName}:/home/sandbox/temp ${config.image} sh -c 'cd /home/sandbox/temp/${runId} && ${script}'`;

        const { stdout, stderr } = await execPromise(fullDockerCmd, { timeout });
        const output = (stdout || stderr || '').trim();
        
        return { verdict: 'Success', output, duration: (Date.now() - start) / 1000 };
    } catch (err) {
        console.error('Docker Execution Error:', err);
        let verdict = 'Runtime Error';
        if (err.killed && err.signal === 'SIGTERM') verdict = 'Time Limit Exceeded';
        return { verdict, output: err.stderr || err.stdout || err.message, duration: (Date.now() - start) / 1000 };
    } finally {
        // Cleanup temp dir
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    }
};

async function waitForPodCompletion(api, podName, namespace, timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const pod = await api.readNamespacedPod({ name: podName, namespace: namespace });
        const podData = pod.body || pod;
        const status = podData.status?.phase;
        
        if (status === 'Succeeded') return { verdict: 'Success' };
        if (status === 'Failed') return { verdict: 'Runtime Error', error: 'Pod failed' };
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return { verdict: 'Time Limit Exceeded' };
}

module.exports = { runCode };
