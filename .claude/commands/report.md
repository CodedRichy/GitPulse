---
name: report
description: Generate compliance report
---

Generate Markdown compliance report from audit logbook for compliance teams.

## Usage

```
/report [--period <duration>] [--output <file>]
```

## Options

- `--period` - day, week, month, all (default: all)
- `--output` - Save to file instead of stdout
- `--no-details` - Skip detailed scan history
- `--no-trends` - Skip trend analysis
- `--no-overrides` - Skip override log

## Report Sections

- Executive summary
- Quality trends
- Override justifications
- Detailed scan history
- Compliance status
