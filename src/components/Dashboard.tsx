import React, { useState, useEffect } from 'react';
import { Box as InkBox, Text, useInput, useApp } from 'ink';
import { Box, Grid, Header, StatusBar, createGitStatusBar, StatCard, FeatureCard } from './ui/index.js';
import { GitOperations } from '../core/git.js';
import { RepoStatus } from '../core/models.js';
import { getGlobalHealthManager } from '../ai/provider-health.js';

interface DashboardProps {
  onCommandSelect?: (command: string) => void;
}

export function Dashboard({ onCommandSelect }: DashboardProps) {
  const { exit } = useApp();
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [qualityScore, setQualityScore] = useState(87);
  const [provider, setProvider] = useState('Auto');
  const [loading, setLoading] = useState(true);
  const [git] = useState(() => new GitOperations());

  useEffect(() => {
    loadStatus();
    loadProviderInfo();
  }, []);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    if (input === 'c' && onCommandSelect) {
      onCommandSelect('commit');
    }
    if (input === 's' && onCommandSelect) {
      onCommandSelect('status');
    }
    if (input === 'b' && onCommandSelect) {
      onCommandSelect('branch');
    }
    if (input === 'p' && onCommandSelect) {
      onCommandSelect('pr');
    }
    if (input === 'h' && onCommandSelect) {
      onCommandSelect('help');
    }
  });

  async function loadStatus() {
    try {
      const isRepo = await git.isRepo();
      if (isRepo) {
        const repoStatus = await git.getStatus();
        setStatus(repoStatus);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  function loadProviderInfo() {
    const healthManager = getGlobalHealthManager();
    const providers = healthManager.getAllHealth();
    if (providers.length > 0) {
      // Find first available provider or use the first one
      const activeProvider = providers.find(p => p.available) || providers[0];
      if (activeProvider) {
        setProvider(activeProvider.name);
      }
    }
  }

  if (loading) {
    return (
      <InkBox flexDirection="column" alignItems="center" marginTop={2}>
        <Text color="cyan">Loading dashboard...</Text>
      </InkBox>
    );
  }

  const statusItems = status 
    ? createGitStatusBar(status.branch, status.ahead, status.behind, qualityScore, provider, 'ready')
    : createGitStatusBar('no-repo', 0, 0, qualityScore, provider, 'no-repo');

  const quickActions = [
    { icon: '💾', label: 'Commit', key: 'c', desc: 'Smart commit with AI' },
    { icon: '📊', label: 'Status', key: 's', desc: 'View repo status' },
    { icon: '🌿', label: 'Branch', key: 'b', desc: 'Branch management' },
    { icon: '📝', label: 'PR', key: 'p', desc: 'Generate PR desc' },
    { icon: '❓', label: 'Help', key: 'h', desc: 'Show commands' },
    { icon: '🚪', label: 'Quit', key: 'q', desc: 'Exit GitPulse' },
  ];

  return (
    <InkBox flexDirection="column" padding={1}>
      <Header mini subtitle="AI-Powered Git Guardrails" />
      
      <Grid columns={2} gap={3} marginTop={1}>
        {/* Repository Stats */}
        <Box title="📊 Repository Stats" variant="primary" width={50}>
          <Grid columns={2} gap={2}>
            <StatCard 
              label="Quality Score" 
              value={`${qualityScore}/100`} 
              trend="+5%"
              trendDirection="up"
              variant={qualityScore > 80 ? 'success' : qualityScore > 60 ? 'warning' : 'error'}
            />
            <StatCard 
              label="Commits" 
              value="42" 
              trend="+12"
              trendDirection="up"
            />
            <StatCard 
              label="Secrets Blocked" 
              value="3" 
              variant="success"
            />
            <StatCard 
              label="Files Changed" 
              value={status?.staged.length || 0}
            />
          </Grid>
        </Box>

        {/* Quality Gates */}
        <Box 
          title="🛡️ Quality Gates" 
          variant={qualityScore > 80 ? 'success' : 'warning'}
          width={50}
        >
          <InkBox flexDirection="column" gap={1}>
            {[
              { name: 'Security Scan', status: '✓', color: 'green' },
              { name: 'Code Smells', status: '✓', color: 'green' },
              { name: 'Test Coverage', status: '⚠', color: 'yellow' },
              { name: 'Documentation', status: '✓', color: 'green' },
            ].map((gate, i) => (
              <InkBox key={i} flexDirection="row" gap={2}>
                <Text color={gate.color}>{gate.status}</Text>
                <Text>{gate.name}</Text>
              </InkBox>
            ))}
          </InkBox>
        </Box>

        {/* Quick Actions */}
        <Box title="⚡ Quick Actions" variant="info" width={50}>
          <InkBox flexDirection="column" gap={1}>
            {quickActions.map((action, i) => (
              <InkBox key={i} flexDirection="row" gap={2}>
                <Text>{action.icon}</Text>
                <Text bold color="cyan">[{action.key}]</Text>
                <Text>{action.label}</Text>
                <Text dimColor>- {action.desc}</Text>
              </InkBox>
            ))}
          </InkBox>
        </Box>

        {/* Recent Activity */}
        <Box title="📝 Recent Commits" variant="default" width={50} height={6}>
          <InkBox flexDirection="column">
            <Text dimColor>feat: Add team dashboard UI components</Text>
            <Text dimColor>fix: Resolve security vulnerabilities</Text>
            <Text dimColor>docs: Update pricing strategy</Text>
          </InkBox>
        </Box>
      </Grid>

      <StatusBar items={statusItems} />
    </InkBox>
  );
}

export default Dashboard;
