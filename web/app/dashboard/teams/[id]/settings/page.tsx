'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import type { Team, TeamSettings, QualityGatePolicy, TeamMemberRole } from '@/lib/team-types';
import { hasPermission } from '@/lib/team-types';

interface SettingsApiResponse {
  settings: TeamSettings;
}

interface TeamApiResponse extends Team {
  myRole: TeamMemberRole;
  team_members: Array<{ id: string; user_id: string; role: string; status: string }>;
}

const QUALITY_GATES = [
  { id: 'security-scan', name: 'Security Scan', description: 'Detect secrets and vulnerabilities' },
  { id: 'code-smells', name: 'Code Smells', description: 'Identify anti-patterns and tech debt' },
  { id: 'test-coverage', name: 'Test Coverage', description: 'Ensure adequate test coverage' },
  { id: 'documentation', name: 'Documentation', description: 'Check for required docs' },
];

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: teamData } = useSWR<TeamApiResponse>(
    `/api/teams/${teamId}`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 30000 }
  );

  const { data: settingsData, mutate } = useSWR<SettingsApiResponse>(
    `/api/teams/${teamId}/settings`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 30000 }
  );

  const team = teamData;
  const myRole = teamData?.myRole || 'viewer';
  const settings = settingsData?.settings;

  const [formData, setFormData] = useState<Partial<TeamSettings> & { name?: string; description?: string }>({});

  // Initialize form when data loads
  if (teamData && settingsData && !formData.name) {
    setFormData({
      name: teamData.name,
      description: teamData.description || '',
      quality_gate_policies: settingsData.settings.quality_gate_policies,
      enforce_policies: settingsData.settings.enforce_policies,
      allow_override: settingsData.settings.allow_override,
      require_justification: settingsData.settings.require_justification,
    });
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update team details
      if (formData.name !== teamData?.name || formData.description !== teamData?.description) {
        await fetch(`/api/teams/${teamId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
          }),
        });
      }

      // Update settings
      const settingsResponse = await fetch(`/api/teams/${teamId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quality_gate_policies: formData.quality_gate_policies,
          enforce_policies: formData.enforce_policies,
          allow_override: formData.allow_override,
          require_justification: formData.require_justification,
        }),
      });

      if (settingsResponse.ok) {
        mutate();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this team? This cannot be undone.')) return;
    if (!confirm('Type "DELETE" to confirm')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/dashboard/teams');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const updateGatePolicy = (gateId: string, updates: Partial<QualityGatePolicy>) => {
    setFormData(prev => {
      const currentPolicy = prev.quality_gate_policies?.[gateId] || { enabled: false, severity: 'medium', block_on_failure: false };
      return {
        ...prev,
        quality_gate_policies: {
          ...prev.quality_gate_policies,
          [gateId]: { ...currentPolicy, ...updates },
        },
      };
    });
  };

  if (!teamData || !settingsData) {
    return (
      <div className="flex items-center justify-center py-20 font-mono text-emerald-500 animate-pulse">
        <span className="tracking-[0.3em] uppercase">Loading_Settings</span>
      </div>
    );
  }

  const canEdit = hasPermission(myRole, 'editSettings');
  const canDelete = hasPermission(myRole, 'deleteTeam');

  return (
    <div className="space-y-8">
      {/* TEAM DETAILS */}
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-6">Team_Details</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-2">Team Name</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={!canEdit}
              className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-stone-500 mb-2">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
              rows={3}
              className="w-full px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-colors resize-none disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* QUALITY GATES */}
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-6">Quality_Gate_Policies</h3>
        <div className="space-y-4">
          {QUALITY_GATES.map((gate) => {
            const policy = formData.quality_gate_policies?.[gate.id];
            return (
              <div key={gate.id} className="p-6 bg-stone-900/50 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold">{gate.name}</p>
                    <p className="text-[10px] text-stone-500">{gate.description}</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-[10px] uppercase tracking-wider text-stone-500">Enabled</span>
                    <input
                      type="checkbox"
                      checked={policy?.enabled || false}
                      onChange={(e) => updateGatePolicy(gate.id, { enabled: e.target.checked })}
                      disabled={!canEdit}
                      className="w-5 h-5 accent-emerald-500 disabled:opacity-50"
                    />
                  </label>
                </div>
                {policy?.enabled && (
                  <div className="flex gap-4">
                    <select
                      value={policy?.severity || 'medium'}
                      onChange={(e) => updateGatePolicy(gate.id, { severity: e.target.value as any })}
                      disabled={!canEdit}
                      className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={policy?.block_on_failure || false}
                        onChange={(e) => updateGatePolicy(gate.id, { block_on_failure: e.target.checked })}
                        disabled={!canEdit}
                        className="accent-emerald-500 disabled:opacity-50"
                      />
                      <span className="text-xs text-stone-400">Block on failure</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* POLICY SETTINGS */}
      <div className="glass-panel p-8 rounded-3xl">
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-6">Policy_Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enforce_policies || false}
              onChange={(e) => setFormData(prev => ({ ...prev, enforce_policies: e.target.checked }))}
              disabled={!canEdit}
              className="w-5 h-5 accent-emerald-500 disabled:opacity-50"
            />
            <div>
              <p className="font-bold text-sm">Enforce Policies</p>
              <p className="text-[10px] text-stone-500">Require all quality gates to pass</p>
            </div>
          </label>
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allow_override || false}
              onChange={(e) => setFormData(prev => ({ ...prev, allow_override: e.target.checked }))}
              disabled={!canEdit}
              className="w-5 h-5 accent-emerald-500 disabled:opacity-50"
            />
            <div>
              <p className="font-bold text-sm">Allow Override</p>
              <p className="text-[10px] text-stone-500">Team leads can bypass quality gates</p>
            </div>
          </label>
          <label className="flex items-center gap-4 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.require_justification || false}
              onChange={(e) => setFormData(prev => ({ ...prev, require_justification: e.target.checked }))}
              disabled={!canEdit}
              className="w-5 h-5 accent-emerald-500 disabled:opacity-50"
            />
            <div>
              <p className="font-bold text-sm">Require Justification</p>
              <p className="text-[10px] text-stone-500">Require reason for overrides</p>
            </div>
          </label>
        </div>
      </div>

      {/* SAVE BUTTON */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* DANGER ZONE */}
      {canDelete && (
        <div className="glass-panel p-8 rounded-3xl border-red-500/20 bg-red-500/[0.03]">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-red-400 mb-6">Danger_Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-red-400">Delete Team</p>
              <p className="text-[10px] text-stone-500">Permanently delete this team and all associated data</p>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete Team'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
