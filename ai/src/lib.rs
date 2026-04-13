//! AI Orchestration Layer for GitPulse
//!
//! Handles model selection, prompt engineering, and response validation.

pub mod providers;
pub mod prompts;
pub mod validator;

use anyhow::Result;
use gitpulse_core::models::CommitSuggestion;
use providers::Provider;

/// AI orchestrator for GitPulse
pub struct AIOrchestrator {
    provider: Provider,
}

impl AIOrchestrator {
    /// Create new AI orchestrator with specified provider
    pub fn new(provider: Provider) -> Self {
        Self { provider }
    }
    
    /// Generate commit message from diff
    pub async fn generate_commit(
        &self,
        diff: &str,
        context: &CommitContext,
    ) -> Result<CommitSuggestion> {
        let prompt = prompts::commit_prompt(diff, context);
        let response = self.provider.generate(&prompt).await?;
        
        // Validate and parse response
        let suggestion = validator::parse_commit_response(&response)?;
        
        Ok(suggestion)
    }
    
    /// Generate PR description
    pub async fn generate_pr(
        &self,
        commits: &[gitpulse_core::git::Commit],
        files_changed: &[gitpulse_core::git::FileChange],
    ) -> Result<gitpulse_core::models::PRSuggestion> {
        let prompt = prompts::pr_prompt(commits, files_changed);
        let response = self.provider.generate(&prompt).await?;
        
        let suggestion = validator::parse_pr_response(&response)?;
        
        Ok(suggestion)
    }
    
    /// Explain file history
    pub async fn explain_file(
        &self,
        file_path: &str,
        commits: &[gitpulse_core::git::Commit],
    ) -> Result<gitpulse_core::models::FileExplanation> {
        let prompt = prompts::explain_prompt(file_path, commits);
        let response = self.provider.generate(&prompt).await?;
        
        let explanation = validator::parse_explain_response(&response)?;
        
        Ok(explanation)
    }
}

/// Context for commit generation
#[derive(Debug, Default)]
pub struct CommitContext {
    pub repo_name: String,
    pub branch: String,
    pub recent_commits: Vec<String>,
    pub team_conventions: Vec<String>,
    pub file_purposes: std::collections::HashMap<String, String>,
}
