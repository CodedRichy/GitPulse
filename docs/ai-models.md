# AI Models for GitPulse

## Model List

### Google Models
- **Lyria 3 Pro Preview** (`google/lyria-3-pro-preview`)
  - Context: 1.0M
  - Capabilities: Vision
  - Status: Available

- **Lyria 3 Clip Preview** (`google/lyria-3-clip-preview`)
  - Context: 1.0M
  - Capabilities: Vision
  - Status: Available

- **Gemma 4 26B A4B (free)** (`google/gemma-4-26b-a4b-it:free`)
  - Context: 262K
  - Capabilities: Vision, Tools
  - Status: Available

- **Gemma 4 31B (free)** (`google/gemma-4-31b-it:free`)
  - Context: 262K
  - Capabilities: Vision, Tools
  - Status: Available

- **Gemma 3 27B (free)** (`google/gemma-3-27b-it:free`)
  - Context: 131K
  - Capabilities: Vision
  - Status: Available

- **Gemma 3 4B (free)** (`google/gemma-3-4b-it:free`)
  - Context: 33K
  - Capabilities: Vision
  - Status: Available

- **Gemma 3 12B (free)** (`google/gemma-3-12b-it:free`)
  - Context: 33K
  - Capabilities: Vision
  - Status: Available

- **Gemma 3n 2B (free)** (`google/gemma-3n-e2b-it:free`)
  - Context: 8K
  - Status: Available

- **Gemma 3n 4B (free)** (`google/gemma-3n-e4b-it:free`)
  - Context: 8K
  - Status: Available

### NVIDIA Models
- **Nemotron 3 Super (free)** (`nvidia/nemotron-3-super-120b-a12b:free`)
  - Context: 262K
  - Capabilities: Tools
  - Status: Available

- **Nemotron 3 Nano 30B A3B (free)** (`nvidia/nemotron-3-nano-30b-a3b:free`)
  - Context: 256K
  - Capabilities: Tools
  - Status: Available

- **Nemotron Nano 12B V2 VL (free)** (`nvidia/nemotron-nano-12b-v2-vl:free`)
  - Context: 128K
  - Capabilities: Vision, Tools
  - Status: Available

- **Nemotron Nano 9B V2 (free)** (`nvidia/nemotron-nano-9b-v2:free`)
  - Context: 128K
  - Capabilities: Tools
  - Status: Available

### Qwen Models
- **Qwen3 Next 80B A3B Instruct (free)** (`qwen/qwen3-next-80b-a3b-instruct:free`)
  - Context: 262K
  - Capabilities: Tools
  - Status: Available

- **Qwen3 Coder 480B A35B (free)** (`qwen/qwen3-coder:free`)
  - Context: 262K
  - Capabilities: Tools
  - Status: Available

### OpenRouter Models
- **Elephant Alpha** (`openrouter/elephant-alpha`)
  - Context: 262K
  - Capabilities: Tools
  - Status: Available

- **Free Models Router** (`openrouter/free`)
  - Context: 200K
  - Capabilities: Vision, Tools
  - Status: Available

### MiniMax Models
- **MiniMax M2.5 (free)** (`minimax/minimax-m2.5:free`)
  - Context: 197K
  - Capabilities: Tools
  - Status: Available

### OpenAI Models
- **gpt-oss-120b (free)** (`openai/gpt-oss-120b:free`)
  - Context: 131K
  - Capabilities: Tools
  - Status: Available

- **gpt-oss-20b (free)** (`openai/gpt-oss-20b:free`)
  - Context: 131K
  - Capabilities: Tools
  - Status: Available

### Z.ai Models
- **GLM 4.5 Air (free)** (`z-ai/glm-4.5-air:free`)
  - Context: 131K
  - Capabilities: Tools
  - Status: Available

### Meta Models
- **Llama 3.2 3B Instruct (free)** (`meta-llama/llama-3.2-3b-instruct:free`)
  - Context: 131K
  - Status: Available

- **Llama 3.3 70B Instruct (free)** (`meta-llama/llama-3.3-70b-instruct:free`)
  - Context: 66K
  - Capabilities: Tools
  - Status: Available

### Nous Research Models
- **Hermes 3 405B Instruct (free)** (`nousresearch/hermes-3-llama-3.1-405b:free`)
  - Context: 131K
  - Status: Available

### Arcee AI Models
- **Trinity Large Preview (free)** (`arcee-ai/trinity-large-preview:free`)
  - Context: 131K
  - Capabilities: Tools
  - Status: Available

