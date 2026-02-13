
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { GameState, Question, DailyProgress, UserAnswer, Player, PlayMode, QuizData } from './types';

const STORAGE_KEY = 'korrika_quiz_progress_v6';
const SIMULATION_STORAGE_KEY = 'korrika_simulation_mode';
const GLOBAL_CONFIG_TABLE = 'korrika_app_config';
const START_DATE_CONFIG_KEY = 'challenge_start_date';
const DAYS_COUNT = 11;
const QUESTIONS_PER_DAY = 12;
const SECONDS_PER_QUESTION = 20;
const DEFAULT_CHALLENGE_START_DATE = '2026-02-14';
const ADMIN_USERS = ['admin', 'k_admin'];

const getLocalDateKey = (dateInput?: string | Date) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

type RankingEntry = {
  playerName: string;
  points: number;
  games: number;
};
type LeaderboardView = 'DAILY' | 'GENERAL';
type KorrikaEdukia = {
  day: number;
  title: string;
  content: string;
};
type PlayersSource = {
  table: string;
  columns: string[];
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [quizData, setQuizData] = useState<QuizData[]>([]);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [gameState, setGameState] = useState<GameState>(GameState.AUTH);
  const [playMode, setPlayMode] = useState<PlayMode>('DAILY');
  const [dayIndex, setDayIndex] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timer, setTimer] = useState(SECONDS_PER_QUESTION);
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [supervisorCategory, setSupervisorCategory] = useState<string>('GUZTIAK');
  const [countdown, setCountdown] = useState(3);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [dailyRanking, setDailyRanking] = useState<RankingEntry[]>([]);
  const [generalRanking, setGeneralRanking] = useState<RankingEntry[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [leaderboardView, setLeaderboardView] = useState<LeaderboardView>('DAILY');
  const [edukiak, setEdukiak] = useState<KorrikaEdukia[]>([]);
  const [loadingEdukiak, setLoadingEdukiak] = useState(false);
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [registeredPlayers, setRegisteredPlayers] = useState<string[]>([]);
  const [reviewDayIndex, setReviewDayIndex] = useState<number | null>(null);
  const [challengeStartDate, setChallengeStartDate] = useState(DEFAULT_CHALLENGE_START_DATE);
  const [adminStartDateInput, setAdminStartDateInput] = useState(DEFAULT_CHALLENGE_START_DATE);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [simulationDayIndex, setSimulationDayIndex] = useState(0);
  const [isSimulationRun, setIsSimulationRun] = useState(false);
  const [sequentialSimulationActive, setSequentialSimulationActive] = useState(false);
  const [sequentialSimulationDay, setSequentialSimulationDay] = useState(0);
  const [sequentialSimulationProgress, setSequentialSimulationProgress] = useState<DailyProgress[]>([]);
  const [savingAdminConfig, setSavingAdminConfig] = useState(false);

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [tempPlayerNames, setTempPlayerNames] = useState<string[]>(['Jokalari 1', 'Jokalari 2']);

  // --- SUPABASE DATA FETCHING ---
  const buildRanking = (
    rows: Array<{ player_name: string | null; correct_answers: number | null }>,
    basePlayers: string[] = []
  ) => {
    const scoreMap = new Map<string, RankingEntry>();

    basePlayers.forEach((name) => {
      const cleanName = name.trim();
      if (!cleanName) return;
      scoreMap.set(cleanName, { playerName: cleanName, points: 0, games: 0 });
    });

    rows.forEach((row) => {
      const name = (row.player_name ?? '').trim().toUpperCase();
      if (!name) return;

      const current = scoreMap.get(name) ?? { playerName: name, points: 0, games: 0 };
      current.points += row.correct_answers ?? 0;
      current.games += 1;
      scoreMap.set(name, current);
    });

    return [...scoreMap.values()].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (a.games !== b.games) return a.games - b.games;
      return a.playerName.localeCompare(b.playerName);
    });
  };

  const fetchRegisteredPlayers = async () => {
    const sources: PlayersSource[] = [
      { table: 'korrika_jokalariak', columns: ['name', 'username', 'email', 'code'] },
      { table: 'players', columns: ['name', 'username', 'email'] },
      { table: 'profiles', columns: ['username', 'full_name', 'email'] },
      { table: 'usuarios', columns: ['nombre', 'username', 'email', 'codigo'] }
    ];

    for (const source of sources) {
      try {
        const { data, error } = await supabase
          .from(source.table)
          .select(source.columns.join(','))
          .limit(1000);

        if (error) continue;

        const names = ((data ?? []) as Array<Record<string, unknown>>)
          .map((row) => {
            const raw =
              row['name'] ??
              row['username'] ??
              row['full_name'] ??
              row['nombre'] ??
              row['code'] ??
              row['codigo'] ??
              row['email'];

            if (!raw) return '';
            const value = String(raw).trim();
            if (!value) return '';
            if (value.includes('@')) return value.split('@')[0].toUpperCase();
            return value.toUpperCase();
          })
          .filter(Boolean);

        if (names.length > 0) {
          setRegisteredPlayers([...new Set(names)]);
          return;
        }
      } catch {
        // ignore and continue with next candidate source
      }
    }

    setRegisteredPlayers([]);
  };

  const fetchLeaderboards = async () => {
    try {
      setLoadingRanking(true);
      const { data, error } = await supabase
        .from('game_results')
        .select('player_name, correct_answers, played_at')
        .order('played_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        player_name: string | null;
        correct_answers: number | null;
        played_at: string | null;
      }>;

      const todayKey = getLocalDateKey();
      const dailyRows = rows.filter((row) => row.played_at && getLocalDateKey(row.played_at) === todayKey);

      const basePlayers = [...new Set([...registeredPlayers, userDisplayName])];
      setGeneralRanking(buildRanking(rows, basePlayers));
      setDailyRanking(buildRanking(dailyRows));
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
      setDailyRanking([]);
      setGeneralRanking([]);
    } finally {
      setLoadingRanking(false);
    }
  };

  const fetchEdukiak = async () => {
    try {
      setLoadingEdukiak(true);
      const { data, error } = await supabase.from('korrika_edukiak').select('*');
      if (error) throw error;

      const mapped = ((data ?? []) as Array<Record<string, unknown>>)
        .map((row) => {
          const dayRaw = row['day'] ?? row['day_index'] ?? row['dia'] ?? row['eguna'];
          const titleRaw = row['title'] ?? row['titulo'] ?? row['izenburua'] ?? row['izenburua_eu'];
          const contentRaw = row['content'] ?? row['text'] ?? row['testua'] ?? row['edukia'] ?? row['body'];

          const day = Number(dayRaw);
          const title = String(titleRaw ?? `Eguna ${day}`);
          const content = String(contentRaw ?? '').trim();

          if (!Number.isFinite(day) || day < 0 || day > DAYS_COUNT || !content) return null;
          return { day, title, content };
        })
        .filter((item): item is KorrikaEdukia => Boolean(item))
        .sort((a, b) => a.day - b.day);

      setEdukiak(mapped);
    } catch (err) {
      console.error('Error fetching korrika_edukiak:', err);
      setEdukiak([]);
    } finally {
      setLoadingEdukiak(false);
    }
  };

  const fetchQuizData = async () => {
    try {
      setLoadingData(true);
      const { data, error } = await supabase
        .from("chapters")
        .select(`id, name, questions:questions (id, legacy_id, question_text, correct_key, options:options (opt_key, opt_text))`);

      if (error) throw error;

      const mappedData: QuizData[] = (data || []).map((chapter: any) => ({
        capitulo: chapter.name,
        preguntas: (chapter.questions ?? []).map((q: any) => {
          const sortedOptions = (q.options ?? []).sort((a: any, b: any) =>
            a.opt_key.localeCompare(b.opt_key)
          );
          
          return {
            id: q.id,
            pregunta: q.question_text,
            respuesta_correcta: q.correct_key,
            categoryName: chapter.name,
            opciones: sortedOptions.reduce((acc: any, opt: any) => {
              acc[opt.opt_key] = opt.opt_text;
              return acc;
            }, {})
          };
        })
      }));

      setQuizData(mappedData);
    } catch (err: any) {
      console.error("Error fetching quiz data:", err);
      alert(`Error cargando datos: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGlobalStartDate = async () => {
    try {
      const { data, error } = await supabase
        .from(GLOBAL_CONFIG_TABLE)
        .select('config_value')
        .eq('config_key', START_DATE_CONFIG_KEY)
        .maybeSingle();

      if (error) throw error;

      const rawValue = String((data as { config_value?: string } | null)?.config_value ?? '').trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        setChallengeStartDate(rawValue);
        setAdminStartDateInput(rawValue);
      } else {
        setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
        setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
      }
    } catch (err) {
      console.error('Error fetching global start date:', err);
      setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
      setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (registeredPlayers.length === 0) return;
    void fetchLeaderboards();
  }, [registeredPlayers]);

  useEffect(() => {
    localStorage.setItem(SIMULATION_STORAGE_KEY, simulationEnabled ? '1' : '0');
  }, [simulationEnabled]);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setGameState(GameState.HOME);
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoadingAuth(false);
      }
    };

    const storedSimulation = localStorage.getItem(SIMULATION_STORAGE_KEY);
    if (storedSimulation === '1') setSimulationEnabled(true);

    checkUser();
    fetchGlobalStartDate();
    fetchQuizData();
    fetchLeaderboards();
    fetchEdukiak();
    fetchRegisteredPlayers();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setGameState(GameState.HOME);
        void fetchGlobalStartDate();
        void fetchRegisteredPlayers();
        void fetchLeaderboards();
      } else {
        setGameState(GameState.AUTH);
        setDailyRanking([]);
        setGeneralRanking([]);
      }
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setProgress(JSON.parse(saved));

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoadingAuth(true);

    const rawUsername = loginForm.username.trim().toLowerCase();
    const internalEmail = rawUsername.includes('@') ? rawUsername : `${rawUsername}@korrika.app`;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: loginForm.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Kodea edo pasahitza okerra da. Ziurtatu ondo idatzi dituzula.");
        }
        throw error;
      }
      
      if (data.user) {
        setUser(data.user);
        setGameState(GameState.HOME);
      }
    } catch (err: any) {
      console.error("Supabase Login Error:", err);
      setLoginError(err.message || 'Errorea saioa hastean');
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setGameState(GameState.AUTH);
    setPlayers([]);
    setReviewDayIndex(null);
    setSequentialSimulationActive(false);
    setSequentialSimulationDay(0);
    setSequentialSimulationProgress([]);
  };

  const simulationToday = useMemo(() => {
    if (!sequentialSimulationActive) return null;
    const d = new Date(`${challengeStartDate}T00:00:00`);
    d.setDate(d.getDate() + sequentialSimulationDay);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [sequentialSimulationActive, sequentialSimulationDay, challengeStartDate]);

  const nextAvailableDay = useMemo(() => {
    const today = simulationToday ? new Date(simulationToday) : new Date();
    today.setHours(0, 0, 0, 0);
    const sourceProgress = sequentialSimulationActive ? sequentialSimulationProgress : progress;

    const start = new Date(`${challengeStartDate}T00:00:00`);
    const todayIndex = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (todayIndex < 0) return -4;
    if (todayIndex >= DAYS_COUNT) return -5;

    for (let i = 0; i < DAYS_COUNT; i++) {
      const day = sourceProgress[i];
      if (day?.completed) continue;
      if (i > todayIndex) return -1;
      if (i === 0) return i;
      const prevDay = sourceProgress[i - 1];
      if (!prevDay?.completed) return -1;
      const lastDate = getLocalDateKey(prevDay.date);
      const todayDate = getLocalDateKey(today);
      if (lastDate === todayDate) return -2;
      return i;
    }
    return -3;
  }, [progress, challengeStartDate, simulationToday, sequentialSimulationActive, sequentialSimulationProgress]);

  const generateQuestions = useCallback((mode: PlayMode, idx: number) => {
    if (quizData.length === 0) return [];
    
    if (mode === 'RANDOM') {
      const questions: Question[] = [];
      quizData.forEach(category => {
        const shuffled = [...category.preguntas].sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, 2).map(q => ({ ...q, categoryName: category.capitulo }));
        questions.push(...picked);
      });
      return questions.sort(() => 0.5 - Math.random());
    } else {
      const questions: Question[] = [];
      quizData.forEach(category => {
        // Seleccionamos las dos preguntas correspondientes al día actual
        const q1 = category.preguntas[idx * 2];
        const q2 = category.preguntas[idx * 2 + 1];
        if (q1) questions.push({ ...q1, categoryName: category.capitulo });
        if (q2) questions.push({ ...q2, categoryName: category.capitulo });
      });
      return questions.slice(0, QUESTIONS_PER_DAY);
    }
  }, [quizData]);

  const handleNextQuestion = useCallback((selectedOption: string | null) => {
    if (activeQuestions.length === 0) return;

    const q = activeQuestions[currentQuestionIdx];
    const isCorrect = selectedOption === q.respuesta_correcta;
    const newAnswer: UserAnswer = { question: q, selectedOption, isCorrect };
    const updatedPlayers = players.map((player, idx) => {
      if (idx !== currentPlayerIdx) return player;
      return {
        ...player,
        score: player.score + (isCorrect ? 1 : 0),
        answers: [...player.answers, newAnswer]
      };
    });
    setPlayers(updatedPlayers);

    if (currentQuestionIdx < activeQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setTimer(SECONDS_PER_QUESTION);
    } else {
      if (currentPlayerIdx < players.length - 1) {
        setGameState(GameState.TURN_TRANSITION);
      } else {
        void finishGame(updatedPlayers);
      }
    }
  }, [currentQuestionIdx, activeQuestions, players, currentPlayerIdx]);

  const persistGameResults = async (finalPlayers: Player[]) => {
    if (!user) return;

    const playedAt = new Date().toISOString();
    const rows = finalPlayers.map((player) => {
      const totalQuestions = player.answers.length;
      const correctAnswers = player.score;
      const incorrectAnswers = totalQuestions - correctAnswers;

      return {
        user_id: user.id,
        user_email: user.email ?? null,
        player_name: player.name,
        play_mode: playMode,
        day_index: playMode === 'DAILY' ? dayIndex : null,
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        incorrect_answers: incorrectAnswers,
        answers: player.answers.map((answer) => ({
          question_id: answer.question.id,
          question_text: answer.question.pregunta,
          category: answer.question.categoryName ?? null,
          selected_option_key: answer.selectedOption,
          selected_option_text: answer.selectedOption ? answer.question.opciones[answer.selectedOption] : null,
          correct_option_key: answer.question.respuesta_correcta,
          correct_option_text: answer.question.opciones[answer.question.respuesta_correcta],
          is_correct: answer.isCorrect
        })),
        played_at: playedAt
      };
    });

    const { error } = await supabase.from('game_results').insert(rows);
    if (error) {
      console.error("Error saving game results:", error);
    }
  };

  const finishGame = async (finalPlayers: Player[]) => {
    const isMulti = finalPlayers.length > 1;
    const finalScore = isMulti ? Math.max(...finalPlayers.map(p => p.score)) : finalPlayers[0].score;
    
    if (playMode === 'DAILY' && sequentialSimulationActive) {
      const newDailyProgress: DailyProgress = {
        dayIndex,
        score: finalScore,
        completed: true,
        date: new Date().toISOString(),
        answers: finalPlayers[0].answers,
        players: isMulti ? finalPlayers : undefined
      };

      const updatedSimProgress = [...sequentialSimulationProgress];
      updatedSimProgress[dayIndex] = newDailyProgress;
      setSequentialSimulationProgress(updatedSimProgress);
    } else if (playMode === 'DAILY' && !isSimulationRun) {
      const newDailyProgress: DailyProgress = {
        dayIndex,
        score: finalScore,
        completed: true,
        date: new Date().toISOString(),
        answers: finalPlayers[0].answers, 
        players: isMulti ? finalPlayers : undefined
      };

      const updatedProgress = [...progress];
      updatedProgress[dayIndex] = newDailyProgress;
      setProgress(updatedProgress);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress));
    }

    if (!isSimulationRun && !sequentialSimulationActive) {
      await persistGameResults(finalPlayers);
      await fetchLeaderboards();
    }
    
    setReviewDayIndex(null);
    if (sequentialSimulationActive) {
      setSequentialSimulationDay((prev) => Math.min(prev + 1, DAYS_COUNT));
      setGameState(GameState.HOME);
      return;
    }
    setGameState(isMulti ? GameState.RANKING : GameState.RESULTS);
  };

  useEffect(() => {
    if (gameState !== GameState.QUIZ) return;
    
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          handleNextQuestion(null);
          return SECONDS_PER_QUESTION;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState, currentQuestionIdx, currentPlayerIdx, activeQuestions.length]);

  useEffect(() => {
    if (gameState !== GameState.COUNTDOWN) return;
    if (countdown > 0) {
      const timerId = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setGameState(GameState.QUIZ);
    }
  }, [gameState, countdown]);

  const initGame = (mode: 'SOLO' | 'COMP', type: PlayMode) => {
    const idx = type === 'DAILY' ? nextAvailableDay : 0;
    if (type === 'DAILY' && idx < 0) return;
    
    setReviewDayIndex(null);
    setIsSimulationRun(sequentialSimulationActive ? type === 'DAILY' : false);
    setPlayMode(type);
    setDayIndex(idx);
    const qs = generateQuestions(type, idx);
    setActiveQuestions(qs);

    if (mode === 'SOLO') {
      const userName = user?.email?.split('@')[0].toUpperCase() || 'GONBIDATUA';
      const p: Player = { name: userName, score: 0, answers: [] };
      setPlayers([p]);
      setCurrentPlayerIdx(0);
      setCurrentQuestionIdx(0);
      setTimer(SECONDS_PER_QUESTION);
      setCountdown(3);
      setGameState(GameState.COUNTDOWN);
    } else {
      setGameState(GameState.PLAYER_SETUP);
    }
  };

  const saveChallengeStartDate = async () => {
    if (!isAdmin) return;
    const value = adminStartDateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    try {
      setSavingAdminConfig(true);
      const { error } = await supabase
        .from(GLOBAL_CONFIG_TABLE)
        .upsert(
          {
            config_key: START_DATE_CONFIG_KEY,
            config_value: value
          },
          { onConflict: 'config_key' }
        );
      if (error) throw error;
      setChallengeStartDate(value);
    } catch (err) {
      console.error('Error saving global start date:', err);
    } finally {
      setSavingAdminConfig(false);
    }
  };

  const resetChallengeStartDate = async () => {
    if (!isAdmin) return;
    try {
      setSavingAdminConfig(true);
      const { error } = await supabase
        .from(GLOBAL_CONFIG_TABLE)
        .upsert(
          {
            config_key: START_DATE_CONFIG_KEY,
            config_value: DEFAULT_CHALLENGE_START_DATE
          },
          { onConflict: 'config_key' }
        );
      if (error) throw error;
      setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
      setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
    } catch (err) {
      console.error('Error resetting global start date:', err);
    } finally {
      setSavingAdminConfig(false);
    }
  };

  const startSimulationDay = (idx: number) => {
    if (!isAdmin) return;
    const clampedIdx = Math.min(Math.max(idx, 0), DAYS_COUNT - 1);
    const qs = generateQuestions('DAILY', clampedIdx);
    if (qs.length === 0) return;

    setReviewDayIndex(null);
    setIsSimulationRun(true);
    setPlayMode('DAILY');
    setDayIndex(clampedIdx);
    setActiveQuestions(qs);

    const simPlayerName = userDisplayName || 'SIMULAZIOA';
    setPlayers([{ name: simPlayerName, score: 0, answers: [] }]);
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setTimer(SECONDS_PER_QUESTION);
    setCountdown(3);
    setGameState(GameState.COUNTDOWN);
  };

  const startSequentialSimulation = () => {
    if (!isAdmin) return;
    setSequentialSimulationActive(true);
    setSequentialSimulationDay(0);
    setSequentialSimulationProgress([]);
    setIsSimulationRun(false);
    setReviewDayIndex(null);
    setGameState(GameState.HOME);
  };

  const stopSequentialSimulation = () => {
    if (!isAdmin) return;
    setSequentialSimulationActive(false);
    setSequentialSimulationDay(0);
    setSequentialSimulationProgress([]);
    setIsSimulationRun(false);
    setReviewDayIndex(null);
  };

  const getResultFeedback = (score: number, totalQuestions: number) => {
    const total = totalQuestions || QUESTIONS_PER_DAY;
    if (score === total) return { text: "Zuzenean lekukoa hartzera!", emoji: "👑" };
    if (score >= total * 0.8) return { text: "Oso ondo! Bihar gehiago.", emoji: "🏃‍♂️" };
    if (score >= total * 0.5) return { text: "Ertaina. Jarraitu trebatzen.", emoji: "🤝" };
    return { text: "Bihar saiatu berriz, mesedez.", emoji: "😱" };
  };

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return quizData;
    return quizData.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory, quizData]);

  const userDisplayName = (user?.email?.split('@')[0] || 'Gonbidatua').toUpperCase();
  const isAdmin = ADMIN_USERS.includes((user?.email?.split('@')[0] || '').toLowerCase());
  const activeRanking = leaderboardView === 'DAILY' ? dailyRanking : generalRanking;
  const challengeStartTs = useMemo(() => new Date(`${challengeStartDate}T00:00:00`).getTime(), [challengeStartDate]);
  const effectiveNowTs = simulationToday ? simulationToday.getTime() : nowTs;
  const timeUntilStart = Math.max(0, challengeStartTs - effectiveNowTs);
  const activeEdukia = useMemo(() => {
    if (edukiak.length === 0) return null;

    const today = simulationToday ? new Date(simulationToday) : new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${challengeStartDate}T00:00:00`);
    const elapsedDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const targetDay = elapsedDays < 0 ? 0 : Math.min(elapsedDays + 1, DAYS_COUNT);

    return edukiak.find((item) => item.day === targetDay) ?? null;
  }, [edukiak, challengeStartDate, simulationToday]);
  const completedDayIndexes = useMemo(
    () => progress.map((day, idx) => (day?.completed ? idx : -1)).filter((idx) => idx >= 0),
    [progress]
  );
  const reviewedDay = reviewDayIndex !== null ? progress[reviewDayIndex] : undefined;
  const resultsAnswers = reviewedDay?.answers ?? (players[0]?.answers ?? []);
  const resultsScore = reviewedDay?.score ?? (players[0]?.score ?? 0);
  const resultsTotal = Math.max(resultsAnswers.length, 1);
  const resultsFeedback = getResultFeedback(resultsScore, resultsTotal);

  if ((loadingAuth || loadingData) && (gameState === GameState.AUTH || gameState === GameState.HOME)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest animate-pulse">Datuak kargatzen...</p>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 flex flex-col bg-gray-50 text-gray-800 ${gameState !== GameState.AUTH ? 'overflow-hidden' : 'overflow-auto'}`}>
      <header className="w-full korrika-bg-gradient p-4 text-white shadow-md flex flex-col items-center flex-shrink-0 z-10 relative">
        {user && gameState !== GameState.AUTH && (
          <>
            <button
              onClick={handleLogout}
              className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide hover:bg-white/30 transition-colors"
            >
              🚪 Irten
            </button>
            <div className="absolute right-4 top-4 rounded-full bg-white/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wide">
              👤 {userDisplayName}
            </div>
          </>
        )}
        <h1 className="text-2xl font-black tracking-tighter uppercase italic flex items-center gap-2">
          <span>🏃‍♀️</span> KORRIKA
        </h1>
        <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{DAYS_COUNT} EGUNEKO ERRONKA</p>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 flex flex-col overflow-hidden relative">
        
        {gameState === GameState.AUTH && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in zoom-in-95">
             <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-sm">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black uppercase italic korrika-pink">Sartu Lekukoan</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Erabiltzaile kodea behar duzu</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2 mb-1 block">Erabiltzailea (k_XXXX)</label>
                    <input 
                      type="text" 
                      required
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                      placeholder="k_0001"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-700 focus:border-pink-300 outline-none transition-all"
                    />
                  </div>
                  <div className="relative">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2 mb-1 block">Pasahitza</label>
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-3 font-bold text-gray-700 focus:border-pink-300 outline-none transition-all pr-12"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 bottom-3.5 text-gray-400 hover:text-pink-500 transition-colors"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {loginError && (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
                      <p className="text-[10px] text-red-500 font-bold text-center leading-tight">
                        {loginError}
                      </p>
                    </div>
                  )}
                  <button 
                    disabled={loadingAuth}
                    type="submit" 
                    className="w-full korrika-bg-gradient text-white py-4 rounded-2xl font-black uppercase italic shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loadingAuth ? 'Sartzen...' : 'SARTU'}
                  </button>
                </form>

             </div>
             <p className="text-[9px] font-black text-gray-300 uppercase">AEK - EUSKARA BIZIRIK</p>
          </div>
        )}

        {gameState === GameState.HOME && (
          <div className="flex-1 flex flex-col items-center justify-start space-y-4 animate-in fade-in zoom-in-95 duration-500 pt-3 pb-6 overflow-y-auto">
            <div className="w-full flex flex-col items-center space-y-4">
              <section className="w-full px-4">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                  {loadingEdukiak ? (
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Edukia kargatzen...</p>
                  ) : activeEdukia ? (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-pink-500">Eguneko edukia</p>
                      <h3 className="text-sm font-black text-gray-800 mt-1">{activeEdukia.title}</h3>
                      <p className="text-[12px] leading-relaxed text-gray-600 mt-2">{activeEdukia.content}</p>
                    </div>
                  ) : (
                    <p className="text-[11px] font-bold text-gray-400">Ez dago edukirik egun honetarako.</p>
                  )}
                </div>
              </section>

              {isAdmin && (
                <section className="w-full px-4">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">Admin panela</p>

                    <div className="rounded-xl bg-white border border-amber-100 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase text-amber-700">Simulazio sekuentziala</p>
                        <span className={`text-[10px] font-black uppercase ${sequentialSimulationActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                          {sequentialSimulationActive ? `Eguna ${Math.min(sequentialSimulationDay + 1, DAYS_COUNT)}` : 'Itzalita'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={startSequentialSimulation}
                          className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-[10px] font-black uppercase"
                        >
                          Hasi simulazioa
                        </button>
                        <button
                          onClick={stopSequentialSimulation}
                          className="rounded-xl bg-white border border-amber-200 text-amber-700 px-3 py-2 text-[10px] font-black uppercase"
                        >
                          Gelditu
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                      <input
                        type="date"
                        value={adminStartDateInput}
                        onChange={(e) => setAdminStartDateInput(e.target.value)}
                        className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-700 outline-none"
                      />
                      <button
                        onClick={() => void saveChallengeStartDate()}
                        disabled={savingAdminConfig}
                        className="rounded-xl bg-amber-500 text-white px-3 py-2 text-[10px] font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingAdminConfig ? 'Gordetzen...' : 'Gorde'}
                      </button>
                      <button
                        onClick={() => void resetChallengeStartDate()}
                        disabled={savingAdminConfig}
                        className="rounded-xl bg-white border border-amber-200 text-amber-700 px-3 py-2 text-[10px] font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Berrezarri
                      </button>
                    </div>

                    <div className="rounded-xl bg-white border border-amber-100 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black uppercase text-amber-700">Simulazioa</p>
                        <button
                          onClick={() => setSimulationEnabled((prev) => !prev)}
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                            simulationEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {simulationEnabled ? 'Aktibatuta' : 'Desaktibatuta'}
                        </button>
                      </div>

                      {simulationEnabled && (
                        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                          <select
                            value={simulationDayIndex}
                            onChange={(e) => setSimulationDayIndex(Number(e.target.value))}
                            className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-700 outline-none"
                          >
                            {Array.from({ length: DAYS_COUNT }).map((_, i) => (
                              <option key={`sim-day-${i}`} value={i}>
                                {i + 1}. eguna
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => startSimulationDay(simulationDayIndex)}
                            className="rounded-xl bg-gray-800 text-white px-3 py-2 text-[10px] font-black uppercase"
                          >
                            Probatu
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {nextAvailableDay >= 0 || nextAvailableDay === -4 ? (
                <div className="flex flex-col gap-3 w-full px-8">
                  <button
                    onClick={() => initGame('SOLO', 'DAILY')}
                    disabled={nextAvailableDay === -4}
                    className="korrika-bg-gradient text-white py-4 rounded-2xl font-black text-lg uppercase italic shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-white/20 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    {nextAvailableDay === -4
                      ? `Jolastu aktibatuko da: ${formatCountdown(timeUntilStart)}`
                      : `Jolastu (${nextAvailableDay + 1}. Eguna)`}
                  </button>
                </div>
              ) : (
                <div className="bg-white px-8 py-4 rounded-3xl shadow-md border border-gray-100 flex flex-col items-center text-center gap-2 w-full max-w-xs mx-auto">
                  <div className="text-3xl">
                    {nextAvailableDay === -4
                      ? '📅'
                      : nextAvailableDay === -1
                        ? '🔒'
                        : nextAvailableDay === -2
                          ? '⏳'
                          : '👏'}
                  </div>
                  <h2 className="text-sm font-black uppercase italic text-gray-800">
                    {nextAvailableDay === -4
                      ? 'Erronka hasi gabe'
                      : nextAvailableDay === -1
                        ? 'Bihar saiatu'
                        : nextAvailableDay === -2
                          ? 'Bihar arte!'
                          : 'Erronka Amaituta'}
                  </h2>
                  {(nextAvailableDay === -3 || nextAvailableDay === -5) && (
                    <p className="text-[10px] font-bold text-gray-500">Eskerrik asko parte hartzeagatik.</p>
                  )}
                </div>
              )}

              {completedDayIndexes.length > 0 && (
                <section className="w-full px-4">
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-2">
                      Aurreko egunetako emaitzak
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {completedDayIndexes.map((idx) => (
                        <button
                          key={`review-day-${idx}`}
                          onClick={() => {
                            setReviewDayIndex(idx);
                            setGameState(GameState.RESULTS);
                          }}
                          className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-[10px] font-black uppercase text-pink-700 hover:bg-pink-100 transition-colors"
                        >
                          {idx + 1}. eguna
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            <section className="w-full px-4">
              <div className="rounded-[1.5rem] border border-gray-200 bg-white shadow-lg overflow-hidden">
                <div className="korrika-bg-gradient p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase">Sailkapena</h3>
                    </div>
                    {loadingRanking && (
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider">
                        Kargatzen
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/15 p-1">
                    <button
                      onClick={() => setLeaderboardView('DAILY')}
                      className={`rounded-xl py-2 text-[10px] font-black uppercase transition-all ${
                        leaderboardView === 'DAILY' ? 'bg-white text-pink-600 shadow-sm' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Egunekoa
                    </button>
                    <button
                      onClick={() => setLeaderboardView('GENERAL')}
                      className={`rounded-xl py-2 text-[10px] font-black uppercase transition-all ${
                        leaderboardView === 'GENERAL' ? 'bg-white text-pink-600 shadow-sm' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      Orokorra
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  {activeRanking.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                      <p className="text-[10px] font-bold text-gray-400">
                        {leaderboardView === 'DAILY' ? 'Gaur ez dago emaitzarik oraindik.' : 'Oraindik ez dago rankingerako daturik.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeRanking.slice(0, 5).map((entry, idx) => (
                        <article
                          key={`${leaderboardView}-${entry.playerName}`}
                          className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black ${
                                idx === 0
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : idx === 1
                                    ? 'bg-slate-200 text-slate-700'
                                    : idx === 2
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[12px] font-black text-gray-800 truncate">{entry.playerName}</p>
                              {leaderboardView === 'GENERAL' && (
                                <p className="text-[9px] font-bold uppercase text-gray-400">
                                  {entry.games} {entry.games === 1 ? 'partida' : 'partidak'}
                                </p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-black text-pink-600">{entry.points} pt</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        )}

        {gameState === GameState.PLAYER_SETUP && (
          <div className="flex-1 flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <h2 className="text-xl font-black uppercase italic korrika-pink">Jokalariak Gehitu</h2>
            </div>
            <div className="space-y-2 flex-1 overflow-auto">
              {tempPlayerNames.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" value={name} onChange={(e) => { const n = [...tempPlayerNames]; n[i] = e.target.value; setTempPlayerNames(n); }} className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-pink-300 outline-none" placeholder={`Jokalari ${i+1}...`} />
                  {tempPlayerNames.length > 2 && (
                    <button onClick={() => setTempPlayerNames(tempPlayerNames.filter((_, idx) => idx !== i))} className="bg-red-50 text-red-500 w-12 rounded-xl border border-red-100">✕</button>
                  )}
                </div>
              ))}
              {tempPlayerNames.length < 4 && (
                <button onClick={() => setTempPlayerNames([...tempPlayerNames, `Jokalari ${tempPlayerNames.length + 1}`])} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-xs uppercase">+ Gehitu</button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setGameState(GameState.HOME)} className="flex-1 bg-gray-200 py-4 rounded-2xl font-black text-xs uppercase">Utzi</button>
              <button onClick={() => {
                const pList = tempPlayerNames.map(n => ({ name: n.trim() || 'Izengabea', score: 0, answers: [] }));
                setPlayers(pList);
                setCurrentPlayerIdx(0);
                setCurrentQuestionIdx(0);
                setTimer(SECONDS_PER_QUESTION);
                setCountdown(3);
                setGameState(GameState.COUNTDOWN);
              }} className="flex-[2] korrika-bg-gradient text-white py-4 rounded-2xl font-black text-xs uppercase">Hasi</button>
            </div>
          </div>
        )}

        {gameState === GameState.COUNTDOWN && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-pink-500 font-black uppercase tracking-widest text-sm mb-4">{players[currentPlayerIdx].name} prest?</div>
            <div className="text-[10rem] font-black korrika-pink animate-bounce">{countdown === 0 ? '🏁' : countdown}</div>
          </div>
        )}

        {gameState === GameState.QUIZ && activeQuestions.length > 0 && (
          <div className="flex-1 flex flex-col py-4 space-y-4 overflow-hidden">
             <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                     <span className="text-[9px] font-black uppercase text-pink-500 truncate w-32">{players[currentPlayerIdx].name}</span>
                     <span className="text-[8px] font-bold text-gray-400 uppercase">{activeQuestions[currentQuestionIdx].categoryName}</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: activeQuestions.length }).map((_, i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i === currentQuestionIdx ? 'korrika-bg-pink' : i < currentQuestionIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
                <div className="w-12 h-12 ml-4 flex items-center justify-center bg-white rounded-full shadow-md text-xs font-black">
                  {timer}
                </div>
             </div>
             <div className="flex-1 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-800 italic">"{activeQuestions[currentQuestionIdx].pregunta}"</h3>
                </div>
                <div className="flex-1 grid grid-rows-4 gap-2">
                  {Object.entries(activeQuestions[currentQuestionIdx].opciones).map(([key, value]) => (
                    <button key={key} onClick={() => handleNextQuestion(key)} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-100 active:scale-95 transition-all flex items-center gap-3">
                      <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs">{key.toUpperCase()}</span>
                      <span className="font-bold text-gray-700 text-sm">{value}</span>
                    </button>
                  ))}
                </div>
             </div>
          </div>
        )}

        {gameState === GameState.TURN_TRANSITION && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
             <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-2xl font-black korrika-pink uppercase italic mb-6">Txandakoa!</h2>
                {currentPlayerIdx < players.length && (
                  <div className="space-y-6">
                     <p className="text-xl font-black text-gray-800">{players[currentPlayerIdx].name}</p>
                     <div className="text-6xl mb-4">👇</div>
                     <button 
                       onClick={() => {
                         setCurrentPlayerIdx(prev => prev + 1);
                         setCurrentQuestionIdx(0);
                         setTimer(SECONDS_PER_QUESTION);
                         setCountdown(3);
                         setGameState(GameState.COUNTDOWN);
                       }}
                       className="korrika-bg-gradient text-white px-8 py-4 rounded-2xl font-black uppercase text-xs"
                     >
                       Prest
                     </button>
                  </div>
                )}
             </div>
          </div>
        )}

        {gameState === GameState.RESULTS && (
          <div className="flex-1 overflow-auto py-6 space-y-4">
            <div className="rounded-[2rem] p-5 text-white shadow-xl korrika-bg-gradient">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                    {isSimulationRun
                      ? 'Simulazio emaitza'
                      : reviewDayIndex !== null
                        ? `${reviewDayIndex + 1}. eguneko emaitza`
                        : 'Azken Emaitza'}
                  </p>
                  <h2 className="text-2xl font-black italic mt-1">{resultsFeedback.text}</h2>
                </div>
                <div className="text-5xl leading-none">{resultsFeedback.emoji}</div>
              </div>
              <div className="mt-5 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-black">
                    {resultsScore}
                    <span className="text-lg font-bold text-white/80"> / {resultsTotal}</span>
                  </p>
                  <p className="text-xs uppercase font-black tracking-widest text-white/80">
                    {Math.round(((resultsScore || 0) / Math.max(resultsTotal, 1)) * 100)}% asmatuak
                  </p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${((resultsScore || 0) / Math.max(resultsTotal, 1)) * 100}%` }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setReviewDayIndex(null);
                  setIsSimulationRun(false);
                  setGameState(GameState.HOME);
                }}
                className="mt-5 w-full bg-white text-pink-600 py-3 rounded-2xl font-black uppercase text-xs shadow-md active:scale-95 transition-all"
              >
                Itzuli
              </button>
            </div>

            <div className="bg-white rounded-[1.75rem] p-4 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">Erantzunen Xehetasuna</h3>
                <span className="text-[10px] font-black uppercase text-gray-400">
                  {resultsAnswers.length} galdera
                </span>
              </div>
              <div className="space-y-3">
                {resultsAnswers.map((answer, idx) => {
                  const selectedKey = answer.selectedOption;
                  const correctKey = answer.question.respuesta_correcta;
                  const selectedText = selectedKey ? answer.question.opciones[selectedKey] : null;
                  const correctText = answer.question.opciones[correctKey];

                  return (
                    <article
                      key={`${answer.question.id}-${idx}`}
                      className={`rounded-2xl border p-4 ${
                        answer.isCorrect
                          ? 'border-emerald-100 bg-emerald-50/50'
                          : 'border-rose-100 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[11px] font-black text-gray-700 leading-snug">
                          {idx + 1}. {answer.question.pregunta}
                        </p>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap ${
                            answer.isCorrect
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {answer.isCorrect ? 'Zuzena' : 'Okerra'}
                        </span>
                      </div>

                      <div className="grid gap-2">
                        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                          <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Zure aukera</p>
                          <p className={`text-[11px] font-bold ${answer.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {selectedKey ? `${selectedKey.toUpperCase()}) ${selectedText}` : 'Erantzun gabe'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <p className="text-[9px] font-black uppercase text-emerald-600/70 mb-1">Erantzun zuzena</p>
                          <p className="text-[11px] font-black text-emerald-700">
                            {`${correctKey.toUpperCase()}) ${correctText}`}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.RANKING && (
          <div className="flex-1 overflow-auto py-6 space-y-4">
             <div className="text-center mb-6">
                <h2 className="text-2xl font-black korrika-pink uppercase italic">🏆 Sailkapena</h2>
             </div>
             <div className="space-y-3 px-4">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="text-2xl font-black text-gray-300 w-8 text-center">
                           {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                         </div>
                         <div>
                           <p className="font-black text-gray-800">{player.name}</p>
                           <p className="text-[10px] text-gray-400 font-bold">{player.score} puntu</p>
                         </div>
                       </div>
                       <div className="text-3xl font-black korrika-pink">{player.score}</div>
                    </div>
                  ))}
             </div>
             <div className="flex gap-2 mt-6 px-4">
                <button onClick={() => setGameState(GameState.HOME)} className="flex-1 korrika-bg-gradient text-white py-4 rounded-2xl font-black uppercase text-xs">Itzuli</button>
             </div>
          </div>
        )}

        {gameState === GameState.SUPERVISOR && (
          <div className="flex-1 overflow-auto py-6 space-y-4">
             <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xl font-black korrika-pink uppercase italic">📚 Galderak</h2>
                   <button onClick={() => setGameState(GameState.HOME)} className="bg-gray-800 text-white px-4 py-2 rounded-full font-black text-[9px] uppercase">Itzuli</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                   <button
                     onClick={() => setSupervisorCategory('GUZTIAK')}
                     className={`px-4 py-2 rounded-full font-black text-[9px] uppercase transition-all ${
                       supervisorCategory === 'GUZTIAK'
                         ? 'korrika-bg-gradient text-white'
                         : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                     }`}
                   >
                     GUZTIAK
                   </button>
                   {quizData.map(cat => (
                     <button
                       key={cat.capitulo}
                       onClick={() => setSupervisorCategory(cat.capitulo)}
                       className={`px-4 py-2 rounded-full font-black text-[9px] uppercase transition-all ${
                         supervisorCategory === cat.capitulo
                           ? 'korrika-bg-gradient text-white'
                           : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                       }`}
                     >
                       {cat.capitulo}
                     </button>
                   ))}
                </div>
             </div>
             {filteredSupervisorData.length === 0 ? (
               <p className="text-center text-gray-400 font-bold py-10">Ez dago galderarik kargatuta.</p>
             ) : (
               filteredSupervisorData.map(category => (
                 <div key={category.capitulo} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4">
                   <div className="korrika-bg-gradient p-3 text-white font-black text-xs uppercase">{category.capitulo}</div>
                   <div className="p-4 space-y-4">
                     {category.preguntas.map(q => (
                       <div key={q.id} className="border-b border-gray-50 pb-2">
                         <p className="font-bold text-xs text-gray-800">{q.pregunta}</p>
                         <p className="text-[10px] text-green-600 font-black">✓ {q.opciones[q.respuesta_correcta]}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               ))
             )}
          </div>
        )}

      </main>

      <footer className="w-full py-4 text-center opacity-30 text-[8px] font-black uppercase tracking-[0.3em] bg-gray-50">
        🏃‍♀️ AEK - KORRIKA &copy; 2024 🏁
      </footer>
    </div>
  );
};

export default App;
