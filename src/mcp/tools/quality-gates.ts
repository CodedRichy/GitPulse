import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { QualityGatesEngine, formatQualityReportJson } from '../../core/quality-gates.js';
import { loadProjectConfig, isGateEnabled } from '../../core/gitpulse-config.js';
import { GitOperations } from '../../core/git.js';
import * as path from 'path';

export const runQualityGatesTool: Tool = {
  name: 'run_quality_gates',
  description: 'Run quality gates (security scan, code smells, test coverage, documentation) on the repository. Returns a detailed report with scores, issues, and pass/fail status.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to repository (optional, defaults to current directory)',
      },
      strict: {
        type: 'boolean',
        description: 'If true, any issue causes failure. If false, only critical issues cause failure.',
      },
      gates: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific gates to run (e.g., ["security-scan", "code-smells"]). Runs all if omitted.',
      },
    },
  },
};

export async function handleRunQualityGates(args: Record<string, unknown>) {
  const repoPath = (args?.path as string) || '.';
  const strict = (args?.strict as boolean) ?? false;
  const gateFilter = args?.gates as string[] | undefined;

  // Normalize path to use forward slashes and ensure it's absolute
  const normalizedPath = path.resolve(repoPath).replace(/\\/g, '/');
  const gitOps = new GitOperations(normalizedPath);
  const engine = new QualityGatesEngine(normalizedPath, gitOps);
  const config = loadProjectConfig(normalizedPath);

  // If specific gates requested, run only those
  if (gateFilter && gateFilter.length > 0) {
    const results = [];
    for (const gateName of gateFilter) {
      if (!isGateEnabled(config, gateName)) {
        results.push({ gate: gateName, skipped: true, reason: 'Disabled in config' });
        continue;
      }
      const result = await engine.runSpecificGate(gateName);
      if (result) {
        results.push(result);
      } else {
        results.push({ gate: gateName, error: 'Gate not found' });
      }
    }
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    };
  }

  // Run all gates
  const report = await engine.runAllGates(strict);
  const formatted = formatQualityReportJson(report);

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(formatted, null, 2) }],
  };
}
