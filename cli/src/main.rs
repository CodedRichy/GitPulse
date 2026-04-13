use clap::{Parser, Subcommand};
use anyhow::Result;
use owo_colors::OwoColorize;
use std::env;

mod ui;
use ui::*;

use gitpulse_core::GitAnalyzer;

#[derive(Parser)]
#[command(name = "gitpulse")]
#[command(about = "Cursor for Git - AI-powered Git workflow")]
#[command(version = "3.0.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate smart commit message
    Commit {
        /// Don't submit, just preview
        #[arg(short, long)]
        dry_run: bool,
        /// Edit message before committing
        #[arg(short, long)]
        edit: bool,
    },
    /// Explain code history
    Explain {
        /// File to explain
        file: String,
        /// Number of commits to analyze
        #[arg(short, long, default_value = "10")]
        depth: usize,
    },
    /// Generate PR description
    Pr {
        /// Base branch
        #[arg(short, long, default_value = "main")]
        base: String,
        /// Don't create PR, just preview
        #[arg(short, long)]
        dry_run: bool,
    },
    /// Analyze current changes
    Status,
    /// Configure GitPulse
    Config {
        #[command(subcommand)]
        command: ConfigCommands,
    },
}

#[derive(Subcommand)]
enum ConfigCommands {
    /// Show current configuration
    Show,
    /// Set configuration value
    Set {
        key: String,
        value: String,
    },
    /// Reset to defaults
    Reset,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    
    let cli = Cli::parse();
    
