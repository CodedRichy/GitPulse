//! Terminal UI - Claude Code aesthetic
//!
//! Clean, minimal box-drawing UI with:
//! - Rounded corner borders
//! - Split panel layout
//! - Status bar at bottom
//! - Simple colors (orange/amber accent)

use owo_colors::OwoColorize;

/// Claude Code color palette
pub mod colors {
    use owo_colors::AnsiColors;
    
    /// Primary accent - Orange/Amber like Claude Code
    pub const ACCENT: AnsiColors = AnsiColors::Yellow;
    /// Secondary accent
    #[allow(dead_code)]
    pub const SECONDARY: AnsiColors = AnsiColors::Cyan;
    #[allow(dead_code)]
    pub const SUCCESS: AnsiColors = AnsiColors::Green;
    #[allow(dead_code)]
    pub const ERROR: AnsiColors = AnsiColors::Red;
    #[allow(dead_code)]
    pub const MUTED: AnsiColors = AnsiColors::BrightBlack;
    #[allow(dead_code)]
    pub const TEXT: AnsiColors = AnsiColors::White;
    #[allow(dead_code)]
    pub const BRIGHT: AnsiColors = AnsiColors::BrightWhite;
}

/// Box drawing characters
pub mod chars {
    // Rounded corners (Claude Code style)
    pub const TOP_LEFT: &str = "╭";
    pub const TOP_RIGHT: &str = "╮";
    pub const BOTTOM_LEFT: &str = "╰";
    pub const BOTTOM_RIGHT: &str = "╯";
    pub const HORIZONTAL: &str = "─";
    pub const VERTICAL: &str = "│";
    pub const T_TOP: &str = "┬";
    pub const T_BOTTOM: &str = "┴";
    
    // Icons
    pub const ARROW: &str = "❯";
    pub const BULLET: &str = "•";
    pub const CHECK: &str = "✓";
    pub const X: &str = "✗";
    pub const GEAR: &str = "⚙";
    pub const SPARKLE: &str = "✨";
}

/// Draw a horizontal line
pub fn line(width: usize) -> String {
    chars::HORIZONTAL.repeat(width)
}

/// Draw top border
pub fn top_border(width: usize) -> String {
    format!("{}{}{}", 
        chars::TOP_LEFT,
        line(width - 2),
        chars::TOP_RIGHT
    )
}

/// Draw bottom border
pub fn bottom_border(width: usize) -> String {
    format!("{}{}{}", 
        chars::BOTTOM_LEFT,
        line(width - 2),
        chars::BOTTOM_RIGHT
    )
}

/// Draw a centered title in a box
#[allow(dead_code)]
pub fn title_box(width: usize, title: &str) -> String {
    let title_len = title.len();
    let padding = (width - 2 - title_len) / 2;
    let left_pad = " ".repeat(padding);
    let right_pad = " ".repeat(width - 2 - title_len - padding);
    
    format!("{}{}{}{}", 
        chars::VERTICAL,
        left_pad,
        title.bright_white().bold(),
        right_pad
    )
}

/// Simple panel with content
pub fn panel(content: &[&str]) -> String {
    let mut output = String::new();
    let width = 60;
    
    // Top border
    output.push_str(&format!("{}\n", top_border(width).bright_yellow()));
    
    // Content lines
    for line in content {
        let padding = width.saturating_sub(line.chars().count() + 2);
        output.push_str(&format!("{} {}{} {}\n", 
            chars::VERTICAL.bright_yellow(),
            line,
            " ".repeat(padding),
            chars::VERTICAL.bright_yellow()
        ));
    }
    
    // Bottom border
    output.push_str(&format!("{}", bottom_border(width).bright_yellow()));
    
    output
}

