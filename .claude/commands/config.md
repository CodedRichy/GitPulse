---
name: config
description: Manage GitPulse configuration
---

View and modify GitPulse configuration settings.

## Usage

```
/config [key] [value]
```

## Examples

```
/config                    # Show all config
/config aiProvider         # Get specific value
/config aiProvider ollama  # Set value
```

## Configurable

- AI provider (ollama, openrouter, openai, google, groq)
- Model selection
- Commit style (conventional, semantic, simple)
- Quality gate settings
- Convention learning
