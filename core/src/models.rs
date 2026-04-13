//! Data models for GitPulse

use serde::{Deserialize, Serialize};

/// Suggested commit message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitSuggestion {
    pub message: String,
    pub confidence: f32,
    pub pattern_detected: Option<String>,
    pub reasoning: Vec<String>,
}

/// PR description suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PRSuggestion {
    pub title: String,
    pub body: String,
    pub summary: String,
    pub changes: Vec<ChangeSummary>,
    pub testing_notes: Vec<String>,
    pub related_issues: Vec<String>,
}

/// Summary of a change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeSummary {
    pub file: String,
    pub description: String,
    pub impact: ImpactLevel,
}

/// Impact level of a change
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ImpactLevel {
    Low,
    Medium,
    High,
    Breaking,
}

/// File explanation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileExplanation {
    pub path: String,
    pub purpose: String,
    pub history_summary: String,
    pub recent_changes: Vec<ChangeSummary>,
    pub concerns: Vec<String>,
}

/// Repository analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoAnalysis {
    pub total_commits: usize,
    pub recent_changes: Vec<ChangeSummary>,
    pub hot_files: Vec<String>,
    pub patterns: Vec<String>,
}

/// Configuration for GitPulse
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub ai_provider: AIProvider,
    pub commit_style: CommitStyle,
    pub auto_commit: bool,
    pub pr_template: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    Local,  // Ollama
    OpenRouter,
    OpenAI,
    Anthropic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CommitStyle {
    Conventional,  // feat:, fix:, docs:, etc.
    Semantic,      // type(scope): description
    Simple,        // Just the description
    Custom(String),
}

impl Default for Config {
    fn default() -> Self {
        Self {
            ai_provider: AIProvider::Local,
            commit_style: CommitStyle::Conventional,
            auto_commit: false,
            pr_template: None,
        }
    }
}
