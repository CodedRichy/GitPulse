import { useGitPulseApp } from './useGitPulseApp.js';
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { GitOperations } from '../core/git.js';
import { RepoStatus, FileChange } from '../core/models.js';
import { ChatMessage, StatusBar, Spinner, SuccessCheck, SectionDivider } from './ui.js';

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
    <Box flexDirection="column">
      <ChatMessage role="assistant">
        <Box flexDirection="column">
          <Text>Repository status for branch </Text>
          <Text bold color="#10B981">{status.branch}</Text>
          {status.ahead > 0 && (
            <Text color="green">  {status.ahead} commit(s) ahead of remote</Text>
          )}
          {status.behind > 0 && (
            <Text color="yellow">  {status.behind} commit(s) behind remote</Text>
          )}
        </Box>
      </ChatMessage>

      {/* Staged changes */}
      {stagedFiles.length > 0 && (
        <ChatMessage role="system">
          <Box flexDirection="column">
            <Text bold color="#50FA7B">Staged for commit ({stagedFiles.length} files)</Text>
            <SectionDivider />
            {stagedFiles.map(file => (
              <Box key={file.path}>
                <Text color="#50FA7B">  {getStatusIcon(file.status)} {file.path}</Text>
                {(file.additions > 0 || file.deletions > 0) && (
                  <Text dimColor>
                    {' '}(+{file.additions}/-{file.deletions})
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        </ChatMessage>
      )}

      {/* Unstaged changes */}
      {unstagedFiles.length > 0 && (
        <ChatMessage role="system">
          <Box flexDirection="column">
            <Text bold color="#F1FA8C">Not staged ({unstagedFiles.length} files)</Text>
            <SectionDivider />
            {unstagedFiles.map(file => (
              <Box key={file.path}>
                <Text color={getStatusColor(file.status)}>
                  {'  '}{getStatusIcon(file.status)} {file.path}
                </Text>
                {(file.additions > 0 || file.deletions > 0) && (
                  <Text dimColor>
                    {' '}(+{file.additions}/-{file.deletions})
                  </Text>
                )}
              </Box>
            ))}
          </Box>
        </ChatMessage>
      )}

      {/* Clean state */}
      {status.isClean && (
        <ChatMessage role="assistant">
          <SuccessCheck text="Working tree clean - nothing to commit" />
        </ChatMessage>
      )}

      {/* Summary */}
      {!status.isClean && (
        <ChatMessage role="system">
          <Text dimColor>
            {status.staged.length} staged, {status.unstaged.length} modified, {status.untracked.length} untracked
          </Text>
        </ChatMessage>
      )}

      <StatusBar 
        branch={status.branch} 
        ahead={status.ahead} 
        behind={status.behind}
        dirty={!status.isClean}
        mode="status"
      />
    </Box>
  );
}

export default StatusPanel;