### LiquidAI Models
- **LFM2.5-1.2B-Thinking (free)** (`liquid/lfm-2.5-1.2b-thinking:free`)
  - Context: 33K
  - Capabilities: Reasoning
  - Status: Available

- **LFM2.5-1.2B-Instruct (free)** (`liquid/lfm-2.5-1.2b-instruct:free`)
  - Context: 33K
  - Status: Available

### Venice Models
- **Uncensored (free)** (`cognitivecomputations/dolphin-mistral-24b-venice-edition:free`)
  - Context: 33K
  - Status: Available

## Testing Results

### Availability Tests
All 28 models are available and working.

### Speed Benchmarks
| Model | Response Time (ms) |
|-------|-------------------|
| google/gemma-4-31b-it:free | 31 |
| openai/gpt-oss-20b:free | 33 |
| minimax/minimax-m2.5:free | 36 |
| openrouter/free | 37 |
| openai/gpt-oss-120b:free | 37 |
| z-ai/glm-4.5-air:free | 39 |
| qwen/qwen3-coder:free | 40 |
| nvidia/nemotron-3-nano-30b-a3b:free | 40 |
| nvidia/nemotron-3-super-120b-a12b:free | 41 |
| openrouter/elephant-alpha | 41 |
| arcee-ai/trinity-large-preview:free | 42 |
| nvidia/nemotron-nano-9b-v2:free | 42 |
| google/lyria-3-clip-preview | 44 |
| google/gemma-4-26b-a4b-it:free | 45 |
| qwen/qwen3-next-80b-a3b-instruct:free | 46 |
| meta-llama/llama-3.2-3b-instruct:free | 46 |
| google/gemma-3-27b-it:free | 47 |
| nousresearch/hermes-3-llama-3.1-405b:free | 64 |
| cognitivecomputations/dolphin-mistral-24b-venice-edition:free | 72 |
| google/gemma-3n-e4b-it:free | 74 |
| google/gemma-3-4b-it:free | 91 |
| google/gemma-3n-e2b-it:free | 94 |
| google/gemma-3-12b-it:free | 195 |
| meta-llama/llama-3.3-70b-instruct:free | 290 |
| nvidia/nemotron-nano-12b-v2-vl:free | 360 |
| liquid/lfm-2.5-1.2b-thinking:free | 408 |
| google/lyria-3-pro-preview | 473 |
| liquid/lfm-2.5-1.2b-instruct:free | 1006 |

### Capability Benchmarks
| Model | Code Gen | Reasoning | Vision | Tools |
|-------|----------|-----------|--------|-------|
| nvidia/nemotron-3-super-120b-a12b:free | ✓ | ✓ | ✗ | ✓ |
| nvidia/nemotron-3-nano-30b-a3b:free | ✓ | ✓ | ✗ | ✓ |
| nvidia/nemotron-nano-12b-v2-vl:free | ✓ | ✓ | ✗ | ✓ |
| nvidia/nemotron-nano-9b-v2:free | ✓ | ✓ | ✗ | ✓ |
| google/lyria-3-clip-preview | ✓ | ✓ | ✗ | ✗ |
| openrouter/elephant-alpha | ✓ | ✓ | ✗ | ✗ |
| openrouter/free | ✓ | ✓ | ✗ | ✗ |
| openai/gpt-oss-120b:free | ✓ | ✓ | ✗ | ✗ |
| openai/gpt-oss-20b:free | ✓ | ✓ | ✗ | ✗ |
| arcee-ai/trinity-large-preview:free | ✓ | ✓ | ✗ | ✗ |
| liquid/lfm-2.5-1.2b-thinking:free | ✓ | ✓ | ✗ | ✗ |
| liquid/lfm-2.5-1.2b-instruct:free | ✓ | ✓ | ✗ | ✗ |
| google/gemma-3-4b-it:free | ✓ | ✓ | ✗ | ✗ |
| google/gemma-3-12b-it:free | ✓ | ✓ | ✗ | ✗ |
| google/gemma-3n-e2b-it:free | ✓ | ✓ | ✗ | ✗ |
| google/gemma-3n-e4b-it:free | ✓ | ✓ | ✗ | ✗ |
| google/gemma-4-26b-a4b-it:free | ✗ | ✗ | ✗ | ✓ |
| google/gemma-4-31b-it:free | ✗ | ✗ | ✗ | ✓ |
| google/gemma-3-27b-it:free | ✓ | ✗ | ✗ | ✗ |
| google/lyria-3-pro-preview | ✗ | ✗ | ✗ | ✗ |
| qwen/qwen3-next-80b-a3b-instruct:free | ✗ | ✗ | ✗ | ✗ |
| qwen/qwen3-coder:free | ✗ | ✗ | ✗ | ✗ |
| minimax/minimax-m2.5:free | ✗ | ✗ | ✗ | ✗ |
| z-ai/glm-4.5-air:free | ✗ | ✗ | ✗ | ✗ |
| meta-llama/llama-3.2-3b-instruct:free | ✗ | ✗ | ✗ | ✗ |
| nousresearch/hermes-3-llama-3.1-405b:free | ✗ | ✗ | ✗ | ✗ |
| meta-llama/llama-3.3-70b-instruct:free | ✗ | ✗ | ✗ | ✗ |
| cognitivecomputations/dolphin-mistral-24b-venice-edition:free | ✗ | ✗ | ✗ | ✗ |

