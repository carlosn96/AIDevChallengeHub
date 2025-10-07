'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import { type Team, type Project, type Rubric, type Evaluation } from '@/lib/db-types';
import { saveEvaluation, getEvaluation } from '@/lib/user-actions';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Loader2, Save, Users, AlertTriangle, ChevronLeft, ChevronRight, Award, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type CriterionScoreState = {
  [criterionId: string]: number | null;
};

export default function EvaluationPage() {
  const { teamId } = useParams();
  const router = useRouter();
  const { user } = useSettings();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  
  const [scores, setScores] = useState<CriterionScoreState>({});
  const [initialScores, setInitialScores] = useState<CriterionScoreState>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!teamId || !db) {
        setError('Invalid team ID.');
        setIsLoading(false);
        return;
      }

      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId as string));
        if (!teamDoc.exists()) {
          setError('Team not found.');
          setIsLoading(false);
          return;
        }
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
        setTeam(teamData);

        if (!teamData.projectId || !teamData.rubricId) {
          setError('This team does not have a project and/or rubric assigned.');
          setIsLoading(false);
          return;
        }

        const [projectDoc, rubricDoc] = await Promise.all([
          getDoc(doc(db, 'projects', teamData.projectId)),
          getDoc(doc(db, 'rubrics', teamData.rubricId))
        ]);

        if (!projectDoc.exists() || !rubricDoc.exists()) {
          setError('Project or rubric not found.');
          setIsLoading(false);
          return;
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
        const rubricData = { id: rubricDoc.id, ...rubricDoc.data() } as Rubric;
        
        setProject(projectData);
        setRubric(rubricData);

        const existingEvaluation = await getEvaluation(teamData.id, projectData.id);
        setEvaluation(existingEvaluation);

        const loadedScores: CriterionScoreState = {};
        if (existingEvaluation) {
          rubricData.criteria.forEach(c => {
            const foundScore = existingEvaluation.scores.find(s => s.criterionId === c.id);
            loadedScores[c.id] = foundScore ? foundScore.score : null;
          });
        } else {
            rubricData.criteria.forEach(c => {
                loadedScores[c.id] = null;
            });
        }
        
        setScores(loadedScores);
        setInitialScores(loadedScores);

      } catch (e) {
        console.error(e);
        setError('Error loading evaluation data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const handleScoreSelect = (criterionId: string, scoreValue: number) => {
    setScores(prevScores => {
      const newScores = { ...prevScores };
      newScores[criterionId] = scoreValue;
      return newScores;
    });
  };

  const validateForm = (): boolean => {
    if (!rubric) return false;
    
    for (const criterion of rubric.criteria) {
      if (scores[criterion.id] === null || scores[criterion.id] === undefined) {
        toast({ 
          variant: 'destructive', 
          title: 'Incomplete Evaluation', 
          description: `Please rate: ${criterion.name}` 
        });
        return false;
      }
    }
    return true;
  };

  const hasChanges = (): boolean => {
    if (!rubric) return false;
    return JSON.stringify(scores) !== JSON.stringify(initialScores);
  };

  const handleSubmit = async () => {
    if (!team || !project || !rubric || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Required data is missing.' });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const evaluationScores = rubric.criteria.map(c => ({
        criterionId: c.id,
        score: scores[c.id] ?? 0
      }));

      const evaluationData = {
        id: evaluation?.id,
        teamId: team.id,
        projectId: project.id,
        rubricId: rubric.id,
        evaluatorUid: user.uid,
        scores: evaluationScores,
        comments: '',
      };

      await saveEvaluation(evaluationData);
      
      if (!evaluation) {
        const newEvaluation = await getEvaluation(team.id, project.id);
        setEvaluation(newEvaluation);
      }

      setInitialScores({ ...scores });

      toast({ title: 'Evaluation Saved', description: 'Your evaluation has been saved successfully.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save the evaluation.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-2xl mt-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (!team || !project || !rubric) {
    return (
      <div className="container mx-auto p-4 max-w-2xl mt-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Missing Data</AlertTitle>
          <AlertDescription>Could not load the required information.</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }
  
  const totalScore = Object.values(scores).reduce((acc, score) => acc + (score ?? 0), 0);
  const maxScore = rubric.criteria.length * 5;
  const averageScore = rubric.criteria.length > 0 ? totalScore / rubric.criteria.length : 0;
  
  const evaluatedCount = Object.values(scores).filter(score => score !== null).length;
  const progressPercentage = (evaluatedCount / rubric.criteria.length) * 100;
  const isDirty = hasChanges();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="container mx-auto max-w-4xl px-4 space-y-8">
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              {team.name}
            </Badge>
            <span className="text-sm text-muted-foreground">evaluating</span>
            <Badge variant="secondary" className="px-3 py-1 font-semibold">
              {project.name}
            </Badge>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Award className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-sm opacity-90 mb-1">Total Score</div>
                <div className="text-5xl font-bold">{totalScore}</div>
                <div className="text-xl opacity-75">of {maxScore}</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3">Average</div>
                <div className="text-6xl font-bold">{averageScore.toFixed(1)}</div>
                <div className="text-sm opacity-75 mt-2">out of 5.0</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3">Progress</div>
                <div className="text-5xl font-bold">{evaluatedCount}</div>
                <div className="text-xl opacity-75">of {rubric.criteria.length} criteria</div>
                <Progress value={progressPercentage} className="h-2 mt-3 bg-white/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-xl border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">All Criteria</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                {rubric.criteria.map((criterion, index) => (
                  <Card key={criterion.id} className="overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-semibold">CRITERION {index + 1}</p>
                        <CardTitle className="text-lg mt-1">{criterion.name}</CardTitle>
                      </div>
                      {scores[criterion.id] !== null && scores[criterion.id] !== undefined && (
                        <Badge className="text-xl px-4 py-2 shrink-0 bg-blue-600">
                          Score: {scores[criterion.id]}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {[0, 1, 2, 3, 4, 5].map((scoreValue) => {
                              const isSelected = scores[criterion.id] === scoreValue;
                              return (
                                <button
                                  key={`${criterion.id}-${scoreValue}`}
                                  type="button"
                                  onClick={() => handleScoreSelect(criterion.id, scoreValue)}
                                  className={`p-4 rounded-lg border-2 text-left transition-all duration-200 group hover:shadow-md
                                    ${isSelected 
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg ring-2 ring-blue-500 ring-offset-2' 
                                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }
                                  `}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-xl font-bold
                                      ${isSelected 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'
                                      }
                                    `}>
                                      {scoreValue}
                                    </div>
                                    <div className="flex-1">
                                      <p className={`text-sm leading-snug ${isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {criterion.descriptions[scoreValue]}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              );
                          })}
                        </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-2 border-blue-200 dark:border-blue-900">
            <CardContent className="p-6">
              <Button 
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !isDirty} 
                className="w-full h-14 text-base font-bold shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" /> Save Evaluation
                  </>
                )}
              </Button>
              {!isDirty && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-2 mt-3">
                  <Check className="h-4 w-4" />
                  All changes saved
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
