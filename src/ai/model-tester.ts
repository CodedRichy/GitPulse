import { AIProviderFactory } from './providers.js';
import axios from 'axios';

async function fetchGroqModels() {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const url = 'https://api.groq.com/openai/v1/models';

  if (!GROQ_API_KEY) {
    return [];
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const models = response.data.data || [];
    
    return models.map((m: any) => m.id);
  } catch (error) {
    return [];
  }
}

interface ModelTestResult {
  model: string;
  available: boolean;
  error?: string;
  responseTime?: number;
  tokensPerSec?: number;
  capabilities: {
    codeGen: boolean;
    reasoning: boolean;
    vision: boolean;
    tools: boolean;
  };
  gitPulseTests: {
    commitMessage: { success: boolean; responseTime: number; quality: string };
    codeDoc: { success: boolean; responseTime: number; quality: string };
    codeReview: { success: boolean; responseTime: number; quality: string };
    refactoring: { success: boolean; responseTime: number; quality: string };
  };
}

// Use local Ollama model for testing
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Top 5 models for GitPulse based on previous testing
const TOP_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',  // Best overall
  'nvidia/nemotron-nano-9b-v2:free',         // Best for code
  'nvidia/nemotron-3-nano-30b-a3b:free',     // Good balance
  'nvidia/nemotron-nano-12b-v2-vl:free',    // Has vision
  'openai/gpt-oss-20b:free'                  // Very fast
];

// GitPulse-specific test cases
const GITPULSE_TESTS = {
  commitMessage: {
    prompt: `Generate a conventional commit message for these changes:

diff --git a/src/utils/config.ts b/src/utils/config.ts
index 1234567..abcdefg 100644
--- a/src/utils/config.ts
+++ b/src/utils/config.ts
@@ -10,7 +10,9 @@ export interface Config {
   aiProvider: 'openrouter' | 'ollama' | 'openai';
   openrouterApiKey?: string;
   ollamaHost?: string;
+  ollamaModel?: string;
+  openaiApiKey?: string;
 }
 
 export function loadConfig(): Config {`,
    systemPrompt: 'You are a git expert. Generate clear, conventional commit messages following the format: type(scope): description. Keep it concise and descriptive.'
  },
  codeDoc: {
    prompt: `Generate JSDoc documentation for this function:

function calculateMetrics(analysis: FileAnalysis): Metrics {
  const totalFunctions = analysis.functions.length;
  const documentedFunctions = analysis.functions.filter(f => f.hasJSDoc).length;
  const coverage = totalFunctions > 0 ? (documentedFunctions / totalFunctions) * 100 : 0;
  
  return {
    totalFunctions,
    documentedFunctions,
    coverage,
    undocumentedCount: totalFunctions - documentedFunctions
  };
}`,
    systemPrompt: 'You are a documentation expert. Generate comprehensive JSDoc comments including @param, @returns, and @description tags.'
  },
  codeReview: {
    prompt: `Review this code for potential issues and improvements:

async function processFile(filePath: string): Promise<void> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('TODO')) {
    }
  }
}`,
    systemPrompt: 'You are a senior code reviewer. Identify bugs, performance issues, security concerns, and suggest improvements.'
  },
  refactoring: {
    prompt: `Refactor this code to be more maintainable and follow best practices:

function getUserData(id: string, callback: Function) {
  db.query('SELECT * FROM users WHERE id = ?', [id], (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      db.query('SELECT * FROM orders WHERE user_id = ?', [id], (err2, orders) => {
        if (err2) {
          callback(err2, null);
        } else {
          callback(null, { user: result[0], orders: orders });
        }
      });
    }
  });
}`,
    systemPrompt: 'You are a refactoring expert. Convert callback-based code to modern async/await patterns and improve error handling.'
  }
};

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testGitPulseCapability(provider: 'openrouter' | 'ollama' | 'google' | 'groq', model: string, testName: 'commitMessage' | 'codeDoc' | 'codeReview' | 'refactoring'): Promise<{ success: boolean; responseTime: number; quality: string; input: string; output: string; error?: string }> {
  const test = GITPULSE_TESTS[testName];
  const startTime = Date.now();
  
  try {
    let aiProvider;
    if (provider === 'openrouter') {
      aiProvider = AIProviderFactory.create('openrouter', {
        openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
        model
      });
    } else if (provider === 'google') {
      aiProvider = AIProviderFactory.create('google', {
        googleApiKey: process.env.GOOGLE_API_KEY || '',
        model
      });
    } else if (provider === 'groq') {
      aiProvider = AIProviderFactory.create('groq', {
        groqApiKey: process.env.GROQ_API_KEY || '',
        model
      });
    } else {
      aiProvider = AIProviderFactory.create('ollama', {
        ollamaHost: OLLAMA_HOST,
        model
      });
    }

    const response = await aiProvider.generate(test.prompt, test.systemPrompt);
    const responseTime = Date.now() - startTime;

    // Quality assessment based on response length and content
    const quality = response.length > 50 ? 'Good' : response.length > 20 ? 'Fair' : 'Poor';
    
    return { success: true, responseTime, quality, input: test.prompt, output: response };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, responseTime, quality: 'Failed', input: test.prompt, output: '', error: errorMessage };
  }
}

