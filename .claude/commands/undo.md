---
name: undo
description: Undo last commit safely
---

Undo the last commit with confirmation and safety checks.

## Usage

```
/undo [--force]
```

## Safety

- Warns if changes would be lost
- Creates backup reference
- Can be redone later
- Git-Shield protection