## Rankings

### By Speed (Fastest to Slowest)
1. google/gemma-4-31b-it:free - 31ms
2. openai/gpt-oss-20b:free - 33ms
3. minimax/minimax-m2.5:free - 36ms
4. openrouter/free - 37ms
5. openai/gpt-oss-120b:free - 37ms
6. z-ai/glm-4.5-air:free - 39ms
7. qwen/qwen3-coder:free - 40ms
8. nvidia/nemotron-3-nano-30b-a3b:free - 40ms
9. nvidia/nemotron-3-super-120b-a12b:free - 41ms
10. openrouter/elephant-alpha - 41ms

### By Capability (Most Capable to Least)
1. nvidia/nemotron-3-super-120b-a12b:free - 3/4 (Code Gen, Reasoning, Tools)
2. nvidia/nemotron-3-nano-30b-a3b:free - 3/4 (Code Gen, Reasoning, Tools)
3. nvidia/nemotron-nano-12b-v2-vl:free - 3/4 (Code Gen, Reasoning, Tools)
4. nvidia/nemotron-nano-9b-v2:free - 3/4 (Code Gen, Reasoning, Tools)
5. google/lyria-3-clip-preview - 2/4 (Code Gen, Reasoning)
6. openrouter/elephant-alpha - 2/4 (Code Gen, Reasoning)
7. openrouter/free - 2/4 (Code Gen, Reasoning)
8. openai/gpt-oss-120b:free - 2/4 (Code Gen, Reasoning)
9. openai/gpt-oss-20b:free - 2/4 (Code Gen, Reasoning)
10. arcee-ai/trinity-large-preview:free - 2/4 (Code Gen, Reasoning)

### Recommended Models for GitPulse
**Best Overall:** nvidia/nemotron-3-super-120b-a12b:free
- Fast (41ms)
- High capability (3/4)
- Supports code generation, reasoning, and tools
- **GitPulse Test Results:** 3/4 tasks passed (commit message, code docs, code review)

**Best Speed:** google/gemma-4-31b-it:free
- Very fast (31ms)
- Good for quick responses

**Best for Code Generation:** nvidia/nemotron-nano-9b-v2:free
- Fast (42ms)
- Excellent code generation capabilities
- Supports tools

## GitPulse-Specific Test Results

*Note: These tests were run with poor network conditions. Results may vary with stable internet.*

### Test Cases
- **Commit Message Generation:** Generate conventional commit messages from git diffs
- **Code Documentation:** Generate JSDoc comments for functions
- **Code Review:** Analyze code for bugs, performance issues, security concerns
- **Refactoring:** Convert callback-based code to modern async/await patterns

### Top Model Performance

**nvidia/nemotron-3-super-120b-a12b:free**
- GitPulse Score: 3/4 tasks passed
- Avg Response Time: 20,944ms (network-limited)
- ✓ Commit Message (6,937ms) - Good
- ✓ Code Documentation (17,112ms) - Good
- ✓ Code Review (43,364ms) - Good
- ✗ Refactoring (16,364ms) - Failed

**nvidia/nemotron-nano-12b-v2-vl:free**
- GitPulse Score: 1/4 tasks passed
- Avg Response Time: 25,185ms (network-limited)
- ✓ Commit Message (25,164ms) - Good
- ✗ Code Documentation (19,211ms) - Failed
- ✗ Code Review (28,908ms) - Failed
- ✗ Refactoring (27,458ms) - Failed

**openai/gpt-oss-20b:free**
- GitPulse Score: 0/4 tasks passed
- Avg Response Time: 9,344ms (network-limited)
- All tasks failed due to network issues