async function testModelAvailability(model: string, providerType: 'openrouter' | 'ollama' | 'google' | 'groq'): Promise<ModelTestResult> {
  const result: ModelTestResult = {
    model,
    available: false,
    capabilities: {
      codeGen: false,
      reasoning: false,
      vision: false,
      tools: false
    },
    gitPulseTests: {
      commitMessage: { success: false, responseTime: 0, quality: 'Not tested' },
      codeDoc: { success: false, responseTime: 0, quality: 'Not tested' },
      codeReview: { success: false, responseTime: 0, quality: 'Not tested' },
      refactoring: { success: false, responseTime: 0, quality: 'Not tested' }
    }
  };

  try {
    let provider;
    if (providerType === 'openrouter') {
      provider = AIProviderFactory.create('openrouter', {
        openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
        model
      });
    } else if (providerType === 'google') {
      provider = AIProviderFactory.create('google', {
        googleApiKey: process.env.GOOGLE_API_KEY || '',
        model
      });
    } else if (providerType === 'groq') {
      provider = AIProviderFactory.create('groq', {
        groqApiKey: process.env.GROQ_API_KEY || '',
        model
      });
    } else {
      provider = AIProviderFactory.create('ollama', {
        ollamaHost: OLLAMA_HOST,
        model
      });
    }

    const startTime = Date.now();
    const isAvailable = await provider.isAvailable();
    const responseTime = Date.now() - startTime;

    if (isAvailable) {
      result.available = true;
      result.responseTime = responseTime;

      // Test basic capabilities
      try {
        await provider.generate('Write a simple function in JavaScript that adds two numbers.');
        result.capabilities.codeGen = true;
      } catch {
        result.capabilities.codeGen = false;
      }

      try {
        await provider.generate('What is 2 + 2? Explain your reasoning step by step.');
        result.capabilities.reasoning = true;
      } catch {
        result.capabilities.reasoning = false;
      }

      // Vision test would require image input - skip for now
      result.capabilities.vision = false;

      // Tools test - check if model supports function calling
      result.capabilities.tools = model.includes('tools') || model.includes('gemma-4') || model.includes('nemotron');

      // Run GitPulse-specific tests
      result.gitPulseTests.commitMessage = await testGitPulseCapability(providerType, model, 'commitMessage');
      result.gitPulseTests.codeDoc = await testGitPulseCapability(providerType, model, 'codeDoc');
      result.gitPulseTests.codeReview = await testGitPulseCapability(providerType, model, 'codeReview');
      result.gitPulseTests.refactoring = await testGitPulseCapability(providerType, model, 'refactoring');
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

async function getOllamaModels(): Promise<string[]> {
  try {
    const provider = AIProviderFactory.create('ollama', {
      ollamaHost: OLLAMA_HOST,
      model: 'dummy'
    });
    
    // Use the listModels method from OllamaProvider
    const ollamaProvider = provider as any;
    if (ollamaProvider.listModels) {
      const models = await ollamaProvider.listModels();
      return models;
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

async function testNetworkConnectivity(): Promise<{ connected: boolean; latency: number; stable: boolean; message: string }> {
  
  const testUrl = 'https://openrouter.ai/api/v1/auth/key';
  const iterations = 3;
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    try {
      const startTime = Date.now();
      await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}`
        },
        timeout: 10000
      });
      const latency = Date.now() - startTime;
      latencies.push(latency);
    } catch (error) {
      return {
        connected: false,
        latency: 0,
        stable: false,
        message: 'Network connection failed'
      };
    }
  }

  if (latencies.length === 0) {
    return {
      connected: false,
      latency: 0,
      stable: false,
      message: 'No successful network tests'
    };
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);
  const variance = maxLatency - minLatency;

  // Network quality assessment
  let quality = 'Poor';
  if (avgLatency < 500 && variance < 200) {
    quality = 'Excellent';
  } else if (avgLatency < 1000 && variance < 500) {
    quality = 'Good';
  } else if (avgLatency < 2000 && variance < 1000) {
    quality = 'Fair';
  }

  const stable = variance < 1000;
  const message = `Network quality: ${quality} (Avg: ${avgLatency.toFixed(0)}ms, Variance: ${variance.toFixed(0)}ms)`;


  return {
    connected: true,
    latency: avgLatency,
    stable,
    message
  };
}

// Contest challenges
const CONTEST_CHALLENGES = {
  round1: {
    name: 'Commit Message Generation',
    description: 'Generate a conventional commit message from a complex diff',
    input: `diff --git a/src/utils/analyzer.ts b/src/utils/analyzer.ts
index 1234567..abcdefg 100644
--- a/src/utils/analyzer.ts
+++ b/src/utils/analyzer.ts
@@ -15,7 +15,9 @@ export function analyzeFile(filePath: string): FileAnalysis {
   const content = fs.readFileSync(filePath, 'utf-8');
   const ast = parse(content, { sourceType: 'module' });
   
   const functions: FunctionInfo[] = [];
+  const classes: ClassInfo[] = [];
   
   traverse(ast, {
     FunctionDeclaration(path) {
@@ -45,6 +47,15 @@ export function analyzeFile(filePath: string): FileAnalysis {
     }
   });
   
+  traverse(ast, {
+    ClassDeclaration(path) {
+      classes.push({
+        name: path.node.id?.name || 'anonymous',
+        methods: []
+      });
+    }
+  });
+
   return {
     functions,
+    classes,
     imports,
     exports,
     documentationCoverage
   };`,
    systemPrompt: 'You are an expert at writing conventional commit messages. Generate a clear, concise commit message following the conventional commit format: type(scope): description. Keep it under 72 characters for the title line.'
  },
  round2: {
    name: 'Code Documentation',
    description: 'Generate JSDoc for a complex function with multiple edge cases',
    input: `function validateUserInput(input: any, options: ValidationOptions = {}): ValidationResult {
  const { maxLength = 1000, minLength = 1, allowEmpty = false } = options;
  
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }
  
  if (!allowEmpty && input.trim().length === 0) {
    return { valid: false, error: 'Input cannot be empty' };
  }
  
  if (input.length < minLength) {
    return { valid: false, error: \`Input must be at least \${minLength} characters\` };
  }
  
  if (input.length > maxLength) {
    return { valid: false, error: \`Input must not exceed \${maxLength} characters\` };
  }
  
  const specialChars = /[<>]/;
  if (specialChars.test(input)) {
    return { valid: false, error: 'Input contains invalid characters' };
  }
  
  return { valid: true, value: input.trim() };
}`,
    systemPrompt: 'You are a documentation expert. Generate comprehensive JSDoc comments for the function including: description, parameters with types, return type, examples, and edge cases.'
  },
  round3: {
    name: 'Code Review',
    description: 'Find bugs, security issues, and performance problems in this code',
    input: `async function fetchUserData(userId: string): Promise<User> {
  const cacheKey = \`user_\${userId}\`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
  const result = await db.query(query);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  cache.set(cacheKey, JSON.stringify(user));
  
  return user;
}`,
    systemPrompt: 'You are a senior code reviewer. Analyze the code for: SQL injection vulnerabilities, caching issues, error handling, performance problems, and best practices. Provide specific, actionable feedback.'
  },
  round4: {
    name: 'Refactoring',
    description: 'Convert this callback-based code to modern async/await pattern',
    input: `function getUserWithOrders(userId: string, callback: (error: Error | null, data?: { user: User, orders: Order[] }) => void) {
  db.query(\`SELECT * FROM users WHERE id = '\${userId}'\`, (err, userResult) => {
    if (err) {
      return callback(err);
    }
    
    if (userResult.rows.length === 0) {
      return callback(new Error('User not found'));
    }
    
    const user = userResult.rows[0];
    
    db.query(\`SELECT * FROM orders WHERE user_id = '\${userId}'\`, (err2, orderResult) => {
      if (err2) {
        return callback(err2);
      }
      
      callback(null, { user, orders: orderResult.rows });
    });
  });
}`,
    systemPrompt: 'You are a refactoring expert. Convert the callback-based code to modern async/await patterns. Improve error handling, add proper typing, and make it more readable.'
  }
};

interface ContestResult {
  model: string;
  provider: string;
  rounds: {
    round1: { input: string; output: string; score: number; time: number; reasoning: string };
    round2: { input: string; output: string; score: number; time: number; reasoning: string };
    round3: { input: string; output: string; score: number; time: number; reasoning: string };
    round4: { input: string; output: string; score: number; time: number; reasoning: string };
  };
  totalScore: number;
  totalTime: number;
}

async function runContest() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           GITPULSE AI MODEL CONTEST 2026                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const contestants = [
    { name: 'Google Gemini', provider: 'google', model: 'gemini-3.1-flash-lite-preview' },
    { name: 'Groq llama-4-scout', provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
    { name: 'Groq llama-3.3-70b', provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { name: 'Ollama gemma4', provider: 'ollama', model: 'gemma4:e2b' }
  ];
  
  const results: ContestResult[] = [];
  
  for (const contestant of contestants) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 Contestant: ${contestant.name} (${contestant.model})`);
    console.log(`${'='.repeat(60)}\n`);
    
    const contestResult: ContestResult = {
      model: contestant.model,
      provider: contestant.provider,
      rounds: { round1: { input: '', output: '', score: 0, time: 0, reasoning: '' }, round2: { input: '', output: '', score: 0, time: 0, reasoning: '' }, round3: { input: '', output: '', score: 0, time: 0, reasoning: '' }, round4: { input: '', output: '', score: 0, time: 0, reasoning: '' } },
      totalScore: 0,
      totalTime: 0
    };
    
    // Round 1: Commit Message
    console.log(`📝 Round 1: ${CONTEST_CHALLENGES.round1.name}`);
    console.log(`   ${CONTEST_CHALLENGES.round1.description}\n`);
    console.log('   INPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + CONTEST_CHALLENGES.round1.input.split('\n').join('\n   '));
    console.log('   ' + '─'.repeat(56));
    
    const r1Start = Date.now();
    let r1Provider;
    if (contestant.provider === 'google') {
      r1Provider = AIProviderFactory.create('google', { googleApiKey: process.env.GOOGLE_API_KEY || '', model: contestant.model });
    } else if (contestant.provider === 'groq') {
      r1Provider = AIProviderFactory.create('groq', { groqApiKey: process.env.GROQ_API_KEY || '', model: contestant.model });
    } else {
      r1Provider = AIProviderFactory.create('ollama', { ollamaHost: OLLAMA_HOST, model: contestant.model });
    }
    
    const r1Output = await r1Provider.generate(CONTEST_CHALLENGES.round1.input, CONTEST_CHALLENGES.round1.systemPrompt);
    const r1Time = Date.now() - r1Start;
    
    contestResult.rounds.round1 = {
      input: CONTEST_CHALLENGES.round1.input,
      output: r1Output,
      score: r1Output.length > 20 && r1Output.includes(':') ? 25 : r1Output.length > 10 ? 15 : 5,
      time: r1Time,
      reasoning: r1Output.length > 20 ? 'Proper conventional commit format' : 'Incomplete or incorrect format'
    };
    
    console.log('   OUTPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + r1Output);
    console.log('   ' + '─'.repeat(56));
    console.log(`   ⏱️  Time: ${r1Time}ms | 📊 Score: ${contestResult.rounds.round1.score}/25\n`);
    
    await delay(2000);
    
    // Round 2: Code Documentation
    console.log(`📚 Round 2: ${CONTEST_CHALLENGES.round2.name}`);
    console.log(`   ${CONTEST_CHALLENGES.round2.description}\n`);
    console.log('   INPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + CONTEST_CHALLENGES.round2.input.split('\n').join('\n   '));
    console.log('   ' + '─'.repeat(56));
    
    const r2Start = Date.now();
    const r2Output = await r1Provider.generate(CONTEST_CHALLENGES.round2.input, CONTEST_CHALLENGES.round2.systemPrompt);
    const r2Time = Date.now() - r2Start;
    
    contestResult.rounds.round2 = {
      input: CONTEST_CHALLENGES.round2.input,
      output: r2Output,
      score: r2Output.includes('@param') && r2Output.includes('@returns') ? 25 : r2Output.length > 50 ? 15 : 5,
      time: r2Time,
      reasoning: r2Output.includes('@param') ? 'Proper JSDoc format' : 'Missing JSDoc tags'
    };
    
    console.log('   OUTPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + r2Output);
    console.log('   ' + '─'.repeat(56));
    console.log(`   ⏱️  Time: ${r2Time}ms | 📊 Score: ${contestResult.rounds.round2.score}/25\n`);
    
    await delay(2000);
    
    // Round 3: Code Review
    console.log(`🔍 Round 3: ${CONTEST_CHALLENGES.round3.name}`);
    console.log(`   ${CONTEST_CHALLENGES.round3.description}\n`);
    console.log('   INPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + CONTEST_CHALLENGES.round3.input.split('\n').join('\n   '));
    console.log('   ' + '─'.repeat(56));
    
    const r3Start = Date.now();
    const r3Output = await r1Provider.generate(CONTEST_CHALLENGES.round3.input, CONTEST_CHALLENGES.round3.systemPrompt);
    const r3Time = Date.now() - r3Start;
    
    const r3Issues = (r3Output.match(/vulnerabilit|injection|security|bug|issue|problem/i) || []).length;
    contestResult.rounds.round3 = {
      input: CONTEST_CHALLENGES.round3.input,
      output: r3Output,
      score: r3Issues >= 2 ? 25 : r3Issues >= 1 ? 15 : 5,
      time: r3Time,
      reasoning: `Found ${r3Issues} security/bug issues`
    };
    
    console.log('   OUTPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + r3Output);
    console.log('   ' + '─'.repeat(56));
    console.log(`   ⏱️  Time: ${r3Time}ms | 📊 Score: ${contestResult.rounds.round3.score}/25\n`);
    
    await delay(2000);
    
    // Round 4: Refactoring
    console.log(`🔧 Round 4: ${CONTEST_CHALLENGES.round4.name}`);
    console.log(`   ${CONTEST_CHALLENGES.round4.description}\n`);
    console.log('   INPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + CONTEST_CHALLENGES.round4.input.split('\n').join('\n   '));
    console.log('   ' + '─'.repeat(56));
    
    const r4Start = Date.now();
    const r4Output = await r1Provider.generate(CONTEST_CHALLENGES.round4.input, CONTEST_CHALLENGES.round4.systemPrompt);
    const r4Time = Date.now() - r4Start;
    
    const r4Async = (r4Output.match(/async|await/g) || []).length;
    contestResult.rounds.round4 = {
      input: CONTEST_CHALLENGES.round4.input,
      output: r4Output,
      score: r4Async >= 2 ? 25 : r4Output.length > 100 ? 15 : 5,
      time: r4Time,
      reasoning: `Used async/await ${r4Async} times`
    };
    
    console.log('   OUTPUT:');
    console.log('   ' + '─'.repeat(56));
    console.log('   ' + r4Output);
    console.log('   ' + '─'.repeat(56));
    console.log(`   ⏱️  Time: ${r4Time}ms | 📊 Score: ${contestResult.rounds.round4.score}/25\n`);
    
    contestResult.totalScore = contestResult.rounds.round1.score + contestResult.rounds.round2.score + contestResult.rounds.round3.score + contestResult.rounds.round4.score;
    contestResult.totalTime = r1Time + r2Time + r3Time + r4Time;
    
    results.push(contestResult);
    
    console.log(`${'='.repeat(60)}`);
    console.log(`🏆 ${contestant.name} Total Score: ${contestResult.totalScore}/100`);
    console.log(`⏱️  Total Time: ${contestResult.totalTime}ms\n`);
    
    await delay(3000);
  }
  
  // Final results
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   FINAL RESULTS                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const ranked = results.sort((a, b) => b.totalScore - a.totalScore || a.totalTime - b.totalTime);
  
  ranked.forEach((result, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`${medal} ${result.model} - Score: ${result.totalScore}/100, Time: ${result.totalTime}ms`);
    console.log(`   Round 1: ${result.rounds.round1.score}/25 (${result.rounds.round1.time}ms) - ${result.rounds.round1.reasoning}`);
    console.log(`   Round 2: ${result.rounds.round2.score}/25 (${result.rounds.round2.time}ms) - ${result.rounds.round2.reasoning}`);
    console.log(`   Round 3: ${result.rounds.round3.score}/25 (${result.rounds.round3.time}ms) - ${result.rounds.round3.reasoning}`);
    console.log(`   Round 4: ${result.rounds.round4.score}/25 (${result.rounds.round4.time}ms) - ${result.rounds.round4.reasoning}\n`);
  });
  
  console.log(`🏆 WINNER: ${ranked[0].model} with ${ranked[0].totalScore}/100 points!\n`);
}

async function testAllModels() {
  console.log('AI Model Tester for GitPulse\n');
  
  // Fetch Groq models
  console.log('Fetching Groq models...\n');
  const groqModels = await fetchGroqModels();
  
  if (groqModels.length === 0) {
    console.log('No Groq models available. Exiting.');
    return;
  }
  
  // Select top 5 models based on criteria:
  // - Prefer models with "llama" or "mixtral" (known for good code performance)
  // - Prefer models with larger context (indicated by model name)
  // - Avoid vision models since GitPulse doesn't need vision
  
  const priorityModels = groqModels.filter((m: string) => 
    m.includes('llama') || m.includes('mixtral')
  );
  
  const selectedModels = priorityModels.length >= 5 
    ? priorityModels.slice(0, 5)
    : [...priorityModels, ...groqModels.filter((m: string) => !priorityModels.includes(m))].slice(0, 5);
  
  console.log(`\nSelected top ${selectedModels.length} Groq models to test:\n`);
  selectedModels.forEach((model: string, i: number) => {
    console.log(`${i + 1}. ${model}`);
  });
  
  console.log('\n=== Testing Groq Models ===\n');
  
  const results: ModelTestResult[] = [];
  
  for (const model of selectedModels) {
    console.log(`\n=== Testing ${model} ===`);
    const result = await testModelAvailability(model, 'groq');
    results.push(result);
    console.log(`Available: ${result.available}`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    console.log(`Capabilities: ${JSON.stringify(result.capabilities)}`);
    console.log(`\nGitPulse Tests:`);
    console.log(`Commit Message: ${result.gitPulseTests.commitMessage.success ? '✓' : '✗'} (${result.gitPulseTests.commitMessage.responseTime}ms) - ${result.gitPulseTests.commitMessage.quality}`);
    console.log(`Code Documentation: ${result.gitPulseTests.codeDoc.success ? '✓' : '✗'} (${result.gitPulseTests.codeDoc.responseTime}ms) - ${result.gitPulseTests.codeDoc.quality}`);
    console.log(`Code Review: ${result.gitPulseTests.codeReview.success ? '✓' : '✗'} (${result.gitPulseTests.codeReview.responseTime}ms) - ${result.gitPulseTests.codeReview.quality}`);
    console.log(`Refactoring: ${result.gitPulseTests.refactoring.success ? '✓' : '✗'} (${result.gitPulseTests.refactoring.responseTime}ms) - ${result.gitPulseTests.refactoring.quality}`);
    
    // Add delay between tests to avoid rate limits
    if (selectedModels.indexOf(model) < selectedModels.length - 1) {
      await delay(2000);
    }
  }
  
  // Print summary
  console.log('\n\n=== SUMMARY ===\n');
  console.log('Available models:');
  const available = results.filter(r => r.available);
  available.forEach(r => {
    console.log(`  ✓ ${r.model} (${r.responseTime}ms)`);
  });

  console.log('\nUnavailable models:');
  const unavailable = results.filter(r => !r.available);
  unavailable.forEach(r => {
    console.log(`  ✗ ${r.model} - ${r.error}`);
  });

  // GitPulse performance ranking
  console.log('\n=== GITPULSE PERFORMANCE RANKING ===\n');
  
  const byGitPulseScore = available.map(r => {
    const gitPulseScore = [
      r.gitPulseTests.commitMessage.success ? 1 : 0,
      r.gitPulseTests.codeDoc.success ? 1 : 0,
      r.gitPulseTests.codeReview.success ? 1 : 0,
      r.gitPulseTests.refactoring.success ? 1 : 0
    ].reduce((a, b) => a + b, 0);
    
    const avgResponseTime = (
      r.gitPulseTests.commitMessage.responseTime +
      r.gitPulseTests.codeDoc.responseTime +
      r.gitPulseTests.codeReview.responseTime +
      r.gitPulseTests.refactoring.responseTime
    ) / 4;

    return { ...r, gitPulseScore, avgResponseTime };
  }).sort((a, b) => b.gitPulseScore - a.gitPulseScore || a.avgResponseTime - b.avgResponseTime);

  byGitPulseScore.forEach((r, i) => {
    console.log(`${i + 1}. ${r.model}`);
    console.log(`   GitPulse Score: ${r.gitPulseScore}/4 tasks passed`);
    console.log(`   Avg Response Time: ${r.avgResponseTime.toFixed(0)}ms`);
    console.log(`   Commit Message: ${r.gitPulseTests.commitMessage.success ? '✓' : '✗'} (${r.gitPulseTests.commitMessage.responseTime}ms) - ${r.gitPulseTests.commitMessage.quality}`);
    console.log(`   Code Documentation: ${r.gitPulseTests.codeDoc.success ? '✓' : '✗'} (${r.gitPulseTests.codeDoc.responseTime}ms) - ${r.gitPulseTests.codeDoc.quality}`);
    console.log(`   Code Review: ${r.gitPulseTests.codeReview.success ? '✓' : '✗'} (${r.gitPulseTests.codeReview.responseTime}ms) - ${r.gitPulseTests.codeReview.quality}`);
    console.log(`   Refactoring: ${r.gitPulseTests.refactoring.success ? '✓' : '✗'} (${r.gitPulseTests.refactoring.responseTime}ms) - ${r.gitPulseTests.refactoring.quality}`);
    console.log();
  });
}

// Run tests
async function main() {
  const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const OLLAMA_MODEL = 'gemma4:e2b';
  
  console.log(`\n=== Testing Ollama Model: ${OLLAMA_MODEL} ===\n`);
  
  try {
    const provider = AIProviderFactory.create('ollama', {
      ollamaHost: OLLAMA_HOST,
      model: OLLAMA_MODEL
    });
    
    // Test availability
    console.log('Testing availability...');
    const isAvailable = await provider.isAvailable();
    console.log(`Available: ${isAvailable ? 'Yes' : 'No'}`);
    
    if (!isAvailable) {
      console.log('Model not available, exiting.');
      return;
    }
    
    // Test GitPulse operations
    console.log('\n--- Testing GitPulse Operations ---\n');
    
    const tests = [
      { name: 'Commit Message Generation', type: 'commitMessage' as const },
      { name: 'Code Documentation', type: 'codeDoc' as const },
      { name: 'Code Review', type: 'codeReview' as const },
      { name: 'Refactoring', type: 'refactoring' as const }
    ];
    
    for (const test of tests) {
      console.log(`\n${test.name}:`);
      const result = await testGitPulseCapability('ollama', OLLAMA_MODEL, test.type);
      console.log(`  Success: ${result.success ? 'Yes' : 'No'}`);
      console.log(`  Response Time: ${result.responseTime}ms`);
      console.log(`  Quality: ${result.quality}`);
      console.log(`\n  Input:\n${result.input}`);
      console.log(`\n  Output:\n${result.output}`);
      if (result.error) {
        console.log(`\n  Error: ${result.error}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

main().catch(console.error);
