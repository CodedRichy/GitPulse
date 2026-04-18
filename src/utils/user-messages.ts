/**
 * User-Friendly Error Messages
 * Provides contextual, actionable error messages for end users
 * Supports localization framework
 */

import { 
  GitPulseError,
  GitError,
  ConfigError,
  ValidationError,
  AIError,
  SecurityError,
  ProtocolError,
  QualityGateError
} from './errors.js';

/**
 * Error message catalog with user-friendly copy
 * Organized by error type with actionable recovery steps
 */
export const userMessages = {
  // Git errors
  NOT_A_REPO: {
    title: 'Not a Git Repository',
    message: 'This directory is not a Git repository.',
    steps: [
      'Initialize a new repository with: git init',
      'Or navigate to an existing Git repository',
      'Or clone a repository: git clone <url>'
    ]
  },

  GIT_NO_COMMITS: {
    title: 'No Commits Found',
    message: 'The repository has no commits yet.',
    steps: [
      'Create your first commit: git add . && git commit -m "Initial commit"',
      'Then try the GitPulse command again'
    ]
  },

  GIT_NO_CHANGES: {
    title: 'No Changes Detected',
    message: 'There are no changes to commit.',
    steps: [
      'Make changes to your files',
      'Stage changes with: git add <files>',
      'Then try again'
    ]
  },

  GIT_UNSTAGED_CHANGES: {
    title: 'Unstaged Changes',
    message: 'You have changes that are not staged.',
    steps: [
      'Review changes: git diff',
      'Stage changes: git add <files>',
      'Or discard changes: git checkout <files>'
    ]
  },

  GIT_MERGE_CONFLICT: {
    title: 'Merge Conflict',
    message: 'There are conflicting changes that need manual resolution.',
    steps: [
      'Review conflicts in your files (marked with <<<<<<, ======, >>>>>>)',
      'Edit files to resolve conflicts',
      'Stage resolved files: git add <files>',
      'Complete the merge: git commit'
    ]
  },

  GIT_OPERATION_FAILED: {
    title: 'Git Operation Failed',
    message: 'An error occurred while performing a Git operation.',
    steps: [
      'Check your Git configuration: git config --list',
      'Verify you have permissions for this repository',
      'Try the operation again with more verbosity'
    ]
  },

  // Configuration errors
  CONFIG_NOT_FOUND: {
    title: 'Configuration Not Found',
    message: 'GitPulse configuration file not found.',
    steps: [
      'Create a gitpulse.config.json or gitpulse.config.ts file',
      'Or run: gitpulse init',
      'See documentation: https://gitpulse.dev/docs/configuration'
    ]
  },

  CONFIG_INVALID: {
    title: 'Invalid Configuration',
    message: 'The configuration file has errors.',
    steps: [
      'Check syntax: ${details}',
      'Validate against schema: gitpulse validate',
      'See example: https://gitpulse.dev/docs/config-example'
    ]
  },

  CONFIG_MISSING_REQUIRED: {
    title: 'Missing Required Configuration',
    message: 'Required configuration option is missing: ${field}',
    steps: [
      'Add ${field} to your gitpulse config',
      'See documentation: https://gitpulse.dev/docs/config#${field}'
    ]
  },

  // Validation errors
  INVALID_EMAIL: {
    title: 'Invalid Email Address',
    message: 'The email address format is invalid.',
    steps: [
      'Enter a valid email: user@example.com',
      'Check for spaces or special characters'
    ]
  },

  INVALID_JSON: {
    title: 'Invalid JSON',
    message: 'The JSON is not valid.',
    steps: [
      'Check for ${details}',
      'Use a JSON validator: https://jsonlint.com',
      'Ensure all quotes are properly closed'
    ]
  },

  INVALID_FILE_PATH: {
    title: 'Invalid File Path',
    message: 'The file path is invalid.',
    steps: [
      'Check that the directory exists',
      'Avoid special characters in paths',
      'Use forward slashes / in all paths'
    ]
  },

  INJECTION_DETECTED: {
    title: 'Suspicious Input Detected',
    message: 'The input contains suspicious patterns that could be a security risk.',
    steps: [
      'Review your input for unexpected characters',
      'Avoid shell commands or code in text fields',
      'Contact support if you believe this is an error'
    ]
  },

  // AI/Model errors
  AI_NO_RESPONSE: {
    title: 'AI Service Not Responding',
    message: 'The AI service did not return a valid response.',
    steps: [
      'Check your internet connection',
      'Verify your API key/credentials',
      'Try again in a few moments',
      'Check service status: https://status.openai.com'
    ]
  },

  AI_RATE_LIMITED: {
    title: 'Rate Limited',
    message: 'Too many requests to the AI service. Please wait.',
    steps: [
      'Wait ${waitTime} seconds before trying again',
      'Reduce the number of simultaneous requests',
      'Consider upgrading your API tier'
    ]
  },

  AI_INVALID_RESPONSE: {
    title: 'Invalid AI Response',
    message: 'The AI returned unexpected data.',
    steps: [
      'Try the operation again',
      'The AI may be having issues',
      'Contact support if this persists'
    ]
  },

  // Security errors
  UNAUTHORIZED: {
    title: 'Authentication Required',
    message: 'You need to sign in to perform this action.',
    steps: [
      'Log in: gitpulse login',
      'Or authenticate: gitpulse auth github',
      'Verify your credentials are correct'
    ]
  },

  FORBIDDEN: {
    title: 'Access Denied',
    message: 'You do not have permission to perform this action.',
    steps: [
      'Contact your repository administrator',
      'Check if you have the required permissions',
      'Verify you are on the correct team/organization'
    ]
  },

  TOKEN_EXPIRED: {
    title: 'Authentication Expired',
    message: 'Your authentication token has expired.',
    steps: [
      'Log in again: gitpulse login',
      'Or refresh credentials: gitpulse auth refresh',
      'Then try the operation again'
    ]
  },

  TOKEN_INVALID: {
    title: 'Invalid Credentials',
    message: 'Your credentials are invalid or corrupted.',
    steps: [
      'Log out: gitpulse logout',
      'Log back in: gitpulse login',
      'If problems persist, clear cache: rm ~/.gitpulse/*'
    ]
  },

  PERMISSION_DENIED: {
    title: 'Permission Denied',
    message: 'You do not have permission to access this resource.',
    steps: [
      'Check file/directory permissions',
      'Verify you are the repository owner',
      'Ask an administrator to grant permissions'
    ]
  },

  // Protocol errors
  MCP_CONNECTION_FAILED: {
    title: 'Connection Failed',
    message: 'Failed to connect to the AI service.',
    steps: [
      'Check your internet connection',
      'Verify the server is running',
      'Check firewall/proxy settings',
      'Try again in a few moments'
    ]
  },

  MCP_TIMEOUT: {
    title: 'Connection Timeout',
    message: 'The request took too long to complete.',
    steps: [
      'Check your internet connection speed',
      'Reduce the size of your input',
      'Try with fewer concurrent requests',
      'Try again in a few moments'
    ]
  },

  MCP_INVALID_RESPONSE: {
    title: 'Invalid Server Response',
    message: 'The server returned invalid data.',
    steps: [
      'The server may be having issues',
      'Try the operation again',
      'Contact support if this persists'
    ]
  },

  // Quality gate errors
  QUALITY_GATE_FAILED: {
    title: 'Quality Gate Failed',
    message: 'Your changes do not meet the quality requirements.',
    steps: [
      'See details above for specific issues',
      'Fix the issues: ${details}',
      'Run quality gates again to verify: gitpulse commit --dry-run --strict',
      'Contact your team lead if you have questions'
    ]
  },

  COMMIT_MESSAGE_TOO_SHORT: {
    title: 'Commit Message Too Short',
    message: 'Your commit message does not meet minimum length requirements.',
    steps: [
      'Write a more descriptive commit message',
      'Minimum length: ${minimum} characters',
      'Format: <type>: <description>'
    ]
  },

  COMMIT_MESSAGE_INVALID_FORMAT: {
    title: 'Invalid Commit Message Format',
    message: 'Your commit message does not follow the required format.',
    steps: [
      'Format your message as: ${format}',
      'Example: "feat: add user authentication"',
      'See conventions: gitpulse conventions'
    ]
  },

  // General errors
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    steps: [
      'Try the operation again',
      'Check the detailed error log: gitpulse logs',
      'Report the issue if it persists',
      'Include this info: ${errorId}'
    ]
  },

  FILE_NOT_FOUND: {
    title: 'File Not Found',
    message: 'The file ${path} does not exist.',
    steps: [
      'Check the file path is correct',
      'Verify the file has not been deleted',
      'Create the file if needed'
    ]
  },

  DIRECTORY_NOT_FOUND: {
    title: 'Directory Not Found',
    message: 'The directory ${path} does not exist.',
    steps: [
      'Check the directory path is correct',
      'Verify the directory has not been deleted',
      'Create the directory if needed: mkdir -p ${path}'
    ]
  },

  FILE_PERMISSION_DENIED: {
    title: 'Permission Denied',
    message: 'Cannot access file: ${path}',
    steps: [
      'Check file permissions: ls -la ${path}',
      'Grant read/write permission: chmod 644 ${path}',
      'Or run with elevated privileges if needed'
    ]
  },

  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'A network error occurred.',
    steps: [
      'Check your internet connection',
      'Check if the service is online',
      'Try again in a few moments',
      'Check your firewall/proxy settings'
    ]
  },

  TIMEOUT: {
    title: 'Operation Timeout',
    message: 'The operation took too long and was cancelled.',
    steps: [
      'The server or network may be slow',
      'Try the operation again',
      'Reduce the workload if possible',
      'Check your internet connection'
    ]
  },
} as const;

