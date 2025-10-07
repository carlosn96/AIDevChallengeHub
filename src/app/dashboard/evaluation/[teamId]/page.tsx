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


  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
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

        const defaultScores: { [key: string]: number } = {};
        if (existingEvaluation) {
            existingEvaluation.scores.forEach(s => {
                defaultScores[s.criterionId] = s.score;
            });
            reset({ scores: defaultScores, comments: existingEvaluation.comments || '' });
        } else {
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

  const onSubmit = async (data: FormData) => {
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
      const evaluationData: Partial<Evaluation> & Pick<Evaluation, 'teamId' | 'projectId' | 'rubricId' | 'evaluatorUid' | 'scores' | 'comments'> = {
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
          } as Evaluation : null);
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
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const evaluatedCount = Object.values(control._formValues.scores || {}).filter(s => s !== undefined).length;
  const pendingCount = rubric.criteria.length - evaluatedCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto max-w-7xl p-4 space-y-4">
        {/* Header compacto con información clave */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 border-2">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Evaluación de Proyecto</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {team.name}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {project.name}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Score prominente */}
          <div className="text-right">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-primary">{totalScore.toFixed(0)}</span>
              <span className="text-2xl text-muted-foreground">/ {maxScore}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-32 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{percentage.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Columna izquierda: Criterios */}
          <div className="space-y-4">
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/20 dark:to-primary/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-8 w-1 bg-primary rounded-full"></div>
                  {rubric.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
                {rubric.criteria.map((criterion, index) => (
                  <div key={criterion.id} className="space-y-2">
                    {index > 0 && <Separator className="my-4" />}
                    
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base flex-1">{criterion.name}</h3>
                      <Badge variant={control._formValues.scores[criterion.id] !== undefined ? "default" : "secondary"} className="shrink-0">
                        {control._formValues.scores[criterion.id] !== undefined ? control._formValues.scores[criterion.id] : '—'} / 5
                      </Badge>
                    </div>
                    
                    {errors.scores?.[criterion.id] && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {(errors.scores as any)[criterion.id].message}
                      </p>
                    )}
                    
                    <Controller
                      name={`scores.${criterion.id}`}
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value !== undefined ? String(field.value) : ''}
                          className="grid grid-cols-6 gap-2"
                        >
                          {criterion.descriptions.map((desc, score) => {
                            const radioId = `${criterion.id}-${score}`;
                            return (
                              <div key={score}>
                                <RadioGroupItem 
                                  value={String(score)} 
                                  id={radioId} 
                                  className="peer sr-only" 
                                />
                                <Label
                                  htmlFor={radioId}
                                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-white dark:bg-slate-900 p-3 hover:bg-primary/5 hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-all group relative h-20"
                                  title={desc}
                                >
                                  <span className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform">{score}</span>
                                  <span className="text-[10px] text-center text-muted-foreground line-clamp-2 mt-1">{desc}</span>
                                </Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: Comentarios y acciones */}
          <div className="space-y-4">
            <Card className="shadow-lg border-2">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <CardTitle className="text-lg">Comentarios y Retroalimentación</CardTitle>
                <CardDescription className="text-xs">Proporciona contexto adicional para tu evaluación</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Controller
                  name="comments"
                  control={control}
                  render={({ field }) => (
                    <Textarea 
                      {...field} 
                      rows={8}
                      placeholder="Escribe tus observaciones generales, fortalezas del equipo, áreas de mejora..."
                      className="resize-none text-sm"
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Información del proyecto */}
            <Card className="shadow-lg border-2 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  Descripción del Proyecto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{project.description}</p>
              </CardContent>
            </Card>

            {/* Resumen de progreso */}
            <Card className="shadow-lg border-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Progreso de Evaluación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{evaluatedCount}</div>
                    <div className="text-xs text-muted-foreground">Evaluados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{averageScore.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Promedio</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botón de guardar destacado */}
            <Card className="shadow-lg border-2 border-primary/20">
              <CardContent className="pt-6">
                <Button 
                  type="submit"
                  disabled={isSubmitting || !isDirty} 
                  className="w-full h-12 text-base font-semibold shadow-lg"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> Guardar Evaluación
                    </>
                  )}
                </Button>
                {!isDirty && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2 mt-3">
                    <Check className="h-4 w-4" />
                    Todos los cambios guardados
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
