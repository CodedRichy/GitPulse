'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import type { TeamMemberWithUser, TeamMemberRole, Team } from '@/lib/team-types';
import { hasPermission } from '@/lib/team-types';

interface TeamMembersData {
  team: Team;
  members: TeamMemberWithUser[];
  currentMember: TeamMemberWithUser;
}

const ROLES: { id: TeamMemberRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full team control' },
  { id: 'lead', label: 'Lead', description: 'Can invite and manage' },
  { id: 'developer', label: 'Developer', description: 'Standard access' },
  { id: 'viewer', label: 'Viewer', description: 'View only' },
];

export default function TeamMembersPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberRole>('developer');
  const [isInviting, setIsInviting] = useState(false);

  const { data, error, mutate } = useSWR<TeamMembersData>(
    `/api/teams/${teamId}`,
    (url) => fetch(url, { credentials: 'include' }).then(r => r.json()),
    { refreshInterval: 30000 }
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      if (response.ok) {
        setInviteEmail('');
        mutate();
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from the team?')) return;

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: TeamMemberRole) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 font-mono text-emerald-500 animate-pulse">
        <span className="tracking-[0.3em] uppercase">Loading_Members</span>
      </div>
    );
  }

  const { team, members, currentMember } = data;
  const canInvite = hasPermission(currentMember.role, 'inviteMembers');
  const canRemove = hasPermission(currentMember.role, 'removeMembers');
  const canUpdateRoles = hasPermission(currentMember.role, 'updateRoles');

  return (
    <div className="space-y-8">
      {/* INVITE SECTION */}
      {canInvite && (
        <div className="glass-panel p-8 rounded-3xl">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-stone-500 mb-6">Invite_Member</h3>
          <form onSubmit={handleInvite} className="flex gap-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@company.com"
              className="flex-1 px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm focus:border-emerald-500 focus:outline-none transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamMemberRole)}
              className="px-4 py-3 bg-stone-900 border border-stone-800 rounded-xl text-sm focus:border-emerald-500 focus:outline-none"
            >
              {ROLES.filter(r => r.id !== 'admin' || currentMember.role === 'admin').map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isInviting || !inviteEmail}
              className="px-6 py-3 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-emerald-400 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInviting ? 'Sending...' : 'Invite'}
            </button>
          </form>
          <p className="text-stone-500 text-xs mt-4">
            {team.seats_used} / {team.seats} seats used
          </p>
        </div>
      )}

      {/* MEMBERS LIST */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-stone-800/50 flex items-center justify-between">
          <h3 className="text-[12px] font-bold uppercase tracking-[0.3em] text-stone-500">Team_Members</h3>
          <span className="text-emerald-400 font-mono text-sm">{members.length} members</span>
        </div>

        <div className="divide-y divide-stone-900">
          {members.map((member) => (
            <div key={member.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                {member.user.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={member.user.name || ''}
                    className="w-12 h-12 rounded-xl object-cover border border-stone-800"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center">
                    <span className="text-lg font-bold text-stone-400">
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold">{member.user.name || member.user.email}</p>
                  <p className="text-[10px] text-stone-500 font-mono">{member.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {canUpdateRoles && member.id !== currentMember.id ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value as TeamMemberRole)}
                    className="px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {ROLES.map((role) => (
                      <option key={role.id} value={role.id}>{role.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    member.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    member.role === 'lead' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    'bg-stone-800 text-stone-400 border-stone-700'
                  }`}>
                    {member.role}
                  </span>
                )}

                {canRemove && member.id !== currentMember.id && (
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROLE LEGEND */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROLES.map((role) => (
          <div key={role.id} className="p-4 bg-stone-900/50 rounded-xl border border-stone-800">
            <p className="font-bold text-sm mb-1">{role.label}</p>
            <p className="text-[10px] text-stone-500">{role.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
