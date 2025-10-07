'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getAllEvaluations } from '@/lib/user-actions';
import { type Evaluation, type Team, type Project } from '@/lib/db-types';
import { Loader2, Trophy, Award, Users, GitMerge } from 'lucide-react';
import { Separator } from './ui/separator';

type EvaluationResultsProps = {
  teams: Team[];
  projects: Project[];
};

type TeamResult = {
  teamId: string;
  teamName: string;
  projectName: string;
  totalScore: number;
  evaluationId: string;
};

export default function EvaluationResults({ teams, projects }: EvaluationResultsProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
        const allEvals = await getAllEvaluations();
        setEvaluations(allEvals);
      } catch (error) {
        console.error("Failed to fetch evaluations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvaluations();
  }, []);

  const teamsMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams]);
  const projectsMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

  const teamResults = useMemo(() => {
    return evaluations.map(ev => {
      const totalScore = ev.scores.reduce((sum, s) => sum + s.score, 0);
      return {
        teamId: ev.teamId,
        teamName: teamsMap.get(ev.teamId) || 'Unknown Team',
        projectName: projectsMap.get(ev.projectId) || 'Unknown Project',
        totalScore,
        evaluationId: ev.id,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }, [evaluations, teamsMap, projectsMap]);

  const { topThree, ties } = useMemo(() => {
    const sorted = [...teamResults];
    const topThree = sorted.slice(0, 3);
    
    const scoreCounts: { [score: number]: TeamResult[] } = {};
    teamResults.forEach(result => {
        if (!scoreCounts[result.totalScore]) {
            scoreCounts[result.totalScore] = [];
        }
        scoreCounts[result.totalScore].push(result);
    });

    const ties = Object.values(scoreCounts).filter(group => group.length > 1);

    return { topThree, ties };
  }, [teamResults]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Results...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const getPlaceColor = (place: number) => {
    if (place === 1) return 'text-amber-400';
    if (place === 2) return 'text-slate-400';
    if (place === 3) return 'text-amber-600';
    return 'text-foreground';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Evaluation Results</CardTitle>
              <CardDescription>View the final scores and standings.</CardDescription>
            </div>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Award className="mr-2 h-4 w-4" /> View Leaderboard
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Top 3 Teams</DialogTitle>
                <DialogDescription>The highest scores from the evaluations.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {topThree.length === 0 && <p className="text-center text-muted-foreground">No evaluations to rank yet.</p>}
                {topThree.map((team, index) => (
                  <div key={team.teamId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <Award className={`h-8 w-8 ${getPlaceColor(index + 1)}`} />
                    <div className="flex-1">
                      <p className="font-bold text-lg">{team.teamName}</p>
                      <p className="text-sm text-muted-foreground">Project: {team.projectName}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-bold">{team.totalScore}</p>
                       <p className="text-xs text-muted-foreground">Points</p>
                    </div>
                  </div>
                ))}
              </div>
              {ties.length > 0 && (
                <>
                  <Separator />
                  <div className="py-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><GitMerge />Tied Scores</h3>
                    <div className="space-y-3">
                      {ties.map((tieGroup, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <p className="font-bold mb-2">Tied with {tieGroup[0].totalScore} points:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {tieGroup.map(team => <li key={team.teamId}>{team.teamName}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <DialogFooter>
                  <p className="text-xs text-muted-foreground">Results based on {evaluations.length} completed evaluations.</p>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamResults.map((result) => (
            <Card key={result.evaluationId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {result.teamName}
                </CardTitle>
                <CardDescription>Project: {result.projectName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Score</p>
                    <p className="text-4xl font-bold">{result.totalScore}</p>
                </div>
              </CardContent>
            </Card>
          ))}
         </div>
         {teamResults.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
                <p>No evaluations have been completed yet.</p>
            </div>
         )}
      </CardContent>
    </Card>
  );
}