/// Welcome screen like Claude Code
pub fn welcome_screen(model: &str, repo: &str) -> String {
    let mut output = String::new();
    
    // Header
    output.push_str(&format!("\n  {} GitPulse {} \n", 
        chars::SPARKLE.bright_yellow(),
        "v3.0".bright_black()
    ));
    
    // Main box
    output.push('\n');
    output.push_str(&format!("{}\n", top_border(60).bright_yellow()));
    
    // Welcome back
    output.push_str(&format!("{} {:<56} {}\n",
        chars::VERTICAL.bright_yellow(),
        "Welcome back!".bright_white().bold(),
        chars::VERTICAL.bright_yellow()
    ));
    output.push_str(&format!("{} {:<56} {}\n",
        chars::VERTICAL.bright_yellow(),
        "",
        chars::VERTICAL.bright_yellow()
    ));
    
    // Git logo ASCII art
    let logo = r#"
       ╭───╮
       │ ● │
       ╰───╯
    "#;
    for line in logo.lines() {
        output.push_str(&format!("{} {:<56} {}\n",
            chars::VERTICAL.bright_yellow(),
            line.bright_white(),
            chars::VERTICAL.bright_yellow()
        ));
    }
    
    // Model info
    output.push_str(&format!("{} {:<56} {}\n",
        chars::VERTICAL.bright_yellow(),
        "",
        chars::VERTICAL.bright_yellow()
    ));
    output.push_str(&format!("{} {:<56} {}\n",
        chars::VERTICAL.bright_yellow(),
        format!("{} Using {}", chars::GEAR.bright_black(), model).bright_black(),
        chars::VERTICAL.bright_yellow()
    ));
    output.push_str(&format!("{} {:<56} {}\n",
        chars::VERTICAL.bright_yellow(),
        format!("{} {}", chars::BULLET.bright_black(), repo).bright_black(),
        chars::VERTICAL.bright_yellow()
    ));
    
    output.push_str(&format!("{}\n", bottom_border(60).bright_yellow()));
    
    output
}

/// Status bar like Claude Code
pub fn status_bar(context: &str) -> String {
    let width = 60;
    let left = format!("{} {}", chars::ARROW.bright_yellow(), "Ready".bright_white());
    let right = format!("{} {}", context.bright_black(), chars::GEAR.bright_black());
    
    // Calculate padding, ensuring it doesn't overflow
    let left_len = left.len().min(width / 2);
    let right_len = right.len().min(width / 2);
    let padding = width.saturating_sub(left_len + right_len + 2);
    
    format!("\n{} {} {}\n",
        left,
        " ".repeat(padding),
        right
    )
}

/// Command suggestion line
#[allow(dead_code)]
pub fn command_tip(command: &str, description: &str) -> String {
    format!("  {} {} {}\n",
        chars::BULLET.bright_black(),
        command.yellow(),
        description.bright_black()
    )
}

/// Section header
pub fn section_header(title: &str) -> String {
    format!("\n{}\n", title.bright_white().bold())
}

/// Info line with bullet
#[allow(dead_code)]
pub fn info_line(icon: &str, text: &str) -> String {
    format!("  {} {}\n", icon.bright_yellow(), text)
}

/// Print thinking/loading state
#[allow(dead_code)]
pub fn thinking(message: &str) -> String {
    format!("  {} {}...\n", chars::GEAR.yellow(), message.bright_black())
}

/// Success message
pub fn success(message: &str) -> String {
    format!("  {} {}\n", chars::CHECK.green(), message.bright_white())
}

/// Error message
pub fn error(message: &str) -> String {
    format!("  {} {}\n", chars::X.red(), message.bright_white())
}

/// Two column layout (like Claude Code split view)
pub fn two_column(left: &[&str], right: &[&str]) -> String {
    let mut output = String::new();
    
    // Top border with divider
    let top = format!("{}{}{}{}{}",
        chars::TOP_LEFT,
        line(28),
        chars::T_TOP,
        line(28),
        chars::TOP_RIGHT
    );
    output.push_str(&format!("{}\n", top.bright_yellow()));
    
    // Content rows
    let max_rows = left.len().max(right.len());
    for i in 0..max_rows {
        let left_line = left.get(i).unwrap_or(&"");
        let right_line = right.get(i).unwrap_or(&"");
        
        // Truncate if too long
        let left_display = if left_line.len() > 26 {
            format!("{:<28}", format!("{}...", &left_line[..23]))
        } else {
            format!("{:<28}", left_line)
        };
        
        let right_display = if right_line.len() > 26 {
            format!("{:<28}", format!("{}...", &right_line[..23]))
        } else {
            format!("{:<28}", right_line)
        };
        
        let row = format!("{} {} {} {} {}",
            chars::VERTICAL,
            left_display,
            chars::VERTICAL,
            right_display,
            chars::VERTICAL
        );
        output.push_str(&format!("{}\n", row.bright_yellow()));
    }
    
    // Bottom border
    let bottom = format!("{}{}{}{}{}",
        chars::BOTTOM_LEFT,
        line(28),
        chars::T_BOTTOM,
        line(28),
        chars::BOTTOM_RIGHT
    );
    output.push_str(&format!("{}", bottom.bright_yellow()));
    
    output
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_borders() {
        let top = top_border(10);
        assert!(top.contains('╭'));
        assert!(top.contains('╮'));
        
        let bottom = bottom_border(10);
        assert!(bottom.contains('╰'));
        assert!(bottom.contains('╯'));
    }
    
    #[test]
    fn test_line() {
        assert_eq!(line(5).len(), 5);
    }
}
