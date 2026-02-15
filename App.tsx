
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { GameState, Question, DailyProgress, UserAnswer, Player, PlayMode, QuizData } from './types';
import CountdownScreen from './components/CountdownScreen';
import QuizScreen from './components/QuizScreen';
import AuthScreen from './components/screens/AuthScreen';
import HomeScreen from './components/screens/HomeScreen';
import PlayerSetupScreen from './components/screens/PlayerSetupScreen';
import TurnTransitionScreen from './components/screens/TurnTransitionScreen';
import ResultsScreen from './components/screens/ResultsScreen';
import RankingScreen from './components/screens/RankingScreen';
import SupervisorScreen from './components/screens/SupervisorScreen';
import { readLocalCache, removeLocalCache, writeLocalCache } from './utils/localCache';
import { buildRanking } from './utils/ranking';
import {
  GameResultRow,
  KorrikaEdukia,
  UserDailyPlayRow,
  getEdukiak,
  getGlobalStartDate,
  getLeaderboards,
  getQuizData,
  getRegisteredPlayers,
  getUserDailyPlays,
  saveGlobalStartDate
} from './services/korrikaApi';

const STORAGE_KEY = 'korrika_quiz_progress_v6';
const SIMULATION_STORAGE_KEY = 'korrika_simulation_mode';
const QUIZ_CACHE_KEY = 'korrika_quiz_data_v1';
const EDUKIAK_CACHE_KEY = 'korrika_edukiak_v1';
const PLAYERS_CACHE_KEY = 'korrika_registered_players_v1';
const START_DATE_CACHE_KEY = 'korrika_start_date_v1';
const GLOBAL_CONFIG_TABLE = 'korrika_app_config';
const START_DATE_CONFIG_KEY = 'challenge_start_date';
const DAYS_COUNT = 11;
const QUESTIONS_PER_DAY = 12;
const SECONDS_PER_QUESTION = 20;
const DEFAULT_CHALLENGE_START_DATE = '2026-02-14';
const ADMIN_USERS = ['admin', 'k_admin'];
const DAY_OPTIONS = Array.from({ length: DAYS_COUNT }, (_, idx) => idx);
const QUIZ_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const EDUKIAK_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const PLAYERS_CACHE_TTL_MS = 1000 * 60 * 10;
const START_DATE_CACHE_TTL_MS = 1000 * 60 * 5;
const PROFILING_DEMO_QUIZ_DATA: QuizData[] = [
  {
    capitulo: 'Euskara',
    preguntas: [
      {
        id: 1001,
        pregunta: 'Euskara zein hizkuntza familiatakoa da?',
        respuesta_correcta: 'b',
        opciones: {
          a: 'Erromantzea',
          b: 'Isolatua',
          c: 'Germaniarra',
          d: 'Eslaviarra'
        }
      },
      {
        id: 1002,
        pregunta: 'Zein da "eskerrik asko" gaztelaniaz?',
        respuesta_correcta: 'a',
        opciones: {
          a: 'gracias',
          b: 'adios',
          c: 'hola',
          d: 'perdon'
        }
      }
    ]
  },
  {
    capitulo: 'Korrika',
    preguntas: [
      {
        id: 1003,
        pregunta: 'Korrikaren helburu nagusia zein da?',
        respuesta_correcta: 'c',
        opciones: {
          a: 'Turismoa',
          b: 'Kirol txapelketa',
          c: 'Euskara sustatzea',
          d: 'Ibilgailu lasterketa'
        }
      },
      {
        id: 1004,
        pregunta: 'Korrika AEKrekin lotuta dago?',
        respuesta_correcta: 'd',
        opciones: {
          a: 'Ez, inoiz ez',
          b: 'Bakarrik udan',
          c: 'Soilik online',
          d: 'Bai, guztiz lotuta'
        }
      }
    ]
  },
  {
    capitulo: 'Historia',
    preguntas: [
      {
        id: 1005,
        pregunta: 'Euskal Herria Europan dago?',
        respuesta_correcta: 'a',
        opciones: {
          a: 'Bai',
          b: 'Ez',
          c: 'Batzuetan',
          d: 'Kontinenterik gabe'
        }
      },
      {
        id: 1006,
        pregunta: 'Nafarroa Euskal Herriko lurralde bat da?',
        respuesta_correcta: 'b',
        opciones: {
          a: 'Ez',
          b: 'Bai',
          c: 'Bakarrik mapan',
          d: 'Ez dakit'
        }
      }
    ]
  },
  {
    capitulo: 'Kultura',
    preguntas: [
      {
        id: 1007,
        pregunta: 'Bertsolaritza ahozko tradizioa da?',
        respuesta_correcta: 'c',
        opciones: {
          a: 'Ez, idatzia da',
          b: 'Musika klasikoa da',
          c: 'Bai, ahozkoa da',
          d: 'Soilik zineman'
        }
      },
      {
        id: 1008,
        pregunta: 'Trikitixa zer da?',
        respuesta_correcta: 'd',
        opciones: {
          a: 'Jantzi bat',
          b: 'Mendi bat',
          c: 'Liburu bat',
          d: 'Musika tresna eta estiloa'
        }
      }
    ]
  },
  {
    capitulo: 'Geografia',
    preguntas: [
      {
        id: 1009,
        pregunta: 'Bilbo Bizkaian dago?',
        respuesta_correcta: 'a',
        opciones: {
          a: 'Bai',
          b: 'Ez',
          c: 'Arabako hiriburua da',
          d: 'Nafarroan dago'
        }
      },
      {
        id: 1010,
        pregunta: 'Donostia itsaso ondoan dago?',
        respuesta_correcta: 'b',
        opciones: {
          a: 'Ez',
          b: 'Bai',
          c: 'Basamortuan',
          d: 'Mendirik gabe'
        }
      }
    ]
  },
  {
    capitulo: 'Gizartea',
    preguntas: [
      {
        id: 1011,
        pregunta: 'Egunerokoan euskara erabiltzea garrantzitsua da?',
        respuesta_correcta: 'c',
        opciones: {
          a: 'Ez du eraginik',
          b: 'Bakarrik eskolan',
          c: 'Bai, biziberritzeko giltza da',
          d: 'Soilik jaietan'
        }
      },
      {
        id: 1012,
        pregunta: 'Hizkuntza bat erabiltzen ez bada, zer gertatzen da?',
        respuesta_correcta: 'd',
        opciones: {
          a: 'Automatikoki indartzen da',
          b: 'Ez da ezer gertatzen',
          c: 'Berez berritzen da',
          d: 'Ahuldu edo gal daiteke'
        }
      }
    ]
  }
];
const PROFILING_DEMO_EDUKIAK: KorrikaEdukia[] = [
  {
    day: 1,
    title: 'Profilatzeko saio automatikoa',
    content: 'Eduki honek apparen errendimendua neurtzeko pantailak automatikoki zeharkatzen ditu.'
  }
];

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