    match cli.command {
        Commands::Commit { dry_run, edit } => {
            let current_dir = env::current_dir()?;
            
            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    // Get git status
                    match git.get_status() {
                        Ok(status) => {
                            print!("{}", welcome_screen("lfm-2.5-instruct", &status.branch));
                            
                            // Show staged changes
                            if !status.staged.is_empty() {
                                let mut content: Vec<String> = vec!["".to_string(), "Staged changes:".to_string(), "".to_string()];
                                for file in &status.staged {
                                    content.push(format!("  • {}", file));
                                }
                                content.push("".to_string());
                                
                                let content_refs: Vec<&str> = content.iter().map(|s| s.as_str()).collect();
                                println!("{}", panel(&content_refs));
                                
                                // Get the actual diff for AI analysis
                                match git.get_staged_diff() {
                                    Ok(diff) => {
                                        if !diff.is_empty() && diff.len() < 5000 {
                                            // Truncate for display
                                            let preview: String = diff.lines().take(10).collect::<Vec<_>>().join("\n");
                                            println!("{}", section_header("Diff preview:"));
                                            println!("{}\n", preview);
                                        }
                                    }
                                    Err(_) => {}
                                }
                                
                                println!("{}", section_header("Suggested commit message:"));
                                println!("  {} (AI would generate based on diff)\n", 
                                    ui::chars::BULLET.bright_yellow());
                                
                                if dry_run {
                                    print!("{}", status_bar("dry-run / no commit made"));
                                } else if edit {
                                    print!("{}", status_bar("editing / waiting for input"));
                                } else {
                                    print!("{}", status_bar("ready to commit"));
                                }
                            } else {
                                print!("{}", error("No staged changes. Run 'git add' first."));
                            }
                        }
                        Err(e) => {
                            print!("{}", error(&format!("Failed to get status: {}", e)));
                        }
                    }
                }
                Err(e) => {
                    print!("{}", error(&format!("Not a git repository: {}", e)));
                }
            }
        }
        
        Commands::Explain { file, depth } => {
            let current_dir = env::current_dir()?;
            
            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    match git.get_file_history(&file, depth) {
                        Ok(commits) => {
                            print!("{}", welcome_screen("gpt-oss-120b", &file));
                            
                            let mut content: Vec<String> = vec![
                                "".to_string(),
                                format!("Found {} commits", commits.len()),
                                "".to_string(),
                                "Recent activity:".to_string(),
                            ];
                            
                            for commit in &commits {
                                let msg = commit.message.lines().next().unwrap_or("No message");
                                content.push(format!("  • {} - {}", &commit.hash[..7], msg));
                            }
                            
                            content.push("".to_string());
                            content.push("File purpose:".to_string());
                            content.push("  (AI analysis would go here)".to_string());
                            content.push("".to_string());
                            
                            let content_refs: Vec<&str> = content.iter().map(|s| s.as_str()).collect();
                            println!("{}", panel(&content_refs));
                            print!("{}", status_bar("analyzed"));
                        }
                        Err(e) => {
                            print!("{}", error(&format!("Failed to get history: {}", e)));
                        }
                    }
                }
                Err(e) => {
                    print!("{}", error(&format!("Not a git repository: {}", e)));
                }
            }
        }
        
        Commands::Pr { base, dry_run } => {
            let current_dir = env::current_dir()?;
            
            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    // Get recent commits
                    match git.get_recent_commits(10) {
                        Ok(commits) => {
                            print!("{}", welcome_screen("gpt-oss-120b", &format!("vs {}", base)));
                            
                            let total_commits = commits.len();
                            let mut content: Vec<String> = vec![
                                "".to_string(),
                                format!("Analyzing {} commits...", total_commits),
                                "".to_string(),
                                "Recent commits:".to_string(),
                            ];
                            
                            // Show last 5 commits
                            for commit in commits.iter().take(5) {
                                let msg = commit.message.lines().next().unwrap_or("No message");
                                content.push(format!("  • {} - {}", &commit.hash[..7], msg));
                            }
                            
                            if total_commits > 5 {
                                content.push(format!("  ... and {} more", total_commits - 5));
                            }
                            
                            content.push("".to_string());
                            content.push("Files changed:".to_string());
                            
                            // Collect all files
                            let mut all_files: Vec<String> = Vec::new();
                            for commit in &commits {
                                for file in &commit.files_changed {
                                    if !all_files.contains(file) {
                                        all_files.push(file.clone());
                                    }
                                }
                            }
                            
                            for file in all_files.iter().take(5) {
                                content.push(format!("  • {}", file));
                            }
                            
                            if all_files.len() > 5 {
                                content.push(format!("  ... and {} more", all_files.len() - 5));
                            }
                            
                            content.push("".to_string());
                            
                            let content_refs: Vec<&str> = content.iter().map(|s| s.as_str()).collect();
                            println!("{}", panel(&content_refs));
                            
                            println!("{}", section_header("Suggested PR Title:"));
                            println!("  {} feat: {}\n",
                                ui::chars::BULLET.bright_yellow(),
                                if !commits.is_empty() {
                                    commits[0].message.lines().next().unwrap_or("Update")
                                } else {
                                    "Update"
                                }
                            );
                            
                            if dry_run {
                                print!("{}", status_bar("preview"));
                            } else {
                                print!("{}", status_bar("creating"));
                            }
                        }
                        Err(e) => {
                            print!("{}", error(&format!("Failed to get commits: {}", e)));
                        }
                    }
                }
                Err(e) => {
                    print!("{}", error(&format!("Not a git repository: {}", e)));
                }
            }
        }
        
        Commands::Status => {
            // Get current directory and find git repo
            let current_dir = env::current_dir()?;
            
            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    match git.get_status() {
                        Ok(status) => {
                            print!("{}", welcome_screen("lfm-2.5-instruct", &status.branch));
                            
                            // Build status content
                            let mut left: Vec<String> = vec!["  Status".to_string(), "".to_string()];
                            left.push(format!("  • {} staged", status.staged.len()));
                            left.push(format!("  • {} unstaged", status.unstaged.len()));
                            left.push(format!("  • {} untracked", status.untracked.len()));
                            left.push("".to_string());
                            left.push(format!("  On branch: {}", status.branch));
                            left.push("".to_string());
                            
                            // Show staged files if any
                            if !status.staged.is_empty() {
                                left.push("  Staged:".to_string());
                                for file in &status.staged {
                                    left.push(format!("    • {}", file));
                                }
                                left.push("".to_string());
                            }
                            
                            // Show unstaged files if any
                            if !status.unstaged.is_empty() {
                                left.push("  Unstaged:".to_string());
                                for file in &status.unstaged {
                                    left.push(format!("    • {}", file));
                                }
                                left.push("".to_string());
                            }
                            
                            let right = vec![
                                "  Tips",
                                "",
                                "  Run 'gitpulse",
                                "  commit' to",
                                "  generate message",
                                "",
                                "",
                            ];
                            
                            let left_str: Vec<String> = left.iter().map(|s| s.to_string()).collect();
                            let right_str: Vec<String> = right.iter().map(|s| s.to_string()).collect();
                            
                            // Convert to str slices for the function
                            let left_refs: Vec<&str> = left_str.iter().map(|s| s.as_str()).collect();
                            let right_refs: Vec<&str> = right_str.iter().map(|s| s.as_str()).collect();
                            
                            println!("{}", two_column(&left_refs, &right_refs));
                            
                            if status.is_clean {
                                print!("{}", status_bar("clean"));
                            } else {
                                print!("{}", status_bar("changes pending"));
                            }
                        }
                        Err(e) => {
                            print!("{}", error(&format!("Failed to get status: {}", e)));
                        }
                    }
                }
                Err(e) => {
                    print!("{}", error(&format!("Not a git repository: {}", e)));
                }
            }
        }
        
        Commands::Config { command } => match command {
            ConfigCommands::Show => {
                print!("{}", welcome_screen("local", "config"));
                
                let content = vec![
                    "",
                    "Current configuration:",
                    "",
                    "  AI Provider:    lfm-2.5-instruct",
                    "  Commit style:   conventional",
                    "  Auto-commit:    false",
                    "  Theme:          claude",
                    "",
                ];
                println!("{}", panel(&content));
                print!("{}", status_bar("config"));
            }
            ConfigCommands::Set { key, value } => {
                print!("{}", welcome_screen("local", "config"));
                println!("{}", success(&format!("Set {} = {}", key, value)));
                print!("{}", status_bar("saved"));
            }
            ConfigCommands::Reset => {
                print!("{}", welcome_screen("local", "config"));
                println!("{}", success("Configuration reset to defaults"));
                print!("{}", status_bar("reset"));
            }
        },
    }
    
    Ok(())
}

// Modules:
// - ui: Terminal UI (Claude Code aesthetic)
// - git: Git repository analysis (TODO)
// - ai: AI orchestration (TODO)
// - context: Codebase context management (TODO)
// - config: Configuration management (TODO)
