---
name: init
description: Initialize GitPulse in repository
---

Set up GitPulse with hooks and configuration.

## Usage

```
/init [--force]
```

## What It Does

- Creates `.gitpulse/` directory
- Installs pre-commit hook
- Installs commit-msg hook
- Generates default config
- Sets up audit logbook

## Options

- `--force` - Overwrite existing configuration
