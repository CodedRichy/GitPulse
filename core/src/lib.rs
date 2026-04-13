//! GitPulse Core Library
//! 
//! Provides Git repository analysis, context management, and code understanding.

pub mod git;
pub mod context;
pub mod models;

pub use git::GitAnalyzer;
pub use context::ContextManager;

use anyhow::Result;

/// Core error types for GitPulse
#[derive(thiserror::Error, Debug)]
pub enum GitPulseError {
    #[error("Git operation failed: {0}")]
    GitError(String),
    
    #[error("Context analysis failed: {0}")]
    ContextError(String),
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

/// Main entry point for GitPulse core functionality
pub struct GitPulseCore {
    git: GitAnalyzer,
    context: ContextManager,
}

impl GitPulseCore {
    /// Initialize GitPulse for a repository
    pub async fn new(repo_path: &std::path::Path) -> Result<Self> {
        let git = GitAnalyzer::new(repo_path)?;
        let context = ContextManager::new(repo_path).await?;
        
        Ok(Self { git, context })
    }
    
    /// Get the Git analyzer
    pub fn git(&self) -> &GitAnalyzer {
        &self.git
    }
    
    /// Get the context manager
    pub fn context(&self) -> &ContextManager {
        &self.context
    }
}
