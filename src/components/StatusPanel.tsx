import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import { Box as InkBox, Text } from 'ink';
import { GitOperations } from '../core/git.js';
import { RepoStatus, FileChange } from '../core/models.js';
import { ChatMessage, StatusBar as OldStatusBar, SectionDivider, Spinner } from './ui.js';
import { Box, StatusBar, createGitStatusBar } from './ui/index.js';

export function StatusPanel() {
  const [status, setStatus] = useState<RepoStatus | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [git] = useState(() => new GitOperations());

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const isRepo = await git.isRepo();
      if (!isRepo) {
        setError('Not a git repository');
        setLoading(false);
        return;
      }

      const [repoStatus, changes] = await Promise.all([
        git.getStatus(),
        git.getFileChanges()
      ]);

      setStatus(repoStatus);
      setFileChanges(changes);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  function getStatusColor(status: FileChange['status']) {
    switch (status) {
      case 'added': return '#50FA7B';
      case 'modified': return '#F1FA8C';
      case 'deleted': return '#FF5555';
      case 'untracked': return '#6272A4';
      default: return 'white';
    }
  }

  function getStatusIcon(status: FileChange['status']) {
    switch (status) {
      case 'added': return '+';
      case 'modified': return '~';
      case 'deleted': return '-';
      case 'untracked': return '?';
      default: return ' ';
    }
  }

  if (loading) {
    return (
      <ChatMessage role="assistant" loading>
        <Spinner text="Analyzing repository status..." />
      </ChatMessage>
    );
  }

  if (error) {
    return (
      <ChatMessage role="system">
        <Text color="red">{error}</Text>
      </ChatMessage>
    );
  }

  if (!status) {
    return null;
  }

  const stagedFiles = fileChanges.filter(f => status.staged.includes(f.path));
  const unstagedFiles = fileChanges.filter(f => 
    status.unstaged.includes(f.path) || status.untracked.includes(f.path)
  );

  return (
    <InkBox flexDirection="column">
      <Box title={`🌿 Branch: ${status.branch}`} variant="primary" width={70}>
        <InkBox flexDirection="column">
          {status.ahead > 0 && (
            <Text color="green">⬆️ {status.ahead} commit(s) ahead of remote</Text>
          )}
          {status.behind > 0 && (
            <Text color="yellow">⬇️ {status.behind} commit(s) behind remote</Text>
          )}
          {status.ahead === 0 && status.behind === 0 && (
            <Text color="green">✓ In sync with remote</Text>
          )}
        </InkBox>
      </Box>

      {/* Staged changes */}
      {stagedFiles.length > 0 && (
        <Box 
          title={`✅ Staged for commit (${stagedFiles.length} files)`} 
          variant="success" 
          width={70}
          marginTop={1}
        >
          <InkBox flexDirection="column">
            {stagedFiles.map(file => (
              <InkBox key={file.path} flexDirection="row" gap={1}>
                <Text color="green">{getStatusIcon(file.status)}</Text>
                <Text>{file.path}</Text>
                {(file.additions > 0 || file.deletions > 0) && (
                  <Text dimColor>(+{file.additions}/-{file.deletions})</Text>
                )}
              </InkBox>
            ))}
          </InkBox>
        </Box>
      )}

      {/* Unstaged changes */}
      {unstagedFiles.length > 0 && (
        <Box 
          title={`⚠️ Not staged (${unstagedFiles.length} files)`} 
          variant="warning" 
          width={70}
          marginTop={1}
        >
          <InkBox flexDirection="column">
            {unstagedFiles.map(file => (
              <InkBox key={file.path} flexDirection="row" gap={1}>
                <Text color={getStatusColor(file.status)}>
                  {getStatusIcon(file.status)}
                </Text>
                <Text>{file.path}</Text>
                {(file.additions > 0 || file.deletions > 0) && (
                  <Text dimColor>(+{file.additions}/-{file.deletions})</Text>
                )}
              </InkBox>
            ))}
          </InkBox>
        </Box>
      )}

      {/* Clean state */}
      {status.isClean && (
        <Box 
          title="✨ Working Tree Clean" 
          variant="success" 
          width={70}
          marginTop={1}
        >
          <Text color="green">Nothing to commit, working tree clean</Text>
        </Box>
      )}

      {/* Summary */}
      {!status.isClean && (
        <Box title="📊 Summary" variant="info" width={70} marginTop={1}>
          <Text>
            <Text color="green">{status.staged.length} staged</Text> | {''}
            <Text color="yellow">{status.unstaged.length} modified</Text> | {''}
            <Text color="gray">{status.untracked.length} untracked</Text>
          </Text>
        </Box>
      )}

      <StatusBar 
        items={createGitStatusBar(status.branch, status.ahead, status.behind, 100, 'Auto', 'status')}
      />
    </InkBox>
  );
}

export default StatusPanel;
