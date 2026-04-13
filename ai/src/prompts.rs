//! Prompt engineering for GitPulse

use gitpulse_core::git::{Commit, FileChange};

/// Generate prompt for commit message
pub fn commit_prompt(diff: &str, context: &super::CommitContext) -> String {
    format!(
        r#"You are an expert Git commit message writer. 

Analyze the following git diff and write a clear, concise commit message following conventional commits format.

REPOSITORY: {}
BRANCH: {}

CONTEXT:
- Recent commits: {:?}
- Team conventions: {:?}

GIT DIFF:
```
{}
```

Write a commit message in this format:
type(scope): description

- type: feat, fix, docs, style, refactor, perf, test, chore
- scope: optional, describes area affected
- description: imperative mood, no period, max 72 chars

Respond with ONLY the commit message, nothing else."#,
        context.repo_name,
        context.branch,
        context.recent_commits,
        context.team_conventions,
        truncate_diff(diff, 2000)
    )
}

/// Generate prompt for PR description
pub fn pr_prompt(commits: &[Commit], files_changed: &[FileChange]) -> String {
    let commits_summary = commits
        .iter()
        .map(|c| format!("- {}: {}", &c.hash[..7], c.message.lines().next().unwrap_or("")))
        .collect::<Vec<_>>()
        .join("\n");
    
    let files_summary = files_changed
        .iter()
        .map(|f| format!("- {} ({})", f.path, format_status(&f.status)))
        .collect::<Vec<_>>()
        .join("\n");
    
    format!(
        r#"You are an expert at writing clear, comprehensive PR descriptions.

Analyze the following commits and file changes to create a PR description.

COMMITS:
{}

FILES CHANGED:
{}

Write a PR description in this format:

## Summary
Brief overview of what this PR does

## Changes
- List of specific changes

## Testing
- How to test these changes

## Related Issues
- Links to related issues

Make it professional and helpful for reviewers."#,
        commits_summary,
        files_summary
    )
}

/// Generate prompt for file explanation
pub fn explain_prompt(file_path: &str, commits: &[Commit]) -> String {
    let history = commits
        .iter()
        .take(10)
        .map(|c| format!(
            "- {} by {} on {}: {}",
            &c.hash[..7],
            c.author,
            c.date,
            c.message.lines().next().unwrap_or("")
        ))
        .collect::<Vec<_>>()
        .join("\n");
    
    format!(
        r#"You are a code historian. Explain the purpose and evolution of this file.

FILE: {}

RECENT COMMITS:
{}

Provide a concise explanation covering:
1. What this file does
2. Why it exists
3. Recent significant changes
4. Any concerns or TODOs

Keep it brief but informative."#,
        file_path,
        history
    )
}

/// Truncate diff to max length
fn truncate_diff(diff: &str, max_len: usize) -> String {
    if diff.len() > max_len {
        format!("{}\n... (truncated)", &diff[..max_len])
    } else {
        diff.to_string()
    }
}

/// Format change status for display
fn format_status(status: &gitpulse_core::git::ChangeStatus) -> &'static str {
    match status {
        gitpulse_core::git::ChangeStatus::Added => "added",
        gitpulse_core::git::ChangeStatus::Modified => "modified",
        gitpulse_core::git::ChangeStatus::Deleted => "deleted",
        gitpulse_core::git::ChangeStatus::Renamed => "renamed",
        gitpulse_core::git::ChangeStatus::Copied => "copied",
    }
}
