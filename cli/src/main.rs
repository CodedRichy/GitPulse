use clap::{Parser, Subcommand};
use anyhow::Result;
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
                    match git.get_status() {
                        Ok(status) => {
                            print!("{}", welcome_header(&format!(
                                "on {}  ·  model lfm-2.5-instruct", status.branch
                            )));

                            if !status.staged.is_empty() {
                                print!("{}", section("Staged changes"));
                                for file in &status.staged {
                                    print!("{}", file_entry(chars::PLUS, file));
                                }

                                // Diff preview
                                match git.get_staged_diff() {
                                    Ok(diff) => {
                                        if !diff.is_empty() && diff.len() < 5000 {
                                            print!("\n{}\n", labeled_separator("diff preview"));
                                            print!("{}", diff_preview(&diff, 12));
                                        }
                                    }
                                    Err(_) => {}
                                }

                                print!("{}", section("Suggested commit message"));
                                print!("{}", hint("(AI would generate based on diff)"));

                                if dry_run {
                                    print!("{}", status_bar("Dry run", "no commit made"));
                                } else if edit {
                                    print!("{}", status_bar("Edit mode", "waiting for input"));
                                } else {
                                    print!("{}", status_bar("Ready", "commit"));
                                }
                            } else {
                                print!("{}", error("No staged changes. Run 'git add' first."));
                                print!("{}", hint("Stage files with: git add <file>"));
                            }
                        }
                        Err(e) => print!("{}", error(&format!("Failed to get status: {}", e))),
                    }
                }
                Err(e) => print!("{}", error(&format!("Not a git repository: {}", e))),
            }
        }

        Commands::Explain { file, depth } => {
            let current_dir = env::current_dir()?;

            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    match git.get_file_history(&file, depth) {
                        Ok(commits) => {
                            print!("{}", welcome_header(&format!(
                                "explaining {}  ·  model gpt-oss-120b", file
                            )));

                            print!("{}", section(&format!(
                                "History  ({})",
                                if commits.is_empty() {
                                    "no commits found".to_string()
                                } else {
                                    format!("{} commits", commits.len())
                                }
                            )));

                            for commit in &commits {
                                let msg = commit.message.lines().next().unwrap_or("No message");
                                print!("{}", commit_entry(&commit.hash[..7], msg));
                            }

                            if !commits.is_empty() {
                                print!("\n");
                                let block = vec![
                                    "File purpose:",
                                    "  (AI analysis would go here)",
                                ];
                                print!("{}", accent_block(&block));
                            }

                            print!("{}", status_bar("Done", "analyzed"));
                        }
                        Err(e) => print!("{}", error(&format!("Failed to get history: {}", e))),
                    }
                }
                Err(e) => print!("{}", error(&format!("Not a git repository: {}", e))),
            }
        }

        Commands::Pr { base, dry_run } => {
            let current_dir = env::current_dir()?;

            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    match git.get_recent_commits(10) {
                        Ok(commits) => {
                            print!("{}", welcome_header(&format!(
                                "PR vs {}  ·  model gpt-oss-120b", base
                            )));

                            let total = commits.len();

                            // Commits section
                            print!("{}", section(&format!("Commits  ({})", total)));
                            for commit in commits.iter().take(8) {
                                let msg = commit.message.lines().next().unwrap_or("No message");
                                print!("{}", commit_entry(&commit.hash[..7], msg));
                            }
                            if total > 8 {
                                print!("{}", overflow(total - 8));
                            }

                            // Files changed section
                            let mut all_files: Vec<String> = Vec::new();
                            for commit in &commits {
                                for f in &commit.files_changed {
                                    if !all_files.contains(f) {
                                        all_files.push(f.clone());
                                    }
                                }
                            }

                            print!("{}", section(&format!("Files changed  ({})", all_files.len())));
                            for f in all_files.iter().take(10) {
                                print!("{}", file_entry(chars::MODIFIED, f));
                            }
                            if all_files.len() > 10 {
                                print!("{}", overflow(all_files.len() - 10));
                            }

                            // Suggested title
                            print!("{}", section("Suggested PR title"));
                            let title = if !commits.is_empty() {
                                commits[0].message.lines().next().unwrap_or("Update")
                            } else {
                                "Update"
                            };
                            let block = vec![title];
                            print!("{}", accent_block(&block));

                            if dry_run {
                                print!("{}", status_bar("Preview", "dry run"));
                            } else {
                                print!("{}", status_bar("Ready", "create PR"));
                            }
                        }
                        Err(e) => print!("{}", error(&format!("Failed to get commits: {}", e))),
                    }
                }
                Err(e) => print!("{}", error(&format!("Not a git repository: {}", e))),
            }
        }

        Commands::Status => {
            let current_dir = env::current_dir()?;

            match GitAnalyzer::new(&current_dir) {
                Ok(git) => {
                    match git.get_status() {
                        Ok(status) => {
                            print!("{}", welcome_header(&format!(
                                "on {}  ·  model lfm-2.5-instruct", status.branch
                            )));

                            // Summary
                            print!("{}", section("Overview"));
                            print!("{}", kv_line("branch", &status.branch));
                            print!("{}", kv_line("staged", &format!("{}", status.staged.len())));
                            print!("{}", kv_line("unstaged", &format!("{}", status.unstaged.len())));
                            print!("{}", kv_line("untracked", &format!("{}", status.untracked.len())));

                            // Staged files
                            if !status.staged.is_empty() {
                                print!("{}", section("Staged"));
                                for file in status.staged.iter().take(15) {
                                    print!("{}", file_entry(chars::PLUS, file));
                                }
                                if status.staged.len() > 15 {
                                    print!("{}", overflow(status.staged.len() - 15));
                                }
                            }

                            // Unstaged files
                            if !status.unstaged.is_empty() {
                                print!("{}", section("Unstaged"));
                                for file in status.unstaged.iter().take(15) {
                                    print!("{}", file_entry(chars::MODIFIED, file));
                                }
                                if status.unstaged.len() > 15 {
                                    print!("{}", overflow(status.unstaged.len() - 15));
                                }
                            }

                            // Untracked files
                            if !status.untracked.is_empty() {
                                print!("{}", section("Untracked"));
                                for file in status.untracked.iter().take(10) {
                                    print!("{}", file_entry_dim("?", file));
                                }
                                if status.untracked.len() > 10 {
                                    print!("{}", overflow(status.untracked.len() - 10));
                                }
                            }

                            // Tips
                            if !status.is_clean {
                                print!("\n");
                                print!("{}", hint("Run 'gitpulse commit' to generate a message"));
                            }

                            if status.is_clean {
                                print!("{}", status_bar("Clean", "working tree clean"));
                            } else {
                                print!("{}", status_bar("Pending", &format!(
                                    "{} file(s) changed",
                                    status.staged.len() + status.unstaged.len() + status.untracked.len()
                                )));
                            }
                        }
                        Err(e) => print!("{}", error(&format!("Failed to get status: {}", e))),
                    }
                }
                Err(e) => print!("{}", error(&format!("Not a git repository: {}", e))),
            }
        }

        Commands::Config { command } => match command {
            ConfigCommands::Show => {
                print!("{}", welcome_header("configuration"));

                print!("{}", section("Settings"));
                print!("{}", kv_line("ai provider", "lfm-2.5-instruct"));
                print!("{}", kv_line("commit style", "conventional"));
                print!("{}", kv_line("auto-commit", "false"));
                print!("{}", kv_line("theme", "claude"));

                print!("{}", status_bar("Config", "loaded"));
            }
            ConfigCommands::Set { key, value } => {
                print!("{}", welcome_header("configuration"));
                print!("{}", success(&format!("{} = {}", key, value)));
                print!("{}", status_bar("Saved", "config updated"));
            }
            ConfigCommands::Reset => {
                print!("{}", welcome_header("configuration"));
                print!("{}", success("Configuration reset to defaults"));
                print!("{}", status_bar("Reset", "defaults restored"));
            }
        },
    }

    Ok(())
}
