'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getAllEvaluations } from '@/lib/user-actions';
import { type Evaluation, type Team, type Project, type UserProfile, type Rubric } from '@/lib/db-types';
import { Loader2, Trophy, Award, Users, GitMerge, Info, User, Star, Eye } from 'lucide-react';
import { Separator } from './ui/separator';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

type EvaluationResultsProps = {
  teams: Team[];
  projects: Project[];
  users: UserProfile[];
};

type DetailedEvaluation = Evaluation & { 
  totalScore: number;
  evaluator?: UserProfile;
};

type TeamResult = {
  teamId: string;
  teamName: string;
  projectName: string;
  averageScore: number;
  evaluationCount: number;
  evaluations: DetailedEvaluation[];
};

export default function EvaluationResults({ teams, projects, users }: EvaluationResultsProps) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [rubrics, setRubrics] = useState<Map<string, Rubric>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamResult, setSelectedTeamResult] = useState<TeamResult | null>(null);

  useEffect(() => {
    let unsubEvals: (() => void) | undefined;
    let unsubRubrics: (() => void) | undefined;
    
    const fetchEvaluations = async () => {
      setIsLoading(true);
      try {
        if (db) {
          unsubEvals = onSnapshot(collection(db, 'evaluations'), (snapshot) => {
            const allEvals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
            setEvaluations(allEvals);
          });
          unsubRubrics = onSnapshot(collection(db, 'rubrics'), (snapshot) => {
            const rubricsMap = new Map<string, Rubric>();
            snapshot.forEach(doc => rubricsMap.set(doc.id, { id: doc.id, ...doc.data() } as Rubric));
            setRubrics(rubricsMap);
          });
        }
      } catch (error) {
        console.error("Failed to fetch evaluations:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvaluations();

    return () => {
      unsubEvals?.();
      unsubRubrics?.();
    };
  }, []);

  const teamsMap = useMemo(() => new Map(teams.map(t => [t.id, t.name])), [teams]);
  const projectsMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
  const usersMap = useMemo(() => new Map(users.map(u => [u.uid, u])), [users]);

  const teamResults = useMemo(() => {
    const resultsByTeam: { [teamId: string]: TeamResult } = {};
    
    evaluations.forEach(ev => {
      if (!resultsByTeam[ev.teamId]) {
        resultsByTeam[ev.teamId] = {
          teamId: ev.teamId,
          teamName: teamsMap.get(ev.teamId) || 'Unknown Team',
          projectName: projectsMap.get(ev.projectId) || 'Unknown Project',
          averageScore: 0,
          evaluationCount: 0,
          evaluations: [],
        };
      }
      
      const totalScore = ev.scores.reduce((sum, s) => sum + s.score, 0);
      const detailedEval: DetailedEvaluation = { 
        ...ev, 
        totalScore,
        evaluator: usersMap.get(ev.evaluatorUid)
      };

      resultsByTeam[ev.teamId].evaluations.push(detailedEval);
    });

    return Object.values(resultsByTeam).map(teamResult => {
      const totalSum = teamResult.evaluations.reduce((sum, ev) => sum + ev.totalScore, 0);
      return {
        ...teamResult,
        averageScore: teamResult.evaluations.length > 0 ? totalSum / teamResult.evaluations.length : 0,
        evaluationCount: teamResult.evaluations.length,
      };
    }).sort((a, b) => b.averageScore - a.averageScore);
  }, [evaluations, teamsMap, projectsMap, usersMap]);

  const { topThree, ties } = useMemo(() => {
    const sorted = [...teamResults];
    const topThree = sorted.slice(0, 3);
    
    const scoreCounts: { [score: number]: TeamResult[] } = {};
    teamResults.forEach(result => {
        const score = Math.round(result.averageScore * 100); // Use rounded score to avoid float inaccuracies
        if (!scoreCounts[score]) scoreCounts[score] = [];
        scoreCounts[score].push(result);
    });

    const ties = Object.values(scoreCounts).filter(group => group.length > 1);

    return { topThree, ties };
  }, [teamResults]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Loading Results...</CardTitle></CardHeader>
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
    <>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamResults.map((result) => (
              <Card 
                key={result.teamId} 
                className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                onClick={() => setSelectedTeamResult(result)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {result.teamName}
                  </CardTitle>
                  <CardDescription>Project: {result.projectName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center bg-muted p-4 rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Score ({result.evaluationCount} eval{result.evaluationCount !== 1 ? 's' : ''})</p>
                      <p className="text-4xl font-bold">{result.averageScore.toFixed(2)}</p>
                  </div>
                </CardContent>
                <CardFooter className="pt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Eye className="h-3 w-3" /> Click to view details
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
          {teamResults.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                  <p>No evaluations have been completed yet.</p>
              </div>
          )}
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-4 items-start pt-6">
           <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Award className="mr-2 h-4 w-4" /> View Leaderboard
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Top 3 Teams</DialogTitle>
                  <DialogDescription>The highest average scores from all evaluations.</DialogDescription>
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
                        <p className="text-2xl font-bold">{team.averageScore.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Avg Points</p>
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
                            <p className="font-bold mb-2">Tied with an average of {tieGroup[0].averageScore.toFixed(2)} points:</p>
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
                    <p className="text-xs text-muted-foreground">Results based on {evaluations.length} completed evaluations across all teams.</p>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Alert className="w-full sm:flex-1">
              <Info className="h-4 w-4" />
              <AlertTitle>Note</AlertTitle>
              <AlertDescription>
                Scores are averaged across all evaluations submitted by Managers and Teachers.
              </AlertDescription>
            </Alert>
        </CardFooter>
      </Card>

      <Dialog open={!!selectedTeamResult} onOpenChange={() => setSelectedTeamResult(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evaluation Details for "{selectedTeamResult?.teamName}"</DialogTitle>
            <DialogDescription>
                Project: {selectedTeamResult?.projectName} | Average Score: {selectedTeamResult?.averageScore.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <div className="space-y-6 py-4">
                {selectedTeamResult?.evaluations.map(ev => {
                  const rubric = rubrics.get(ev.rubricId);
                  return (
                    <Card key={ev.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={ev.evaluator?.photoURL || undefined} />
                            <AvatarFallback>{ev.evaluator?.displayName?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{ev.evaluator?.displayName || 'Unknown Evaluator'}</p>
                            <p className="text-xs text-muted-foreground">{ev.evaluator?.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total Score</p>
                            <p className="text-2xl font-bold text-primary">{ev.totalScore}</p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {ev.scores.map(scoreItem => {
                            const criterion = rubric?.criteria.find(c => c.id === scoreItem.criterionId);
                            return (
                              <div key={scoreItem.criterionId} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/30">
                                <span className="flex-1 pr-4">{criterion?.name || 'Unknown Criterion'}</span>
                                <Badge className="flex items-center gap-1.5" variant="secondary">
                                  <Star className="h-3 w-3 text-amber-400" />
                                  {scoreItem.score}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
