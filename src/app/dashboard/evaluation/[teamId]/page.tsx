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
import { ArrowLeft, Check, Loader2, Save, Users, AlertTriangle, ChevronLeft, ChevronRight, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

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
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);
  
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
        if (existingEvaluation) {
          existingEvaluation.scores.forEach(s => {
            loadedScores[s.criterionId] = s.score;
          });
        }
        
        setScores(loadedScores);
        setInitialScores(loadedScores);

      } catch (e) {
        console.error(e);
        setError('Error al cargar los datos de evaluación.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [teamId]);

  const handleScoreSelect = (criterionId: string, scoreValue: number) => {
    setScores(prevScores => ({
      ...prevScores,
      [criterionId]: scoreValue,
    }));
  };

  const validateForm = (): boolean => {
    if (!rubric) return false;
    
    for (const criterion of rubric.criteria) {
      if (scores[criterion.id] === null || scores[criterion.id] === undefined) {
        toast({ 
          variant: 'destructive', 
          title: 'Evaluación Incompleta', 
          description: `Por favor califica: ${criterion.name}` 
        });
        return false;
      }
    }
    return true;
  };

  const hasChanges = (): boolean => {
    if (!rubric) return false;
    
    for (const criterion of rubric.criteria) {
      if (scores[criterion.id] !== initialScores[criterion.id]) return true;
    }
    return false;
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
      
      if (!evaluation) {
        const newEvaluation = await getEvaluation(team.id, project.id);
        setEvaluation(newEvaluation);
      }

      setInitialScores({ ...scores });

      toast({ title: 'Evaluación Guardada', description: 'Tu evaluación se ha guardado exitosamente.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la evaluación.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextCriterion = () => {
    if (rubric && currentCriterionIndex < rubric.criteria.length - 1) {
      setCurrentCriterionIndex(prev => prev + 1);
    }
  };

  const goToPreviousCriterion = () => {
    if (currentCriterionIndex > 0) {
      setCurrentCriterionIndex(prev => prev - 1);
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
  
  const evaluatedCount = rubric.criteria.filter(crit => 
    scores[crit.id] !== undefined && scores[crit.id] !== null
  ).length;
  const progressPercentage = (evaluatedCount / rubric.criteria.length) * 100;
  const isDirty = hasChanges();

  const currentCriterion = rubric.criteria[currentCriterionIndex];
  const currentScore = scores[currentCriterion.id];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:to-slate-900 py-8">
      <div className="container mx-auto max-w-6xl px-4 space-y-8">
        
        {/* Header Compacto */}
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

        {/* Score Dashboard */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-2xl">
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
                <div className="text-5xl font-bold">{evaluatedCount}</div>
                <div className="text-xl opacity-75">de {rubric.criteria.length} criterios</div>
                <Progress value={progressPercentage} className="h-2 mt-3 bg-white/20" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluación Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Panel de Evaluación (Columna Principal) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Navegación del Criterio */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl p-4 shadow-lg border-2 border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="lg"
                onClick={goToPreviousCriterion}
                disabled={currentCriterionIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-5 w-5" />
                Anterior
              </Button>
              
              <div className="text-center px-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Criterio</div>
                <div className="text-2xl font-bold text-primary">
                  {currentCriterionIndex + 1} / {rubric.criteria.length}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={goToNextCriterion}
                disabled={currentCriterionIndex === rubric.criteria.length - 1}
                className="gap-2"
              >
                Siguiente
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Card del Criterio Actual */}
            <Card className="shadow-2xl border-2 border-slate-300 dark:border-slate-700">
              <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-2xl leading-tight">{currentCriterion.name}</CardTitle>
                  {currentScore !== null && currentScore !== undefined && (
                    <Badge className="text-xl px-4 py-2 shrink-0 bg-green-600">
                      ★ {currentScore}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4, 5].map((scoreValue) => {
                    const isSelected = currentScore === scoreValue;
                    
                    return (
                      <button
                        key={`${currentCriterion.id}-${scoreValue}`}
                        type="button"
                        onClick={() => handleScoreSelect(currentCriterion.id, scoreValue)}
                        className={`
                          w-full p-5 rounded-xl border-2 text-left transition-all duration-200
                          flex items-start gap-4 group hover:shadow-lg
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg ring-2 ring-blue-500 ring-offset-2' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <div className={`
                          shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-3xl font-bold
                          ${isSelected 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'
                          }
                        `}>
                          {scoreValue}
                        </div>
                        
                        <div className="flex-1 pt-2">
                          <p className={`text-base leading-relaxed ${isSelected ? 'font-medium text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}`}>
                            {currentCriterion.descriptions[scoreValue]}
                          </p>
                        </div>
                        
                        {isSelected && (
                          <div className="shrink-0">
                            <Check className="h-8 w-8 text-blue-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Vista Rápida de Criterios */}
            <Card className="shadow-xl border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Todos los Criterios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rubric.criteria.map((criterion, index) => {
                  const criterionScore = scores[criterion.id];
                  const isEvaluated = criterionScore !== null && criterionScore !== undefined;
                  const isCurrent = index === currentCriterionIndex;
                  
                  return (
                    <button
                      key={`nav-${criterion.id}`}
                      type="button"
                      onClick={() => setCurrentCriterionIndex(index)}
                      className={`
                        w-full p-3 rounded-lg text-left transition-all flex items-center justify-between
                        ${isCurrent 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : isEvaluated
                            ? 'bg-green-100 dark:bg-green-950/30 border border-green-300 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/40'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }
                      `}
                    >
                      <span className={`text-sm font-medium truncate ${isCurrent ? 'text-white' : ''}`}>
                        {index + 1}. {criterion.name}
                      </span>
                      <Badge variant={isCurrent ? "secondary" : "outline"} className={`ml-2 shrink-0 ${isCurrent ? 'bg-white/20 text-white border-white/30' : ''}`}>
                        {isEvaluated ? criterionScore : '—'}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Botón de Guardar */}
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
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" /> Guardar Evaluación
                    </>
                  )}
                </Button>
                {!isDirty && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center justify-center gap-2 mt-3">
                    <Check className="h-4 w-4" />
                    Todos los cambios guardados
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
