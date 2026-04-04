# GitPulse Quick Start Guide

Get up and running with GitPulse in 5 minutes!

## 🚀 Installation

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Set Up AI Provider

#### Option A: Local AI (Recommended - Free & Private)
```bash
# Install Ollama from https://ollama.ai
# Then pull a model:
ollama pull qwen3.5:9b
```

#### Option B: Cloud AI (Optional)
Create a `.env` file:
```env
# OpenAI (optional)
OPENAI_API_KEY=sk-...

# Anthropic (optional)
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3: Configure GitPulse (Optional)
Create `.gitpulse.json`:
```json
{
  "watch_root": "C:\\Users\\YourName\\Documents\\GitHub",
  "debounce_seconds": 60,
  "ai_provider": "ollama"
}
```

## ▶️ Running GitPulse

### GUI Mode (Default)
```bash
python git-pulse.py
```

### CLI Mode (Terminal)
```bash
python git-pulse.py --cli
```

### Background Mode
```bash
python git-pulse.py --detach
```

## 🎯 First Use

1. **Start GitPulse** - Run `python git-pulse.py`
2. **Make changes** - Edit files in your watched repositories
3. **Wait 60 seconds** - GitPulse waits for coding silence
4. **Auto-commit** - Changes are committed with AI-generated message
5. **Auto-push** - Pushed to your remote repository

## 📊 Viewing Analytics

Analytics are automatically tracked in `.gitpulse-analytics.json`:

```python
# View your stats
import json
with open('.gitpulse-analytics.json') as f:
    stats = json.load(f)
    print(f"Total commits: {stats['total_commits']}")
    print(f"AI commits: {stats['ai_commits']}")
```

## 🔧 Configuration Options

### AI Provider Selection
```json
{
  "ai_provider": "ollama",  // or "openai" or "anthropic"
  "ollama_model": "qwen3.5:9b",
  "openai_model": "gpt-4o-mini",
  "anthropic_model": "claude-3-haiku-20240307"
}
```

### Performance Tuning
```json
{
  "min_diff_for_summary": 200,    // Minimum changes for AI
  "max_diff_for_summary": 1500,   // Maximum diff size
  "debounce_seconds": 60          // Wait time before commit
}
```

### Features Toggle
```json
{
  "enable_analytics": true,
  "enable_notifications": true,
  "commit_preview": false,
  "auto_push": true
}
```

## 🆘 Troubleshooting

### Ollama Not Found
```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# Start Ollama
ollama serve
```

### No AI Commits
- Check if diff size is > 200 characters
- Verify AI provider is running
- Check `.git-pulse.log` for errors

### Push Failures
- Verify Git credentials are configured
- Check remote repository access
- See error message in GUI for fix suggestions

## 📚 Next Steps

- Read [FEATURES.md](FEATURES.md) for full feature list
- Check [README.md](README.md) for detailed documentation
- Join our community (Discord link coming soon)

## 💡 Tips

1. **Start with Ollama** - It's free, private, and works offline
2. **Adjust debounce time** - Increase for longer coding sessions
3. **Check analytics** - Track your productivity improvements
4. **Use CLI mode** - Great for remote/SSH environments
5. **Background mode** - Set it and forget it

## 🎓 Example Workflow

```bash
# 1. Start GitPulse in background
python git-pulse.py --detach

# 2. Code normally in your IDE
# ... make changes to files ...

# 3. GitPulse automatically:
#    - Waits 60 seconds after last change
#    - Stages changes (git add)
#    - Generates AI commit message
#    - Commits with message
#    - Pushes to remote

# 4. Check your Git history
git log --oneline -5

# Output:
# abc1234 Auto-sync: Modified auth.py - Add user authentication with validation
# def5678 Auto-sync: Modified config.json - Update API endpoint configuration
# ...
```

## 🔒 Privacy Note

When using **Ollama (local AI)**:
- ✅ Your code never leaves your machine
- ✅ No internet required
- ✅ Zero cost
- ✅ Complete privacy

When using **Cloud AI** (OpenAI/Anthropic):
- ⚠️ Git diffs sent to cloud provider
- ⚠️ Requires internet connection
- ⚠️ API costs apply
- ✅ Higher quality results

Choose based on your privacy and quality requirements!
