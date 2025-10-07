'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import { type Team, type Project, type Rubric, type UserProfile, type Evaluation } from '@/lib/db-types';
import { saveEvaluation, getEvaluation } from '@/lib/user-actions';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Edit, FileText, Loader2, Save, Users, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FormData = {
  scores: { [criterionId: string]: number };
  comments: string;
};

export default function EvaluationPage() {
  const { teamId } = useParams();
  const router = useRouter();
  const { user, role } = useSettings();
  const { toast } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluationSchema = useMemo(() => {
    if (!rubric) return null;
    const schemaObject: { [key: string]: z.ZodType<any> } = {
      comments: z.string().optional(),
    };
    const criteriaScores: { [key: string]: z.ZodNumber } = {};
    rubric.criteria.forEach(criterion => {
      criteriaScores[criterion.id] = z.number({
        required_error: `Score for "${criterion.name}" is required.`,
      }).min(0).max(5);
    });
    schemaObject['scores'] = z.object(criteriaScores);
    return z.object(schemaObject);
  }, [rubric]);


  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    resolver: evaluationSchema ? zodResolver(evaluationSchema) : undefined,
    defaultValues: { scores: {}, comments: '' },
  });

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
          setError('This team does not have a project and/or a rubric assigned for evaluation.');
          setIsLoading(false);
          return;
        }

        const projectDoc = await getDoc(doc(db, 'projects', teamData.projectId));
        const rubricDoc = await getDoc(doc(db, 'rubrics', teamData.rubricId));

        if (!projectDoc.exists() || !rubricDoc.exists()) {
          setError('Assigned project or rubric not found.');
          setIsLoading(false);
          return;
        }

        const projectData = { id: projectDoc.id, ...projectDoc.data() } as Project;
        const rubricData = { id: rubricDoc.id, ...rubricDoc.data() } as Rubric;
        setProject(projectData);
        setRubric(rubricData);

        const existingEvaluation = await getEvaluation(teamData.id, projectData.id);
        setEvaluation(existingEvaluation);

        // Set form default values from existing evaluation or rubric
        const defaultScores: { [key: string]: number } = {};
        if (existingEvaluation) {
            existingEvaluation.scores.forEach(s => {
                defaultScores[s.criterionId] = s.score;
            });
            reset({ scores: defaultScores, comments: existingEvaluation.comments || '' });
        } else {
            rubricData.criteria.forEach(c => {
                // You may want to set a default score, e.g., -1 to indicate not scored
            });
            reset({ scores: {}, comments: '' });
        }

      } catch (e) {
        console.error(e);
        setError('Failed to load evaluation data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId, reset]);

  const onSubmit = async (data: any) => {
    if (!team || !project || !rubric || !user || !evaluationSchema) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to save evaluation.' });
      return;
    }
    
    const scores = rubric.criteria.map(c => ({
        criterionId: c.id,
        score: data.scores[c.id]
    }));

    setIsSubmitting(true);
    try {
      const evaluationData = {
        id: evaluation?.id,
        teamId: team.id,
        projectId: project.id,
        rubricId: rubric.id,
        evaluatorUid: user.uid,
        scores: scores,
        comments: data.comments,
      };

      const savedId = await saveEvaluation(evaluationData);
      
      if (!evaluation) {
          const newEvaluation = await getEvaluation(team.id, project.id);
          setEvaluation(newEvaluation);
      } else {
          setEvaluation(prev => prev ? {
              ...prev,
              ...evaluationData,
              id: savedId,
          } : null);
      }


      toast({ title: 'Evaluation Saved', description: 'Your evaluation has been successfully saved.' });
       reset(data); 
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save evaluation.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="container mx-auto p-4">
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
        <div className="container mx-auto p-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Missing Data</AlertTitle>
                <AlertDescription>Could not load all necessary information for evaluation.</AlertDescription>
            </Alert>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
    );
  }
  
  const totalScore = rubric.criteria.reduce((acc, crit) => acc + (control._formValues.scores[crit.id] ?? 0), 0);
  const maxScore = rubric.criteria.length * 5;
  const averageScore = totalScore / rubric.criteria.length || 0;


  return (
    <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-2xl">Project Evaluation</CardTitle>
                <CardDescription>Evaluate the team based on the assigned rubric.</CardDescription>
            </div>
            <div className="text-right">
                <Badge variant="secondary" className="text-lg">
                    Score: {totalScore.toFixed(0)} / {maxScore}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                    Average: {averageScore.toFixed(2)}
                </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" />Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-xl">{team.name}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" />Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-xl">{project.name}</p>
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              </CardContent>
            </Card>
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Evaluation Instructions</AlertTitle>
                <AlertDescription>
                    For each criterion, select a score from 0 to 5. Your progress is saved automatically when you click "Save Evaluation".
                </AlertDescription>
            </Alert>
          </div>
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Rubric: {rubric.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {rubric.criteria.map((criterion, index) => (
                    <div key={criterion.id}>
                      <Separator className={index > 0 ? "mb-6" : "hidden"} />
                      <Card className="border-none shadow-none p-0">
                        <CardHeader className="p-0">
                           <CardTitle className="text-lg">{criterion.name}</CardTitle>
                           {errors.scores?.[criterion.id] && <p className="text-sm text-destructive">{(errors.scores as any)[criterion.id].message}</p>}
                        </CardHeader>
                        <CardContent className="p-0 pt-4">
                          <Controller
                            name={`scores.${criterion.id}`}
                            control={control}
                            render={({ field }) => (
                              <RadioGroup
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value !== undefined ? String(field.value) : ''}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                              >
                                {criterion.descriptions.map((desc, score) => (
                                  <div key={score} className="flex-1">
                                    <RadioGroupItem value={String(score)} id={`${criterion.id}-${score}`} className="peer sr-only" />
                                    <Label
                                      htmlFor={`${criterion.id}-${score}`}
                                      className="flex flex-col rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                    >
                                      <Badge variant="outline" className="w-fit mb-2">Score: {score}</Badge>
                                      <span className="text-sm text-muted-foreground">{desc}</span>
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comments</CardTitle>
                  <CardDescription>Provide overall feedback or justification for the scores.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="comments"
                    control={control}
                    render={({ field }) => (
                      <Textarea {...field} rows={5} placeholder="Your comments..." />
                    )}
                  />
                </CardContent>
              </Card>
                
              <CardFooter className="px-0">
                <Button type="submit" disabled={isSubmitting || !isDirty} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Save Evaluation
                    </>
                  )}
                </Button>
                {!isDirty && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 ml-4">
                        <Check className="h-4 w-4 text-green-500" />
                        All changes saved
                    </p>
                )}
              </CardFooter>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
