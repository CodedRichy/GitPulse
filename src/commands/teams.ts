import { CommandRegistration } from './types.js';
import { loadSyncConfig } from '../core/cloud-sync.js';
import { GitOperations } from '../core/git.js';

interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  tier: string;
}

async function fetchTeams(apiKey: string, apiUrl: string): Promise<TeamInfo[]> {
  try {
    const response = await fetch(`${apiUrl}/api/teams`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.teams || [];
  } catch (error) {
    throw new Error(`Failed to fetch teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function teamsHandler(context: any) {
  const gitOps = new GitOperations();
  let repoRoot: string;
  
  try {
    repoRoot = await gitOps.getRepoRoot();
  } catch {
    return {
      success: false,
      error: 'Not in a Git repository. Run "gitpulse init" first.',
    };
  }

  const syncConfig = loadSyncConfig(repoRoot);
  
  if (!syncConfig?.apiKey) {
    return {
      success: false,
      error: 'No API key configured. Run "gitpulse init" to set up cloud sync.',
    };
  }

  const apiUrl = process.env.GITPULSE_API_URL || 'https://gitpulse.io';

  try {
    const teams = await fetchTeams(syncConfig.apiKey, apiUrl);

    if (teams.length === 0) {
      return {
        success: true,
        message: [
          'You are not a member of any teams.',
          '',
          'To create a team, visit: https://gitpulse.io/dashboard/teams',
          'Note: Team creation requires Pro or Enterprise tier.',
        ].join('\n'),
      };
    }

    const lines = [
      '🏢 Your Teams',
      '',
      ...teams.map(team => {
        const role = team.role.charAt(0).toUpperCase() + team.role.slice(1);
        return `  • ${team.name}\n    ID: ${team.id}\n    Role: ${role} | Tier: ${team.tier.toUpperCase()}`;
      }),
      '',
      'To sync telemetry to a team workspace, generate a team API key',
      'from the team dashboard and update .gitpulse/config.json',
    ];

    return {
      success: true,
      message: lines.join('\n'),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list teams',
    };
  }
}

export const teamsCommand: CommandRegistration = {
  name: 'teams',
  description: 'List team workspaces you have access to',
  aliases: ['team'],
  handler: teamsHandler,
};
