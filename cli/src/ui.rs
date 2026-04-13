//! Terminal UI — Claude Code aesthetic
//!
//! Design philosophy:
//! - Minimal chrome, maximum content
//! - Dim text for secondary info, bright for primary
//! - Subtle separators instead of heavy boxes
//! - Generous whitespace, clean indentation
//! - Accent color used sparingly (yellow/amber)

use owo_colors::OwoColorize;

/// Box-drawing and icon characters
pub mod chars {
    pub const HORIZONTAL: &str = "─";
    pub const VERTICAL: &str = "│";
    pub const DOT: &str = "●";
    pub const ARROW: &str = "❯";
    #[allow(dead_code)]
    pub const BULLET: &str = "•";
    pub const CHECK: &str = "✓";
    pub const CROSS: &str = "✗";
    pub const PLUS: &str = "+";
    #[allow(dead_code)]
    pub const MINUS: &str = "-";
    pub const MODIFIED: &str = "~";
}

// ─── Layout helpers ──────────────────────────────────────────

/// Full-width thin separator line
pub fn separator() -> String {
    format!("  {}", chars::HORIZONTAL.repeat(56).bright_black())
}

/// Dim separator with a label embedded
pub fn labeled_separator(label: &str) -> String {
    let label_str = format!(" {} ", label);
    let remaining = 56usize.saturating_sub(label_str.len());
    let left = remaining / 2;
    let right = remaining - left;
    format!(
        "  {}{}{}",
        chars::HORIZONTAL.repeat(left).bright_black(),
        label_str.bright_black(),
        chars::HORIZONTAL.repeat(right).bright_black()
    )
}

// ─── Header / Banner ─────────────────────────────────────────

/// Compact welcome header — inspired by Claude Code's startup
pub fn welcome_header(context: &str) -> String {
    let mut out = String::new();
    out.push('\n');
    out.push_str(&format!(
        "  {} {} {}\n",
        chars::DOT.bright_yellow(),
        "GitPulse".bright_white().bold(),
        "v3.0".bright_black()
    ));
    out.push_str(&format!("  {}\n", context.bright_black()));
    out.push('\n');
    out.push_str(&separator());
    out.push('\n');
    out
}

// ─── Sections ────────────────────────────────────────────────

/// Section title — bright, bold, with breathing room
pub fn section(title: &str) -> String {
    format!("\n  {}\n", title.bright_white().bold())
}

/// Key-value line for status info
pub fn kv_line(key: &str, value: &str) -> String {
    format!(
        "  {}  {}\n",
        format!("{:<14}", key).bright_black(),
        value.white()
    )
}

/// A file entry with a status icon
pub fn file_entry(icon: &str, path: &str) -> String {
    format!("    {} {}\n", icon.bright_yellow(), path.white())
}

/// A muted file entry (for less important items)
pub fn file_entry_dim(icon: &str, path: &str) -> String {
    format!("    {} {}\n", icon.bright_black(), path.bright_black())
}

/// A commit entry line
pub fn commit_entry(hash: &str, message: &str) -> String {
    format!(
        "    {} {}\n",
        hash.yellow(),
        message.white()
    )
}

/// Overflow indicator ("... and N more")
pub fn overflow(count: usize) -> String {
    format!("    {} and {} more\n", "...".bright_black(), count.bright_black())
}

// ─── Messages ────────────────────────────────────────────────

/// Success message
pub fn success(message: &str) -> String {
    format!(
        "  {} {}\n",
        chars::CHECK.green(),
        message.white()
    )
}

/// Error message
pub fn error(message: &str) -> String {
    format!(
        "  {} {}\n",
        chars::CROSS.red(),
        message.white()
    )
}

/// Hint / tip line
pub fn hint(message: &str) -> String {
    format!("  {} {}\n", chars::ARROW.bright_black(), message.bright_black())
}

// ─── Status bar ──────────────────────────────────────────────

/// Bottom status bar — clean and minimal
pub fn status_bar(status: &str, context: &str) -> String {
    let mut out = String::new();
    out.push('\n');
    out.push_str(&separator());
    out.push('\n');
    out.push_str(&format!(
        "  {} {}  {}\n",
        chars::ARROW.bright_yellow(),
        status.bright_white(),
        context.bright_black()
    ));
    out
}

// ─── Content block (replaces old panel) ──────────────────────

/// Renders a block of lines with a left-edge accent bar
pub fn accent_block(lines: &[&str]) -> String {
    let mut out = String::new();
    for line in lines {
        if line.is_empty() {
            out.push_str(&format!("  {}\n", chars::VERTICAL.bright_yellow()));
        } else {
            out.push_str(&format!(
                "  {} {}\n",
                chars::VERTICAL.bright_yellow(),
                line
            ));
        }
    }
    out
}

// ─── Diff preview ────────────────────────────────────────────

/// Renders a compact diff preview with +/- coloring
#[allow(dead_code)]
pub fn diff_preview(diff_text: &str, max_lines: usize) -> String {
    let mut out = String::new();
    for line in diff_text.lines().take(max_lines) {
        let trimmed = line.trim_start();
        if trimmed.starts_with('+') {
            out.push_str(&format!("    {}\n", line.green()));
        } else if trimmed.starts_with('-') {
            out.push_str(&format!("    {}\n", line.red()));
        } else {
            out.push_str(&format!("    {}\n", line.bright_black()));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_separator_not_empty() {
        let sep = separator();
        assert!(sep.contains('─'));
    }

    #[test]
    fn test_welcome_header_contains_name() {
        let header = welcome_header("main");
        assert!(header.contains("GitPulse"));
    }
}
