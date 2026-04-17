import { CommandRegistration } from './types.js';
import { ComplianceReportGenerator } from '../core/compliance-report.js';

export const reportCommand: CommandRegistration = {
  name: 'report',
  description: 'Generate a compliance report from audit history',
  handler: async (context) => {
    const generator = new ComplianceReportGenerator('.');
    
    const period = context.flags.period as string || 'all';
    const output = context.flags.output as string;
    const noDetails = context.flags['no-details'] === true;
    const noTrends = context.flags['no-trends'] === true;
    const noOverrides = context.flags['no-overrides'] === true;

    const report = generator.generate({
      period: period as 'day' | 'week' | 'month' | 'all',
      includeTrends: !noTrends,
      includeDetails: !noDetails,
      includeOverrides: !noOverrides,
    });

    if (output) {
      generator.saveReport(report, output);
      return {
        success: true,
        message: `Compliance report saved to ${output}`,
      };
    }

    return {
      success: true,
      output: report,
    };
  },
};
