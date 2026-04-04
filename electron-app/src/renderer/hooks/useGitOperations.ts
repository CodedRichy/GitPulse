import { useState, useCallback } from 'react';

interface GitFile {
  status: string;
  file: string;
}

interface GitStatus {
  success: boolean;
  files: GitFile[];
  error?: string;
}

interface GitDiff {
  success: boolean;
  diff: string;
  error?: string;
}

interface CommitMessage {
  success: boolean;
  message: string;
  risk?: 'low' | 'medium' | 'high';
  confidence?: number;
  error?: string;
}

export function useGitOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGitStatus = useCallback(async (repoPath: string): Promise<GitStatus> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!window.electronAPI?.getGitStatus) {
        throw new Error('Git status API not available');
      }
      
      const result = await window.electronAPI.getGitStatus(repoPath);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        files: result.files || [],
      };
    } catch (err: any) {
      const message = err.message || 'Failed to get git status';
      setError(message);
      return {
        success: false,
        files: [],
        error: message,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getGitDiff = useCallback(async (repoPath: string): Promise<GitDiff> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!window.electronAPI?.getGitDiff) {
        throw new Error('Git diff API not available');
      }
      
      const result = await window.electronAPI.getGitDiff(repoPath);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        diff: result.diff || '',
      };
    } catch (err: any) {
      const message = err.message || 'Failed to get git diff';
      setError(message);
      return {
        success: false,
        diff: '',
        error: message,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const generateCommitMessage = useCallback(async (repoPath: string, diff: string): Promise<CommitMessage> => {
    setLoading(true);
    setError(null);
    
    try {
      if (!window.electronAPI?.generateCommitMessage) {
        throw new Error('Commit generation API not available');
      }
      
      const result = await window.electronAPI.generateCommitMessage({ repoPath, diff });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      return {
        success: true,
        message: result.message || 'feat: update files',
        risk: result.risk as 'low' | 'medium' | 'high' || 'low',
        confidence: result.confidence || 75,
      };
    } catch (err: any) {
      const message = err.message || 'Failed to generate commit message';
      setError(message);
      return {
        success: false,
        message: 'feat: update files',
        error: message,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    getGitStatus,
    getGitDiff,
    generateCommitMessage,
    clearError,
  };
}
