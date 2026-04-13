//! Git repository analysis
//!
//! Real git operations using git2 crate.

use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// Analyzes Git repository structure and history
pub struct GitAnalyzer {
    repo: git2::Repository,
    _path: PathBuf,
}

impl GitAnalyzer {
    /// Initialize Git analyzer for a repository
    pub fn new(repo_path: &Path) -> Result<Self> {
        let repo = git2::Repository::open(repo_path)
            .with_context(|| format!("Failed to open git repository at {}", repo_path.display()))?;
        
        Ok(Self {
            _path: repo_path.to_path_buf(),
            repo,
        })
    }
    
    /// Get current branch name
    pub fn current_branch(&self) -> Result<String> {
        let head = self.repo.head()
            .context("Failed to get HEAD")?;
        
        if let Some(name) = head.shorthand() {
            Ok(name.to_string())
        } else {
            Ok("HEAD".to_string())
        }
    }
    
    /// Get staged changes
    pub fn get_staged_diff(&self) -> Result<String> {
        let head = self.repo.head().ok();
        let head_tree = head
            .and_then(|h| h.target())
            .and_then(|oid| self.repo.find_commit(oid).ok())
            .and_then(|c| c.tree().ok());
        
        let mut index = self.repo.index()
            .context("Failed to get index")?;
        let index_tree = index.write_tree()
            .and_then(|oid| self.repo.find_tree(oid))
            .ok();
        
        self.diff_trees_to_string(head_tree.as_ref(), index_tree.as_ref())
    }
    
    /// Get unstaged changes
    pub fn get_unstaged_diff(&self) -> Result<String> {
        let mut opts = git2::DiffOptions::new();
        let diff = self.repo.diff_index_to_workdir(None, Some(&mut opts))
            .context("Failed to get unstaged diff")?;
        
        self.diff_to_string(&diff)
    }
    
    /// Get combined diff
    pub fn get_full_diff(&self) -> Result<String> {
        let head_tree = self.repo.head().ok()
            .and_then(|h| h.target())
            .and_then(|oid| self.repo.find_commit(oid).ok())
            .and_then(|c| c.tree().ok());
        
        let mut opts = git2::DiffOptions::new();
        let diff = if let Some(tree) = head_tree {
            self.repo.diff_tree_to_workdir(Some(&tree), Some(&mut opts))?
        } else {
            self.repo.diff_tree_to_workdir(None, Some(&mut opts))?
        };
        
        self.diff_to_string(&diff)
    }
    
    /// Get file history
    pub fn get_file_history(&self, file: &str, depth: usize) -> Result<Vec<Commit>> {
        let mut revwalk = self.repo.revwalk()
            .context("Failed to create revwalk")?;
        
        revwalk.push_head()?;
        
        let mut commits = Vec::new();
        let file_path = Path::new(file);
        
        for (i, oid) in revwalk.enumerate() {
            if i >= depth {
                break;
            }
            
            let oid = oid?;
            let commit = self.repo.find_commit(oid)?;
            
            if self.commit_touches_file(&commit, file_path)? {
                commits.push(Commit {
                    hash: oid.to_string(),
                    message: commit.message().unwrap_or("").to_string(),
                    author: commit.author().name().unwrap_or("Unknown").to_string(),
                    date: format!("{}", commit.time().seconds()),
                    files_changed: vec![file.to_string()],
                });
            }
        }
        
        Ok(commits)
    }
    
    /// Get repository status
    pub fn get_status(&self) -> Result<RepoStatus> {
        let mut status_opts = git2::StatusOptions::new();
        status_opts.include_untracked(true);
        
        let statuses = self.repo.statuses(Some(&mut status_opts))?;
        
        let mut staged = Vec::new();
        let mut unstaged = Vec::new();
        let mut untracked = Vec::new();
        
        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("?").to_string();
            let status = entry.status();
            
            if status.contains(git2::Status::INDEX_NEW) 
                || status.contains(git2::Status::INDEX_MODIFIED)
                || status.contains(git2::Status::INDEX_DELETED) {
                staged.push(path.clone());
            }
            
            if status.contains(git2::Status::WT_MODIFIED)
                || status.contains(git2::Status::WT_DELETED) {
                unstaged.push(path.clone());
            }
            
            if status.contains(git2::Status::WT_NEW) {
                untracked.push(path);
            }
        }
        
