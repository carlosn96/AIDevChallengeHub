'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-context';
import { type Team, type Project, type Rubric, type Evaluation } from '@/lib/db-types';
import { saveEvaluation, getEvaluation } from '@/lib/user-actions';
import { LoadingScreen } from '@/components/loading-screen';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Check, Loader2, Save, Users, AlertTriangle, Award } from 'lucide-react';
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
          setError('Este equipo no tiene un proyecto y/o rúbrica asignados.');
          setIsLoading(false);
          return;
        }

        const [projectDoc, rubricDoc] = await Promise.all([
          getDoc(doc(db, 'projects', teamData.projectId)),
          getDoc(doc(db, 'rubrics', teamData.rubricId))
        ]);

        if (!projectDoc.exists() || !rubricDoc.exists()) {
          setError('Proyecto o rúbrica no encontrados.');
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
        rubricData.criteria.forEach(c => {
            loadedScores[c.id] = null;
        });

        if (existingEvaluation) {
          existingEvaluation.scores.forEach(s => {
            if (loadedScores.hasOwnProperty(s.criterionId)) {
                loadedScores[s.criterionId] = s.score;
            }
          });
        }
        
        setScores(loadedScores);
        setInitialScores(JSON.parse(JSON.stringify(loadedScores)));

      } catch (e) {
        console.error(e);
        setError('Error al cargar los datos de evaluación.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const handleScoreChange = (criterionId: string, value: string) => {
    const score = value === '' ? null : parseInt(value, 10);
    
    if (score !== null && (isNaN(score) || score < 0 || score > 5)) {
        toast({
            variant: 'destructive',
            title: 'Puntuación Inválida',
            description: 'Por favor ingrese un número entre 0 y 5.',
        });
        return;
    }

    setScores(prevScores => ({
        ...prevScores,
        [criterionId]: score,
    }));
  };

  const validateForm = (): boolean => {
    if (!rubric) return false;
    
    for (const criterion of rubric.criteria) {
      const score = scores[criterion.id];
      if (score === null || score === undefined) {
        toast({ 
          variant: 'destructive', 
          title: 'Evaluación Incompleta', 
          description: `Por favor califica: ${criterion.name}` 
        });
        return false;
      }
       if (score < 0 || score > 5) {
        toast({
            variant: 'destructive',
            title: 'Puntuación Inválida',
            description: `La puntuación para "${criterion.name}" debe estar entre 0 y 5.`,
        });
        return false;
      }
    }
    return true;
  };

  const hasChanges = (): boolean => {
    return JSON.stringify(scores) !== JSON.stringify(initialScores);
  };

  const handleSubmit = async () => {
    if (!team || !project || !rubric || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Datos requeridos faltantes.' });
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
      
      const newEvaluation = await getEvaluation(team.id, project.id);
      setEvaluation(newEvaluation);
      setInitialScores(JSON.parse(JSON.stringify(scores)));

      toast({ title: 'Evaluación Guardada', description: 'Tu evaluación se ha guardado exitosamente.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la evaluación.' });
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
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  if (!team || !project || !rubric) {
    return (
      <div className="container mx-auto p-4 max-w-2xl mt-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Datos Faltantes</AlertTitle>
          <AlertDescription>No se pudo cargar la información necesaria.</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }
  
  const totalScore = rubric.criteria.reduce((acc, crit) => acc + (scores[crit.id] ?? 0), 0);
  const maxScore = rubric.criteria.length * 5;
  const averageScore = rubric.criteria.length > 0 ? totalScore / rubric.criteria.length : 0;
  
  const evaluatedCount = Object.values(scores).filter(s => s !== null).length;
  const progressPercentage = rubric.criteria.length > 0 ? (evaluatedCount / rubric.criteria.length) * 100 : 0;
  const isDirty = hasChanges();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="container mx-auto max-w-4xl px-4 space-y-8">
        
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              <Users className="h-3 w-3 mr-1" />
              {team.name}
            </Badge>
            <span className="text-sm text-muted-foreground">evaluando</span>
            <Badge variant="secondary" className="px-3 py-1 font-semibold">
              {project.name}
            </Badge>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Award className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <div className="text-sm opacity-90 mb-1">Puntuación Total</div>
                <div className="text-5xl font-bold">{totalScore}</div>
                <div className="text-xl opacity-75">de {maxScore}</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3">Promedio</div>
                <div className="text-6xl font-bold">{averageScore.toFixed(1)}</div>
                <div className="text-sm opacity-75 mt-2">sobre 5.0</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm opacity-90 mb-3">Progreso</div>
                <div className="text-5xl font-bold">{evaluatedCount} / {rubric.criteria.length}</div>
                <div className="text-xl opacity-75">criterios</div>
                <Progress value={progressPercentage} className="h-2 mt-3 bg-white/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="space-y-4">
            {rubric.criteria.map((criterion, index) => (
              <Card key={criterion.id} className="shadow-lg">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <CardDescription>Criterio {index + 1}</CardDescription>
                      <CardTitle className="text-xl">{criterion.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <label htmlFor={`score-${criterion.id}`} className="text-sm font-medium">
                            Puntuación
                        </label>
                        <Input
                            id={`score-${criterion.id}`}
                            type="number"
                            min={0}
                            max={5}
                            value={scores[criterion.id] ?? ''}
                            onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                            className="w-24 h-12 text-center text-2xl font-bold"
                            placeholder="-"
                        />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Ver descripciones de puntuación</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {[0, 1, 2, 3, 4, 5].map((scoreValue) => (
                            <div key={scoreValue} className="flex gap-4 p-2 rounded-md bg-muted/50">
                              <div className="font-bold w-8 text-center">{scoreValue}</div>
                              <div className="text-sm text-muted-foreground">
                                {criterion.descriptions?.[scoreValue] || 'Sin descripción'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6 shadow-xl sticky bottom-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-end gap-4">
                {isDirty ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        Tienes cambios sin guardar.
                    </p>
                ) : (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Todos los cambios guardados
                    </p>
                )}
                <Button 
                  type="submit"
                  disabled={isSubmitting || !isDirty} 
                  className="min-w-[150px] shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Guardar Evaluación
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
