import axios from 'axios';

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  labels: string[];
  assignee?: string;
  url: string;
  source: 'github' | 'linear' | 'jira';
}

export interface IssueTrackerConfig {
  github?: {
    token: string;
    owner: string;
    repo: string;
  };
  linear?: {
    apiKey: string;
    teamId?: string;
  };
  jira?: {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
}

/**
 * GitHub integration
 */
export class GitHubTracker {
  private config: IssueTrackerConfig['github'];
  private baseURL = 'https://api.github.com';

  constructor(config: IssueTrackerConfig['github']) {
    this.config = config;
  }

  async getIssues(): Promise<Issue[]> {
    if (!this.config) return [];

    try {
      const response = await axios.get(
        `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/issues`,
        {
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data.map((issue: any) => ({
        id: issue.number.toString(),
        title: issue.title,
        description: issue.body || '',
        status: issue.state === 'open' ? 'open' : 'closed',
        labels: issue.labels.map((l: any) => l.name),
        assignee: issue.assignee?.login,
        url: issue.html_url,
        source: 'github' as const,
      }));
    } catch (error) {
      console.error('GitHub API error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  async createIssue(title: string, description: string, labels: string[] = []): Promise<Issue | null> {
    if (!this.config) return null;

    try {
      const response = await axios.post(
        `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/issues`,
        {
          title,
          body: description,
          labels,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const issue = response.data;
      return {
        id: issue.number.toString(),
        title: issue.title,
        description: issue.body || '',
        status: 'open',
        labels: issue.labels.map((l: any) => l.name),
        assignee: issue.assignee?.login,
        url: issue.html_url,
        source: 'github' as const,
      };
    } catch (error) {
      console.error('Failed to create GitHub issue:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async updateIssue(id: string, updates: { title?: string; description?: string; status?: string }): Promise<boolean> {
    if (!this.config) return false;

    try {
      await axios.patch(
        `${this.baseURL}/repos/${this.config.owner}/${this.config.repo}/issues/${id}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${this.config.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Linear integration
 */
export class LinearTracker {
  private config: IssueTrackerConfig['linear'];
  private baseURL = 'https://api.linear.app/graphql';

  constructor(config: IssueTrackerConfig['linear']) {
    this.config = config;
  }

  async getIssues(): Promise<Issue[]> {
    if (!this.config) return [];

    try {
      const response = await axios.post(
        this.baseURL,
        {
          query: `
            query {
              issues(first: 50) {
                nodes {
                  id
                  title
                  description
                  state {
                    name
                  }
                  labels {
                    nodes {
                      name
                    }
                  }
                  assignee {
                    name
                  }
                  url
                }
              }
            }
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data.issues.nodes.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description || '',
        status: this.mapLinearStatus(issue.state.name),
        labels: issue.labels.nodes.map((l: any) => l.name),
        assignee: issue.assignee?.name,
        url: issue.url,
        source: 'linear' as const,
      }));
    } catch (error) {
      console.error('Linear API error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private mapLinearStatus(status: string): 'open' | 'in_progress' | 'closed' {
    const statusMap: Record<string, 'open' | 'in_progress' | 'closed'> = {
      backlog: 'open',
      todo: 'open',
      in_progress: 'in_progress',
      in_review: 'in_progress',
      done: 'closed',
      canceled: 'closed',
    };
    return statusMap[status.toLowerCase()] || 'open';
  }

  async createIssue(title: string, description: string, labels: string[] = []): Promise<Issue | null> {
    if (!this.config) return null;

    try {
      const teamId = this.config.teamId;
      if (!teamId) {
        console.error('Linear team ID is required');
        return null;
      }

      const response = await axios.post(
        this.baseURL,
        {
          query: `
            mutation($title: String!, $description: String!, $teamId: String!) {
              issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
                issue {
                  id
                  title
                  description
                  state {
                    name
                  }
                  url
                }
              }
            }
          `,
          variables: { title, description, teamId },
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const issue = response.data.data.issueCreate.issue;
      return {
        id: issue.id,
        title: issue.title,
        description: issue.description || '',
        status: this.mapLinearStatus(issue.state.name),
        labels: [],
        url: issue.url,
        source: 'linear' as const,
      };
    } catch (error) {
      console.error('Failed to create Linear issue:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
}

/**
 * Jira integration
 */
export class JiraTracker {
  private config: IssueTrackerConfig['jira'];
  private baseURL: string;

  constructor(config: IssueTrackerConfig['jira']) {
    this.config = config;
    this.baseURL = config ? `https://${config.domain}/rest/api/3` : '';
  }

  async getIssues(): Promise<Issue[]> {
    if (!this.config) return [];

    try {
      const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
      const response = await axios.get(
        `${this.baseURL}/search?jql=project=${this.config.projectKey}&maxResults=50`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
          },
        }
      );

      return response.data.issues.map((issue: any) => ({
        id: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description || '',
        status: this.mapJiraStatus(issue.fields.status.name),
        labels: issue.fields.labels || [],
        assignee: issue.fields.assignee?.displayName,
        url: `https://${this.config?.domain}/browse/${issue.key}`,
        source: 'jira' as const,
      }));
    } catch (error) {
      console.error('Jira API error:', error instanceof Error ? error.message : 'Unknown error');
      return [];
    }
  }

  private mapJiraStatus(status: string): 'open' | 'in_progress' | 'closed' {
    const statusMap: Record<string, 'open' | 'in_progress' | 'closed'> = {
      'to do': 'open',
      'in progress': 'in_progress',
      'in review': 'in_progress',
      done: 'closed',
      closed: 'closed',
    };
    return statusMap[status.toLowerCase()] || 'open';
  }

  async createIssue(title: string, description: string, labels: string[] = []): Promise<Issue | null> {
    if (!this.config) return null;

    try {
      const auth = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
      const response = await axios.post(
        `${this.baseURL}/issue`,
        {
          fields: {
            project: { key: this.config.projectKey },
            summary: title,
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text: description,
                    },
                  ],
                },
              ],
            },
            labels,
          },
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const issue = response.data;
      return {
        id: issue.key,
        title: issue.fields.summary,
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        status: this.mapJiraStatus(issue.fields.status.name),
        labels: issue.fields.labels || [],
        url: `https://${this.config.domain}/browse/${issue.key}`,
        source: 'jira' as const,
      };
    } catch (error) {
      console.error('Failed to create Jira issue:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }
}

/**
 * Factory to create tracker instance based on config
 */
export function createIssueTracker(config: IssueTrackerConfig) {
  if (config.github) {
    return new GitHubTracker(config.github);
  }
  if (config.linear) {
    return new LinearTracker(config.linear);
  }
  if (config.jira) {
    return new JiraTracker(config.jira);
  }
  return null;
}

/**
 * Link commit to issue
 */
export async function linkCommitToIssue(
  commitHash: string,
  issueId: string,
  message: string
): Promise<boolean> {
  // This would need to be implemented based on the specific tracker
  // For GitHub, this could be done via commit message conventions
  // For Linear/Jira, this would require their specific APIs
  console.log(`Linking commit ${commitHash} to issue ${issueId}: ${message}`);
  return true;
}

export default {
  GitHubTracker,
  LinearTracker,
  JiraTracker,
  createIssueTracker,
  linkCommitToIssue,
};