/**
 * Type-safe error message retriever
 */
export function getUserMessage(
  error: Error | string,
  context?: Record<string, any>
): { title: string; message: string; steps: string[] } {
  let messageKey = 'UNKNOWN_ERROR';
  let details = '';

  // Determine message key from error type
  if (error instanceof ValidationError) {
    messageKey = 'INVALID_JSON';
  } else if (error instanceof ConfigError) {
    messageKey = error.message.includes('not found') ? 'CONFIG_NOT_FOUND' : 'CONFIG_INVALID';
  } else if (error instanceof GitError) {
    if (error.message.includes('not a git repository')) messageKey = 'NOT_A_REPO';
    else if (error.message.includes('no commits')) messageKey = 'GIT_NO_COMMITS';
    else if (error.message.includes('merge conflict')) messageKey = 'GIT_MERGE_CONFLICT';
    else messageKey = 'GIT_OPERATION_FAILED';
  } else if (error instanceof SecurityError) {
    if (error.message.includes('expired')) messageKey = 'TOKEN_EXPIRED';
    else if (error.message.includes('unauthorized')) messageKey = 'UNAUTHORIZED';
    else messageKey = 'FORBIDDEN';
  } else if (error instanceof AIError) {
    if (error.message.includes('rate limited')) messageKey = 'AI_RATE_LIMITED';
    else if (error.message.includes('no response')) messageKey = 'AI_NO_RESPONSE';
    else messageKey = 'AI_INVALID_RESPONSE';
  } else if (error instanceof ProtocolError) {
    if (error.message.includes('timeout')) messageKey = 'MCP_TIMEOUT';
    else messageKey = 'MCP_CONNECTION_FAILED';
  } else if (error instanceof QualityGateError) {
    messageKey = 'QUALITY_GATE_FAILED';
  }

  const messageTemplate = userMessages[messageKey as keyof typeof userMessages];

  if (!messageTemplate) {
    return {
      title: 'Error',
      message: error instanceof Error ? error.message : String(error),
      steps: ['Contact support with the error details above']
    };
  }

  // Interpolate context variables with safe defaults
  let message: string = messageTemplate.message;
  let steps: string[] = messageTemplate.steps.map(step => step);

  if (context) {
    for (const [key, value] of Object.entries(context)) {
      const placeholder = `\${${key}}`;
      const valueStr = String(value);
      message = message.replace(new RegExp(placeholder, 'g'), valueStr);

      steps = steps.map(step =>
        step.replace(new RegExp(placeholder, 'g'), valueStr)
      );
    }
  }

  // Clean up any remaining uninterpolated variables by removing or replacing with sensible defaults
  message = message.replace(/\$\{details\}/g, 'check the detailed error log for more information');
  message = message.replace(/\$\{waitTime\}/g, 'a few');
  message = message.replace(/\$\{\w+\}/g, 'that value');

  steps = steps.map(step => {
    step = step.replace(/\$\{details\}/g, 'check the error message above');
    step = step.replace(/\$\{waitTime\}/g, 'a few seconds');
    step = step.replace(/\$\{\w+\}/g, 'that value');
    return step;
  });

  return {
    title: messageTemplate.title,
    message,
    steps
  };
}

/**
 * Format error for display in terminal
 */
export function formatErrorForTerminal(
  error: Error | string,
  context?: Record<string, any>
): string {
  const { title, message, steps } = getUserMessage(error, context);

  const lines = [
    '',
    `❌ ${title}`,
    `   ${message}`,
    '',
    'What to do:',
    ...steps.map((step, i) => `  ${i + 1}. ${step}`),
    '',
  ];

  return lines.join('\n');
}

/**
 * Format error for API responses
 */
export function formatErrorForAPI(
  error: Error | string,
  context?: Record<string, any>
): { status: number; body: any } {
  const userData = getUserMessage(error, context);
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let statusCode = 500;
  if (error instanceof ValidationError) statusCode = 400;
  else if (error instanceof SecurityError) statusCode = 401;
  else if (error instanceof ConfigError) statusCode = 400;
  else if (error instanceof AIError) statusCode = 503;
  else if (error instanceof ProtocolError) statusCode = 503;

  return {
    status: statusCode,
    body: {
      error: userData.title,
      message: userData.message,
      errorId,
      suggestions: userData.steps,
      details: context
    }
  };
}