type LeaderboardView = 'DAILY' | 'GENERAL';

type ProfileStats = {
  commits: number;
  totalActualDuration: number;
  maxActualDuration: number;
};

type ProfileRow = {
  id: string;
  commits: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
};

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const pickRandomItems = <T,>(items: T[], count: number) => {
  if (count <= 0 || items.length === 0) return [];

  const copy = [...items];
  const limit = Math.min(count, copy.length);
  for (let i = 0; i < limit; i += 1) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, limit);
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [quizData, setQuizData] = useState<QuizData[]>([]);
  const leaderboardsRequestRef = useRef<Promise<void> | null>(null);
  const userDailyPlaysRequestRef = useRef<Map<string, Promise<void>>>(new Map());
  const leaderboardsFetchedAtRef = useRef(0);
  const userDailyPlaysFetchedAtRef = useRef<Map<string, number>>(new Map());
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [gameState, setGameState] = useState<GameState>(GameState.AUTH);
  const [playMode, setPlayMode] = useState<PlayMode>('DAILY');
  const [dayIndex, setDayIndex] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [progress, setProgress] = useState<DailyProgress[]>([]);
  const [supervisorCategory, setSupervisorCategory] = useState<string>('GUZTIAK');
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [leaderboardRows, setLeaderboardRows] = useState<GameResultRow[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [leaderboardView, setLeaderboardView] = useState<LeaderboardView>('DAILY');
  const [selectedDailyLeaderboardDay, setSelectedDailyLeaderboardDay] = useState<number>(0);
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
  const [dailyPlayLockMessage, setDailyPlayLockMessage] = useState<string | null>(null);
  const [validatingDailyStart, setValidatingDailyStart] = useState(false);
  const [userDailyPlays, setUserDailyPlays] = useState<UserDailyPlayRow[]>([]);
  const [profileRows, setProfileRows] = useState<ProfileRow[]>([]);
  const profileStatsRef = useRef<Map<string, ProfileStats>>(new Map());
  const autoplayStartedRef = useRef(false);
  const autoplayQuestionRef = useRef<number | null>(null);
  const profilingEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('profiling') === '1';
  }, []);
  const profilingDemoEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('profilingDemo') === '1';
  }, []);
  const profilingAutoplayEnabled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autoplay') === '1';
  }, []);
  const profilingAutomationEnabled = profilingEnabled && profilingDemoEnabled && profilingAutoplayEnabled;

  // Multiplayer State
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [tempPlayerNames, setTempPlayerNames] = useState<string[]>(['Jokalari 1', 'Jokalari 2']);

  // --- SUPABASE DATA FETCHING ---

  const fetchRegisteredPlayers = async (force = false) => {
    if (!force) {
      const cachedPlayers = readLocalCache<string[]>(PLAYERS_CACHE_KEY, PLAYERS_CACHE_TTL_MS);
      if (cachedPlayers) {
        setRegisteredPlayers(cachedPlayers);
        return;
      }
    }

    try {
      const names = await getRegisteredPlayers();
      setRegisteredPlayers(names);
      if (names.length > 0) {
        writeLocalCache(PLAYERS_CACHE_KEY, names);
      } else {
        removeLocalCache(PLAYERS_CACHE_KEY);
      }
    } catch {
      setRegisteredPlayers([]);
      removeLocalCache(PLAYERS_CACHE_KEY);
    }
  };

  const fetchLeaderboards = useCallback(async (force = false) => {
    if (!force && Date.now() - leaderboardsFetchedAtRef.current < 30000) return;
    if (leaderboardsRequestRef.current) return leaderboardsRequestRef.current;

    const request = (async () => {
      try {
        setLoadingRanking(true);
        const rows = await getLeaderboards();
        setLeaderboardRows(rows);
        leaderboardsFetchedAtRef.current = Date.now();
      } catch (err) {
        console.error('Error fetching leaderboards:', err);
        setLeaderboardRows([]);
      } finally {
        setLoadingRanking(false);
      }
    })();

    leaderboardsRequestRef.current = request;
    try {
      await request;
    } finally {
      leaderboardsRequestRef.current = null;
    }
  }, []);

  const fetchUserDailyPlays = useCallback(async (userIdParam?: string, force = false) => {
    const targetUserId = userIdParam ?? user?.id;
    if (!targetUserId) {
      setUserDailyPlays([]);
      return;
    }

    const lastFetchTs = userDailyPlaysFetchedAtRef.current.get(targetUserId) ?? 0;
    if (!force && Date.now() - lastFetchTs < 30000) return;

    const existingRequest = userDailyPlaysRequestRef.current.get(targetUserId);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      try {
        const rows = await getUserDailyPlays(targetUserId, DAYS_COUNT);
        setUserDailyPlays(rows);
        userDailyPlaysFetchedAtRef.current.set(targetUserId, Date.now());
      } catch (err) {
        console.error('Error fetching user daily plays:', err);
        setUserDailyPlays([]);
      }
    })();

    userDailyPlaysRequestRef.current.set(targetUserId, request);
    try {
      await request;
    } finally {
      userDailyPlaysRequestRef.current.delete(targetUserId);
    }
  }, [user?.id]);

  const fetchEdukiak = async (force = false) => {
    if (!force) {
      const cachedEdukiak = readLocalCache<KorrikaEdukia[]>(EDUKIAK_CACHE_KEY, EDUKIAK_CACHE_TTL_MS);
      if (cachedEdukiak) {
        setEdukiak(cachedEdukiak);
        setLoadingEdukiak(false);
        return;
      }
    }

    try {
      setLoadingEdukiak(true);
      const mapped = await getEdukiak(DAYS_COUNT);
      setEdukiak(mapped);
      writeLocalCache(EDUKIAK_CACHE_KEY, mapped);
    } catch (err) {
      console.error('Error fetching korrika_edukiak:', err);
      setEdukiak([]);
      removeLocalCache(EDUKIAK_CACHE_KEY);
    } finally {
      setLoadingEdukiak(false);
    }
  };

  const fetchQuizData = async (force = false) => {
    if (!force) {
      const cachedQuizData = readLocalCache<QuizData[]>(QUIZ_CACHE_KEY, QUIZ_CACHE_TTL_MS);
      if (cachedQuizData) {
        setQuizData(cachedQuizData);
        setLoadingData(false);
        return;
      }
    }

    try {
      setLoadingData(true);
      const mappedData = await getQuizData();
      setQuizData(mappedData);
      writeLocalCache(QUIZ_CACHE_KEY, mappedData);
    } catch (err) {
      console.error("Error fetching quiz data:", err);
      setQuizData([]);
      removeLocalCache(QUIZ_CACHE_KEY);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchGlobalStartDate = async (force = false) => {
    if (!force) {
      const cachedStartDate = readLocalCache<string>(START_DATE_CACHE_KEY, START_DATE_CACHE_TTL_MS);
      if (cachedStartDate && /^\d{4}-\d{2}-\d{2}$/.test(cachedStartDate)) {
        setChallengeStartDate(cachedStartDate);
        setAdminStartDateInput(cachedStartDate);
        return;
      }
    }

    try {
      const rawValue = await getGlobalStartDate(GLOBAL_CONFIG_TABLE, START_DATE_CONFIG_KEY);
      if (rawValue) {
        setChallengeStartDate(rawValue);
        setAdminStartDateInput(rawValue);
        writeLocalCache(START_DATE_CACHE_KEY, rawValue);
      } else {
        setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
        setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
        removeLocalCache(START_DATE_CACHE_KEY);
      }
    } catch (err) {
      console.error('Error fetching global start date:', err);
      setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
      setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
      removeLocalCache(START_DATE_CACHE_KEY);
    }
  };

  useEffect(() => {
    if (gameState !== GameState.HOME) return;
    if (sequentialSimulationActive) return;

    const startTs = new Date(`${challengeStartDate}T00:00:00`).getTime();
    if (Date.now() >= startTs) return;

    setNowTs(Date.now());
    const intervalId = window.setInterval(() => {
      const currentTs = Date.now();
      setNowTs(currentTs);
      if (currentTs >= startTs) {
        clearInterval(intervalId);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [gameState, sequentialSimulationActive, challengeStartDate]);

  useEffect(() => {
    localStorage.setItem(SIMULATION_STORAGE_KEY, simulationEnabled ? '1' : '0');
  }, [simulationEnabled]);

  useEffect(() => {
    if (profilingDemoEnabled) {
      const todayKey = getLocalDateKey();
      setUser({ id: 'profiling-admin', email: 'admin@korrika.app' } as User);
      setLoadingAuth(false);
      setLoadingData(false);
      setGameState(GameState.HOME);
      setQuizData(PROFILING_DEMO_QUIZ_DATA);
      setLeaderboardRows([]);
      setUserDailyPlays([]);
      setRegisteredPlayers(['ADMIN', 'JOKALARI DEMO']);
      setEdukiak(PROFILING_DEMO_EDUKIAK);
      setLoadingEdukiak(false);
      setChallengeStartDate(todayKey);
      setAdminStartDateInput(todayKey);
      setSimulationEnabled(true);
      setProgress([]);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setGameState(GameState.HOME);
          void fetchUserDailyPlays(session.user.id);
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setUser(session?.user ?? null);
      if (session?.user) {
        setGameState(GameState.HOME);
        setDailyPlayLockMessage(null);
        void fetchGlobalStartDate();
        void fetchRegisteredPlayers();
        void fetchLeaderboards();
        void fetchUserDailyPlays(session.user.id);
      } else {
        setGameState(GameState.AUTH);
        userDailyPlaysRequestRef.current.clear();
        userDailyPlaysFetchedAtRef.current.clear();
        leaderboardsFetchedAtRef.current = 0;
        setDailyPlayLockMessage(null);
        setValidatingDailyStart(false);
        setUserDailyPlays([]);
        setLeaderboardRows([]);
      }
    });

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setProgress(parsed as DailyProgress[]);
        }
      } catch (err) {
        console.error('Error loading local progress:', err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    return () => subscription.unsubscribe();
  }, [profilingDemoEnabled]);

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
        setDailyPlayLockMessage(null);
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
    leaderboardsRequestRef.current = null;
    leaderboardsFetchedAtRef.current = 0;
    userDailyPlaysRequestRef.current.clear();
    userDailyPlaysFetchedAtRef.current.clear();
    setUser(null);
    setGameState(GameState.AUTH);
    setPlayers([]);
    setDailyPlayLockMessage(null);
    setValidatingDailyStart(false);
    setUserDailyPlays([]);
    setLeaderboardRows([]);
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

  const currentChallengeDayIndex = useMemo(() => {
    const today = simulationToday ? new Date(simulationToday) : new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${challengeStartDate}T00:00:00`);
    const elapsedDays = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (elapsedDays < 0) return 0;
    if (elapsedDays >= DAYS_COUNT) return DAYS_COUNT - 1;
    return elapsedDays;
  }, [challengeStartDate, simulationToday]);

  useEffect(() => {
    setSelectedDailyLeaderboardDay(currentChallengeDayIndex);
  }, [currentChallengeDayIndex]);

  const effectiveDailyProgress = useMemo(() => {
    if (sequentialSimulationActive) return sequentialSimulationProgress;

    const merged = [...progress];
    userDailyPlays.forEach((play) => {
      const existing = merged[play.day_index];
      if (existing?.completed) return;
      merged[play.day_index] = {
        dayIndex: play.day_index,
        score: existing?.score ?? 0,
        completed: true,
        date: play.played_at,
        answers: existing?.answers ?? [],
        players: existing?.players
      };
    });
    return merged;
  }, [progress, sequentialSimulationActive, sequentialSimulationProgress, userDailyPlays]);

  const nextAvailableDay = useMemo(() => {
    const today = simulationToday ? new Date(simulationToday) : new Date();
    today.setHours(0, 0, 0, 0);
    const sourceProgress = effectiveDailyProgress;

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
  }, [effectiveDailyProgress, challengeStartDate, simulationToday]);

  const generateQuestions = useCallback((mode: PlayMode, idx: number) => {
    if (quizData.length === 0) return [];
    
    if (mode === 'RANDOM') {
      const questions: Question[] = [];
      quizData.forEach((category: QuizData) => {
        const sampled = pickRandomItems<Question>(category.preguntas as Question[], 2);
        const picked = sampled.map((q: Question) => ({
          id: q.id,
          pregunta: q.pregunta,
          opciones: q.opciones,
          respuesta_correcta: q.respuesta_correcta,
          categoryName: category.capitulo
        }));
        questions.push(...picked);
      });
      return shuffle(questions);
    } else {
      const questions: Question[] = [];
      quizData.forEach((category: QuizData) => {
        // Seleccionamos las dos preguntas correspondientes al día actual
        const q1 = category.preguntas[idx * 2] as Question | undefined;
        const q2 = category.preguntas[idx * 2 + 1] as Question | undefined;
        if (q1) {
          questions.push({
            id: q1.id,
            pregunta: q1.pregunta,
            opciones: q1.opciones,
            respuesta_correcta: q1.respuesta_correcta,
            categoryName: category.capitulo
          });
        }
        if (q2) {
          questions.push({
            id: q2.id,
            pregunta: q2.pregunta,
            opciones: q2.opciones,
            respuesta_correcta: q2.respuesta_correcta,
            categoryName: category.capitulo
          });
        }
      });
      return questions.slice(0, QUESTIONS_PER_DAY);
    }
  }, [quizData]);

  const hasPlayedDailyOnServer = useCallback(async (targetDayIndex: number) => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('game_results')
      .select('day_index')
      .eq('user_id', user.id)
      .eq('play_mode', 'DAILY')
      .eq('day_index', targetDayIndex)
      .limit(1);

    if (error) {
      console.error('Error checking daily play lock:', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  }, [user]);

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
    } else {
      if (currentPlayerIdx < players.length - 1) {
        setGameState(GameState.TURN_TRANSITION);
      } else {
        void finishGame(updatedPlayers);
      }
    }
  }, [currentQuestionIdx, activeQuestions, players, currentPlayerIdx]);

  const handleCountdownComplete = useCallback(() => {
    setGameState(GameState.QUIZ);
  }, []);

  const persistGameResults = async (finalPlayers: Player[]) => {
    if (!user) return;

    if (playMode === 'DAILY') {
      const alreadyPlayed = await hasPlayedDailyOnServer(dayIndex);
      if (alreadyPlayed) {
        setDailyPlayLockMessage(`${dayIndex + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
        return;
      }
    }

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
      if ((error as any).code === '23505' && playMode === 'DAILY') {
        setDailyPlayLockMessage(`${dayIndex + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
      }
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
      await fetchLeaderboards(true);
      await fetchUserDailyPlays(undefined, true);
    }
    
    setReviewDayIndex(null);
    if (sequentialSimulationActive) {
      setSequentialSimulationDay((prev) => Math.min(prev + 1, DAYS_COUNT));
      setGameState(GameState.HOME);
      return;
    }
    setGameState(isMulti ? GameState.RANKING : GameState.RESULTS);
  };

  const initGame = useCallback(async (mode: 'SOLO' | 'COMP', type: PlayMode) => {
    const idx = type === 'DAILY' ? nextAvailableDay : 0;
    if (type === 'DAILY' && idx < 0) return;
    
    setDailyPlayLockMessage(null);

    if (type === 'DAILY' && !isSimulationRun && !sequentialSimulationActive) {
      setValidatingDailyStart(true);
      try {
        const alreadyPlayed = await hasPlayedDailyOnServer(idx);
        if (alreadyPlayed) {
          setDailyPlayLockMessage(`${idx + 1}. eguna dagoeneko jokatu duzu. Kontu bakoitzak saio bakarra jokatu dezake egunean.`);
          await fetchLeaderboards(true);
          await fetchUserDailyPlays(undefined, true);
          return;
        }
      } finally {
        setValidatingDailyStart(false);
      }
    }

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
      setGameState(GameState.COUNTDOWN);
    } else {
      setGameState(GameState.PLAYER_SETUP);
    }
  }, [
    nextAvailableDay,
    isSimulationRun,
    sequentialSimulationActive,
    hasPlayedDailyOnServer,
    fetchLeaderboards,
    fetchUserDailyPlays,
    generateQuestions,
    user?.email
  ]);

  const saveChallengeStartDate = useCallback(async () => {
    const adminKey = (user?.email?.split('@')[0] || '').toLowerCase();
    if (!ADMIN_USERS.includes(adminKey)) return;
    const value = adminStartDateInput.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    try {
      setSavingAdminConfig(true);
      await saveGlobalStartDate(GLOBAL_CONFIG_TABLE, START_DATE_CONFIG_KEY, value);
      setChallengeStartDate(value);
      writeLocalCache(START_DATE_CACHE_KEY, value);
    } catch (err) {
      console.error('Error saving global start date:', err);
    } finally {
      setSavingAdminConfig(false);
    }
  }, [adminStartDateInput, user?.email]);

  const resetChallengeStartDate = useCallback(async () => {
    const adminKey = (user?.email?.split('@')[0] || '').toLowerCase();
    if (!ADMIN_USERS.includes(adminKey)) return;
    try {
      setSavingAdminConfig(true);
      await saveGlobalStartDate(
        GLOBAL_CONFIG_TABLE,
        START_DATE_CONFIG_KEY,
        DEFAULT_CHALLENGE_START_DATE
      );
      setChallengeStartDate(DEFAULT_CHALLENGE_START_DATE);
      setAdminStartDateInput(DEFAULT_CHALLENGE_START_DATE);
      removeLocalCache(START_DATE_CACHE_KEY);
    } catch (err) {
      console.error('Error resetting global start date:', err);
    } finally {
      setSavingAdminConfig(false);
    }
  }, [user?.email]);

  const startSimulationDay = useCallback((idx: number) => {
    const adminKey = (user?.email?.split('@')[0] || '').toLowerCase();
    if (!ADMIN_USERS.includes(adminKey)) return;
    const clampedIdx = Math.min(Math.max(idx, 0), DAYS_COUNT - 1);
    const qs = generateQuestions('DAILY', clampedIdx);
    if (qs.length === 0) return;

    setReviewDayIndex(null);
    setIsSimulationRun(true);
    setPlayMode('DAILY');
    setDayIndex(clampedIdx);
    setActiveQuestions(qs);

    const simPlayerName = (user?.email?.split('@')[0] || 'SIMULAZIOA').toUpperCase();
    setPlayers([{ name: simPlayerName, score: 0, answers: [] }]);
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setGameState(GameState.COUNTDOWN);
  }, [generateQuestions, user?.email]);

  const startSequentialSimulation = useCallback(() => {
    const adminKey = (user?.email?.split('@')[0] || '').toLowerCase();
    if (!ADMIN_USERS.includes(adminKey)) return;
    setSequentialSimulationActive(true);
    setSequentialSimulationDay(0);
    setSequentialSimulationProgress([]);
    setIsSimulationRun(false);
    setReviewDayIndex(null);
    setGameState(GameState.HOME);
  }, [user?.email]);

  const stopSequentialSimulation = useCallback(() => {
    const adminKey = (user?.email?.split('@')[0] || '').toLowerCase();
    if (!ADMIN_USERS.includes(adminKey)) return;
    setSequentialSimulationActive(false);
    setSequentialSimulationDay(0);
    setSequentialSimulationProgress([]);
    setIsSimulationRun(false);
    setReviewDayIndex(null);
  }, [user?.email]);

  const getResultFeedback = (score: number, totalQuestions: number) => {
    const total = totalQuestions || QUESTIONS_PER_DAY;
    if (score === total) return { text: "Zuzenean lekukoa hartzera!", emoji: '\u{1F3C6}' };
    if (score >= total * 0.8) return { text: "Oso ondo! Bihar gehiago.", emoji: '\u{1F3C3}' };
    if (score >= total * 0.5) return { text: "Ertaina. Jarraitu trebatzen.", emoji: '\u{1F91D}' };
    return { text: "Bihar saiatu berriz, mesedez.", emoji: '\u{1F622}' };
  };

  const filteredSupervisorData = useMemo(() => {
    if (supervisorCategory === 'GUZTIAK') return quizData;
    return quizData.filter(cat => cat.capitulo === supervisorCategory);
  }, [supervisorCategory, quizData]);

  const userDisplayName = (user?.email?.split('@')[0] || 'Gonbidatua').toUpperCase();
  const isAdmin = ADMIN_USERS.includes((user?.email?.split('@')[0] || '').toLowerCase());
  const rankingBasePlayers = useMemo(() => {
    const list = user?.id ? [...registeredPlayers, userDisplayName] : registeredPlayers;
    return [...new Set(list.map((name) => name.trim()).filter(Boolean))];
  }, [registeredPlayers, user?.id, userDisplayName]);
  const shouldComputeHomeRankings = gameState === GameState.HOME;
  const generalRanking = useMemo(() => {
    if (!shouldComputeHomeRankings) return [];
    return buildRanking(leaderboardRows, rankingBasePlayers);
  }, [shouldComputeHomeRankings, leaderboardRows, rankingBasePlayers]);
  const dailyRanking = useMemo(() => {
    if (!shouldComputeHomeRankings) return [];
    const dailyRows = leaderboardRows.filter(
      (row) => Number.isInteger(row.day_index) && row.day_index === selectedDailyLeaderboardDay
    );
    return buildRanking(dailyRows);
  }, [shouldComputeHomeRankings, leaderboardRows, selectedDailyLeaderboardDay]);
  const activeRanking = leaderboardView === 'DAILY' ? dailyRanking : generalRanking;
  const showDailyPlayButton = nextAvailableDay >= 0 || nextAvailableDay === -4 || nextAvailableDay === -1 || nextAvailableDay === -2;
  const dailyPlayButtonDisabled = validatingDailyStart || nextAvailableDay < 0;
  const challengeStartTs = useMemo(() => new Date(`${challengeStartDate}T00:00:00`).getTime(), [challengeStartDate]);
  const effectiveNowTs = simulationToday ? simulationToday.getTime() : nowTs;
  const timeUntilStart = Math.max(0, challengeStartTs - effectiveNowTs);
  const activeEdukia = useMemo(() => {
    if (edukiak.length === 0) return null;
    const targetDay = effectiveNowTs < challengeStartTs ? 0 : Math.min(currentChallengeDayIndex + 1, DAYS_COUNT);
    return edukiak.find((item) => item.day === targetDay) ?? null;
  }, [edukiak, challengeStartTs, currentChallengeDayIndex, effectiveNowTs]);
  const completedDayIndexes = useMemo(
    () => effectiveDailyProgress.map((day, idx) => (day?.completed ? idx : -1)).filter((idx) => idx >= 0),
    [effectiveDailyProgress]
  );
  const reviewedDay = reviewDayIndex !== null ? effectiveDailyProgress[reviewDayIndex] : undefined;
  const resultsAnswers = reviewedDay?.answers ?? (players[0]?.answers ?? []);
  const resultsScore = reviewedDay?.score ?? (players[0]?.score ?? 0);
  const resultsTotal = Math.max(resultsAnswers.length, 1);
  const resultsFeedback = useMemo(
    () => getResultFeedback(resultsScore, resultsTotal),
    [resultsScore, resultsTotal]
  );
  const sortedPlayersByScore = useMemo(
    () => [...players].sort((a, b) => b.score - a.score),
    [players]
  );
  const handleUsernameChange = useCallback((value: string) => {
    setLoginForm((prev) => ({ ...prev, username: value }));
  }, []);
  const handlePasswordChange = useCallback((value: string) => {
    setLoginForm((prev) => ({ ...prev, password: value }));
  }, []);
  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);
  const handleSaveChallengeStartDate = useCallback(() => {
    void saveChallengeStartDate();
  }, [saveChallengeStartDate]);
  const handleResetChallengeStartDate = useCallback(() => {
    void resetChallengeStartDate();
  }, [resetChallengeStartDate]);
  const handleToggleSimulation = useCallback(() => {
    setSimulationEnabled((prev) => !prev);
  }, []);
  const handleStartDailyPlay = useCallback(() => {
    void initGame('SOLO', 'DAILY');
  }, [initGame]);
  const handleReviewDay = useCallback((idx: number) => {
    setReviewDayIndex(idx);
    setGameState(GameState.RESULTS);
  }, []);
  const handlePlayerNameChange = useCallback((index: number, value: string) => {
    setTempPlayerNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);
  const handleRemovePlayer = useCallback((index: number) => {
    setTempPlayerNames((prev) => prev.filter((_, idx) => idx !== index));
  }, []);
  const handleAddPlayer = useCallback(() => {
    setTempPlayerNames((prev) => [...prev, `Jokalari ${prev.length + 1}`]);
  }, []);
  const handleCancelPlayerSetup = useCallback(() => {
    setGameState(GameState.HOME);
  }, []);
  const handleStartPlayerSetup = useCallback(() => {
    const pList = tempPlayerNames.map((name) => ({
      name: name.trim() || 'Izengabea',
      score: 0,
      answers: []
    }));
    setPlayers(pList);
    setCurrentPlayerIdx(0);
    setCurrentQuestionIdx(0);
    setGameState(GameState.COUNTDOWN);
  }, [tempPlayerNames]);
  const handleTurnTransitionReady = useCallback(() => {
    setCurrentPlayerIdx((prev) => prev + 1);
    setCurrentQuestionIdx(0);
    setGameState(GameState.COUNTDOWN);
  }, []);
  const handleResultsBack = useCallback(() => {
    setReviewDayIndex(null);
    setIsSimulationRun(false);
    setGameState(GameState.HOME);
  }, []);
  const handleGoHome = useCallback(() => {
    setGameState(GameState.HOME);
  }, []);
  useEffect(() => {
    if (!profilingAutomationEnabled) return;
    if (autoplayStartedRef.current) return;
    if (gameState !== GameState.HOME) return;
    if (quizData.length === 0) return;

    autoplayStartedRef.current = true;
    startSimulationDay(0);
  }, [profilingAutomationEnabled, gameState, quizData.length, startSimulationDay]);

  useEffect(() => {
    if (!profilingAutomationEnabled) return;

    if (gameState === GameState.COUNTDOWN) {
      const timeoutId = window.setTimeout(() => {
        handleCountdownComplete();
      }, 120);
      return () => window.clearTimeout(timeoutId);
    }

    if (gameState === GameState.QUIZ && activeQuestions.length > 0) {
      const currentQuestion = activeQuestions[currentQuestionIdx];
      if (!currentQuestion) return;
      if (autoplayQuestionRef.current === currentQuestion.id) return;

      autoplayQuestionRef.current = currentQuestion.id;
      const optionKey = Object.keys(currentQuestion.opciones)[0] ?? null;
      const timeoutId = window.setTimeout(() => {
        handleNextQuestion(optionKey);
      }, 140);
      return () => window.clearTimeout(timeoutId);
    }

    if (gameState === GameState.RESULTS || gameState === GameState.RANKING) {
      const timeoutId = window.setTimeout(() => {
        setReviewDayIndex(null);
        setIsSimulationRun(false);
        setGameState(GameState.HOME);
      }, 280);
      return () => window.clearTimeout(timeoutId);
    }
  }, [
    profilingAutomationEnabled,
    gameState,
    activeQuestions,
    currentQuestionIdx,
    handleCountdownComplete,
    handleNextQuestion
  ]);

  useEffect(() => {
    if (!profilingEnabled || typeof window === 'undefined') return;
    (window as Window & { __korrikaProfileRows?: ProfileRow[] }).__korrikaProfileRows = profileRows;
  }, [profilingEnabled, profileRows]);

  const handleProfilerRender = useCallback<React.ProfilerOnRenderCallback>(
    (id, _phase, actualDuration) => {
      if (!profilingEnabled) return;

      const existing = profileStatsRef.current.get(id) ?? {
        commits: 0,
        totalActualDuration: 0,
        maxActualDuration: 0
      };
      existing.commits += 1;
      existing.totalActualDuration += actualDuration;
      existing.maxActualDuration = Math.max(existing.maxActualDuration, actualDuration);
      profileStatsRef.current.set(id, existing);
    },
    [profilingEnabled]
  );
  useEffect(() => {
    if (!profilingEnabled) {
      setProfileRows([]);
      profileStatsRef.current.clear();
      return;
    }

    const intervalId = window.setInterval(() => {
      const rows = [...profileStatsRef.current.entries()]
        .map(([id, stats]) => ({
          id,
          commits: stats.commits,
          totalMs: Number(stats.totalActualDuration.toFixed(4)),
          avgMs: Number((stats.totalActualDuration / Math.max(stats.commits, 1)).toFixed(4)),
          maxMs: Number(stats.maxActualDuration.toFixed(4))
        }))
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, 3);
      setProfileRows((prev) => {
        if (
          prev.length === rows.length &&
          prev.every((row, idx) => {
            const candidate = rows[idx];
            return (
              row.id === candidate.id &&
              row.commits === candidate.commits &&
              row.totalMs === candidate.totalMs &&
              row.avgMs === candidate.avgMs &&
              row.maxMs === candidate.maxMs
            );
          })
        ) {
          return prev;
        }
        return rows;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [profilingEnabled]);
  const renderWithProfiler = useCallback(
    (id: string, node: React.ReactElement) => {
      if (!profilingEnabled) return node;
      return (
        <React.Profiler id={id} onRender={handleProfilerRender}>
          {node}
        </React.Profiler>
      );
    },
    [profilingEnabled, handleProfilerRender]
  );

  if ((loadingAuth || loadingData) && (gameState === GameState.AUTH || gameState === GameState.HOME)) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gray-50 flex-col gap-4 px-4">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-pink-500 border-t-transparent"></div>
        <p className="text-[11px] sm:text-xs font-black uppercase text-gray-400 tracking-widest animate-pulse">Datuak kargatzen...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col bg-gray-50 text-gray-800 safe-pt safe-pb safe-pl safe-pr ${gameState !== GameState.AUTH ? 'overflow-x-hidden overflow-y-hidden' : 'overflow-auto'}`}>
      <header className="w-full korrika-bg-gradient px-3 py-3 sm:px-4 sm:py-4 text-white shadow-md flex flex-col items-center flex-shrink-0 z-10">
        {user && gameState !== GameState.AUTH && (
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <button
              onClick={handleLogout}
              className="rounded-full bg-white/20 px-3 py-2 sm:px-3.5 text-[10px] font-black uppercase tracking-wide hover:bg-white/30 transition-colors whitespace-nowrap"
            >
              Irten
            </button>
            <div className="rounded-full bg-white/20 px-3 py-2 sm:px-3.5 text-[10px] font-black uppercase tracking-wide max-w-[60%] truncate text-center">
              {userDisplayName}
            </div>
          </div>
        )}
        <h1 className="text-[clamp(1.3rem,5vw,2.1rem)] font-black tracking-tight uppercase italic flex items-center gap-2">
          <span aria-hidden>{'\u{1F3C3}'}</span> KORRIKA
        </h1>
        <p className="text-[10px] sm:text-[11px] font-bold opacity-80 uppercase tracking-[0.2em] text-center">
          {DAYS_COUNT} EGUNEKO ERRONKA
        </p>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 flex flex-col overflow-hidden relative">
        
        {gameState === GameState.AUTH && (
          renderWithProfiler(
            'AuthScreen',
            <AuthScreen
              username={loginForm.username}
              password={loginForm.password}
              showPassword={showPassword}
              loginError={loginError}
              loadingAuth={loadingAuth}
              onSubmit={handleLogin}
              onUsernameChange={handleUsernameChange}
              onPasswordChange={handlePasswordChange}
              onTogglePassword={handleTogglePassword}
            />
          )
        )}

        {gameState === GameState.HOME && (
          renderWithProfiler(
            'HomeScreen',
            <HomeScreen
              loadingEdukiak={loadingEdukiak}
              activeEdukia={activeEdukia}
              isAdmin={isAdmin}
              sequentialSimulationActive={sequentialSimulationActive}
              sequentialSimulationDay={sequentialSimulationDay}
              daysCount={DAYS_COUNT}
              onStartSequentialSimulation={startSequentialSimulation}
              onStopSequentialSimulation={stopSequentialSimulation}
              adminStartDateInput={adminStartDateInput}
              onAdminStartDateInputChange={setAdminStartDateInput}
              onSaveChallengeStartDate={handleSaveChallengeStartDate}
              onResetChallengeStartDate={handleResetChallengeStartDate}
              savingAdminConfig={savingAdminConfig}
              simulationEnabled={simulationEnabled}
              onToggleSimulation={handleToggleSimulation}
              simulationDayIndex={simulationDayIndex}
              onSimulationDayIndexChange={setSimulationDayIndex}
              dayOptions={DAY_OPTIONS}
              onStartSimulationDay={startSimulationDay}
              showDailyPlayButton={showDailyPlayButton}
              onStartDailyPlay={handleStartDailyPlay}
              dailyPlayButtonDisabled={dailyPlayButtonDisabled}
              validatingDailyStart={validatingDailyStart}
              nextAvailableDay={nextAvailableDay}
              timeUntilStart={timeUntilStart}
              formatCountdown={formatCountdown}
              dailyPlayLockMessage={dailyPlayLockMessage}
              completedDayIndexes={completedDayIndexes}
              onReviewDay={handleReviewDay}
              loadingRanking={loadingRanking}
              leaderboardView={leaderboardView}
              onLeaderboardViewChange={setLeaderboardView}
              selectedDailyLeaderboardDay={selectedDailyLeaderboardDay}
              onSelectedDailyLeaderboardDayChange={setSelectedDailyLeaderboardDay}
              activeRanking={activeRanking}
            />
          )
        )}

        {gameState === GameState.PLAYER_SETUP && (
          renderWithProfiler(
            'PlayerSetupScreen',
            <PlayerSetupScreen
              tempPlayerNames={tempPlayerNames}
              onPlayerNameChange={handlePlayerNameChange}
              onRemovePlayer={handleRemovePlayer}
              onAddPlayer={handleAddPlayer}
              onCancel={handleCancelPlayerSetup}
              onStart={handleStartPlayerSetup}
            />
          )
        )}

        {gameState === GameState.COUNTDOWN && (
          renderWithProfiler(
            'CountdownScreen',
            <CountdownScreen
              playerName={players[currentPlayerIdx]?.name ?? 'Jokalaria'}
              onComplete={handleCountdownComplete}
            />
          )
        )}

        {gameState === GameState.QUIZ && activeQuestions.length > 0 && (
          renderWithProfiler(
            'QuizScreen',
            <QuizScreen
              playerName={players[currentPlayerIdx]?.name ?? 'Jokalaria'}
              question={activeQuestions[currentQuestionIdx]}
              questionIndex={currentQuestionIdx}
              totalQuestions={activeQuestions.length}
              onAnswer={handleNextQuestion}
              timerKey={`${currentPlayerIdx}-${currentQuestionIdx}`}
              secondsPerQuestion={SECONDS_PER_QUESTION}
            />
          )
        )}

        {gameState === GameState.TURN_TRANSITION && (
          renderWithProfiler(
            'TurnTransitionScreen',
            <TurnTransitionScreen
              playerName={currentPlayerIdx < players.length ? players[currentPlayerIdx].name : null}
              onReady={handleTurnTransitionReady}
            />
          )
        )}

        {gameState === GameState.RESULTS && (
          renderWithProfiler(
            'ResultsScreen',
            <ResultsScreen
              isSimulationRun={isSimulationRun}
              reviewDayIndex={reviewDayIndex}
              resultsFeedback={resultsFeedback}
              resultsScore={resultsScore}
              resultsTotal={resultsTotal}
              resultsAnswers={resultsAnswers}
              onBack={handleResultsBack}
            />
          )
        )}

        {gameState === GameState.RANKING && (
          renderWithProfiler(
            'RankingScreen',
            <RankingScreen
              sortedPlayersByScore={sortedPlayersByScore}
              onBack={handleGoHome}
            />
          )
        )}

        {gameState === GameState.SUPERVISOR && (
          renderWithProfiler(
            'SupervisorScreen',
            <SupervisorScreen
              supervisorCategory={supervisorCategory}
              quizData={quizData}
              filteredSupervisorData={filteredSupervisorData}
              onSelectCategory={setSupervisorCategory}
              onBack={handleGoHome}
            />
          )
        )}

      </main>

      <footer className="w-full py-3 sm:py-4 text-center opacity-40 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] bg-gray-50 px-2">
        AEK - KORRIKA
      </footer>
      {profilingEnabled && (
        <aside className="fixed right-2 bottom-2 z-50 w-[min(22rem,92vw)] rounded-2xl border border-gray-200 bg-white/95 shadow-xl backdrop-blur p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Profilagailua aktibo</p>
          <p className="text-[10px] font-bold text-gray-500 mt-1">3 errenderizazio garestienak (denbora metatua)</p>
          <div className="mt-2 space-y-1.5">
            {profileRows.length === 0 && (
              <p className="text-[10px] text-gray-400 font-bold">Daturik ez oraindik. Nabigatu aplikazioan.</p>
            )}
            {profileRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2">
                <p className="text-[10px] font-black text-gray-700 truncate">{row.id}</p>
                <p className="text-[10px] text-gray-500 font-bold">
                  eguneraketa: {row.commits} | guztira: {row.totalMs}ms | batez bestekoa: {row.avgMs}ms | gehienez: {row.maxMs}ms
                </p>
              </article>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
};

export default App;