        Ok(RepoStatus {
            staged,
            unstaged,
            untracked,
            branch: self.current_branch()?,
            is_clean: statuses.is_empty(),
        })
    }
    
    /// Check if working directory is clean
    pub fn is_clean(&self) -> Result<bool> {
        let status = self.get_status()?;
        Ok(status.staged.is_empty() 
            && status.unstaged.is_empty() 
            && status.untracked.is_empty())
    }
    
    /// Get recent commits
    pub fn get_recent_commits(&self, count: usize) -> Result<Vec<Commit>> {
        let mut revwalk = self.repo.revwalk()?;
        revwalk.push_head()?;
        
        let mut commits = Vec::new();
        
        for (i, oid) in revwalk.enumerate() {
            if i >= count {
                break;
            }
            
            let oid = oid?;
            let commit = self.repo.find_commit(oid)?;
            
            // Get files changed
            let tree = commit.tree()?;
            let parent_tree = if commit.parent_count() > 0 {
                let parent = commit.parent(0)?;
                Some(parent.tree()?)
            } else {
                None
            };
            
            let diff = if let Some(parent) = parent_tree {
                self.repo.diff_tree_to_tree(Some(&parent), Some(&tree), None)?
            } else {
                self.repo.diff_tree_to_tree(None, Some(&tree), None)?
            };
            
            let mut files = Vec::new();
            diff.foreach(
                &mut |delta, _| {
                    if let Some(path) = delta.new_file().path().and_then(|p| p.to_str()) {
                        files.push(path.to_string());
                    }
                    true
                },
                None,
                None,
                None,
            )?;
            
            commits.push(Commit {
                hash: oid.to_string(),
                message: commit.message().unwrap_or("").to_string(),
                author: commit.author().name().unwrap_or("Unknown").to_string(),
                date: format!("{}", commit.time().seconds()),
                files_changed: files,
            });
        }
        
        Ok(commits)
    }
    
    /// Helper: Check if commit touches a file
    fn commit_touches_file(&self, commit: &git2::Commit, file: &Path) -> Result<bool> {
        let tree = commit.tree()?;
        let parent_tree = if commit.parent_count() > 0 {
            let parent = commit.parent(0)?;
            Some(parent.tree()?)
        } else {
            None
        };
        
        let diff = if let Some(parent) = parent_tree {
            self.repo.diff_tree_to_tree(Some(&parent), Some(&tree), None)?
        } else {
            self.repo.diff_tree_to_tree(None, Some(&tree), None)?
        };
        
        let file_str = file.to_string_lossy();
        let mut found = false;
        
        diff.foreach(
            &mut |delta, _| {
                if let Some(path) = delta.new_file().path().and_then(|p| p.to_str()) {
                    if path == file_str.as_ref() {
                        found = true;
                    }
                }
                true
            },
            None,
            None,
            None,
        )?;
        
        Ok(found)
    }
    
    /// Helper: Convert diff to string
    fn diff_to_string(&self, diff: &git2::Diff) -> Result<String> {
        let mut output = Vec::new();
        diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
            let prefix = match line.origin() {
                '+' => "+",
                '-' => "-",
                ' ' => " ",
                _ => "",
            };
            if let Ok(content) = std::str::from_utf8(line.content()) {
                output.push(format!("{}{}", prefix, content));
            }
            true
        })?;
        Ok(output.join(""))
    }
    
    /// Helper: Diff two trees to string
    fn diff_trees_to_string(
        &self,
        old_tree: Option<&git2::Tree>,
        new_tree: Option<&git2::Tree>,
    ) -> Result<String> {
        let diff = self.repo.diff_tree_to_tree(old_tree, new_tree, None)?;
        self.diff_to_string(&diff)
    }
}

/// Repository status summary
#[derive(Debug, Clone)]
pub struct RepoStatus {
    pub staged: Vec<String>,
    pub unstaged: Vec<String>,
    pub untracked: Vec<String>,
    pub branch: String,
    pub is_clean: bool,
}

/// Represents a Git commit
#[derive(Debug, Clone)]
pub struct Commit {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub date: String,
    pub files_changed: Vec<String>,
}

/// Represents a file change
#[derive(Debug, Clone)]
pub struct FileChange {
    pub path: String,
    pub status: ChangeStatus,
    pub additions: usize,
    pub deletions: usize,
}

#[derive(Debug, Clone)]
pub enum ChangeStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
}
