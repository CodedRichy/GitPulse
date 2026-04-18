'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Shield, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';
import { Loading } from '@/components/ui/loading';

interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  role: 'admin' | 'lead' | 'developer';
  member_count: number;
  created_at: string;
}

function TeamsListContent() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (!response.ok) throw new Error('Failed to fetch teams');
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      toast.error('Failed to load teams');
      console.error('Error fetching teams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-red-500"><Shield className="w-3 h-3 mr-1" /> Admin</Badge>;
      case 'lead':
        return <Badge variant="default" className="bg-blue-500"><Shield className="w-3 h-3 mr-1" /> Lead</Badge>;
      default:
        return <Badge variant="secondary"><Users className="w-3 h-3 mr-1" /> Developer</Badge>;
    }
  };

  if (isLoading) {
    return <Loading message="Loading teams..." />;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-1">
            Manage your teams and collaborate with your organization
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/teams/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Create a team to start collaborating with your organization and share quality insights
            </p>
            <Button onClick={() => router.push('/dashboard/teams/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card 
              key={team.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/teams/${team.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {team.avatar_url ? (
                      <img 
                        src={team.avatar_url} 
                        alt={team.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{team.name}</CardTitle>
                      <CardDescription className="text-xs">@{team.slug}</CardDescription>
                    </div>
                  </div>
                  {getRoleBadge(team.role)}
                </div>
              </CardHeader>
              <CardContent>
                {team.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {team.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{team.member_count} members</span>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    View <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamsPage() {
  return (
    <ErrorBoundary>
      <TeamsListContent />
    </ErrorBoundary>
  );
}