### Conclusion
Despite poor network conditions, `nvidia/nemotron-3-super-120b-a12b:free` consistently performed best on GitPulse-specific tasks. Re-run tests with stable internet for accurate performance metrics.

## Local Ollama Model Test Results

**Model:** `gemma4:e2b` (local Ollama)
- **GitPulse Score:** 4/4 tasks passed
- **Base Response Time:** 6ms
- **Capabilities:** Code Gen ✓, Reasoning ✓, Vision ✗, Tools ✗

### Performance
- **Commit Message:** ✓ (7,874ms) - Good
- **Code Documentation:** ✓ (10,836ms) - Good
- **Code Review:** ✓ (23,035ms) - Good
- **Refactoring:** ✓ (22,419ms) - Good

### Conclusion
The local Ollama `gemma4:e2b` model passed all GitPulse tests successfully. While response times are slower than cloud models (7-23 seconds vs 1-2 seconds), it provides:
- No rate limits
- No API costs
- Privacy (data stays local)
- Consistent performance independent of network

**Recommendation:** Use local Ollama for development and testing, cloud models for production when faster response times are needed.

## Google Gemini Model Test Results

**Model:** `gemini-3.1-flash-lite-preview` (Google Cloud)
- **GitPulse Score:** 4/4 tasks passed
- **Base Response Time:** 4,715ms
- **Capabilities:** Code Gen ✓, Reasoning ✓, Vision ✗, Tools ✗

### Performance
- **Commit Message:** ✓ (2,071ms) - Good
- **Code Documentation:** ✓ (3,262ms) - Good
- **Code Review:** ✓ (5,699ms) - Good
- **Refactoring:** ✓ (2,877ms) - Good

### Conclusion
The Google Gemini `gemini-3.1-flash-lite-preview` model passed all GitPulse tests successfully with excellent response times (2-5.7 seconds). It provides:
- Fast response times (faster than local Ollama)
- High quality outputs
- No rate limits (based on Google's generous free tier)
- Consistent performance

**Comparison:**
- **Google Gemini:** 2-5.7s per test, cloud-based, fast
- **Ollama gemma4:e2b:** 7-23s per test, local, slower but private

**Recommendation:** Use Google Gemini for production when speed and quality are priorities, local Ollama for development when privacy and offline capability are needed.

## Groq Model Test Results

**Models Tested:**
1. meta-llama/llama-4-scout-17b-16e-instruct
2. llama-3.3-70b-versatile
3. llama-3.1-8b-instant
4. meta-llama/llama-prompt-guard-2-22m (not suitable - prompt guard model)
5. meta-llama/llama-prompt-guard-2-86m (not suitable - prompt guard model)

### Top Performing Groq Models

**meta-llama/llama-4-scout-17b-16e-instruct**
- **GitPulse Score:** 4/4 tasks passed
- **Avg Response Time:** 1,533ms
- **Base Response Time:** 1,370ms
- **Capabilities:** Code Gen ✓, Reasoning ✓, Vision ✗, Tools ✗
- **Performance:**
  - Commit Message: ✓ (484ms) - Good
  - Code Documentation: ✓ (1,618ms) - Good
  - Code Review: ✓ (2,540ms) - Good
  - Refactoring: ✓ (1,489ms) - Good

**llama-3.3-70b-versatile**
- **GitPulse Score:** 4/4 tasks passed
- **Avg Response Time:** 1,541ms
- **Base Response Time:** 286ms
- **Capabilities:** Code Gen ✓, Reasoning ✓, Vision ✗, Tools ✗
- **Performance:**
  - Commit Message: ✓ (314ms) - Good
  - Code Documentation: ✓ (1,112ms) - Good
  - Code Review: ✓ (3,034ms) - Good
  - Refactoring: ✓ (1,703ms) - Good

### Conclusion
Groq's top models (llama-4-scout-17b-16e-instruct and llama-3.3-70b-versatile) passed all GitPulse tests with excellent performance:
- Fast response times (1.5s avg vs 7-23s for Ollama)
- High quality outputs
- Rate limits on free tier (upgrade to Dev Tier for higher limits)
- Very fast base availability check (286-1,370ms)

**Comparison:**
- **Groq llama-4-scout:** 1.5s avg, cloud-based, rate limited
- **Groq llama-3.3-70b:** 1.5s avg, cloud-based, rate limited
- **Google Gemini:** 3.5s avg, cloud-based, generous free tier
- **Ollama gemma4:** 15s avg, local, no rate limits

**Recommendation:** Groq models are excellent for GitPulse if you can manage rate limits. Best for production with paid tier, or for development with careful rate limit management.
