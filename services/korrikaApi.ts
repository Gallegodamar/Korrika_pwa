import { supabase } from '../supabase';
import { QuizData } from '../types';

export type GameResultRow = {
  player_name: string | null;
  correct_answers: number | null;
  played_at: string | null;
  day_index: number | null;
};

export type UserDailyPlayRow = {
  day_index: number;
  played_at: string;
};

export type KorrikaEdukia = {
  day: number;
  title: string;
  content: string;
};

type PlayersSource = {
  table: string;
  columns: string[];
};

const PLAYER_SOURCES: PlayersSource[] = [
  { table: 'korrika_jokalariak', columns: ['name', 'username', 'email', 'code'] },
  { table: 'players', columns: ['name', 'username', 'email'] },
  { table: 'profiles', columns: ['username', 'full_name', 'email'] },
  { table: 'usuarios', columns: ['nombre', 'username', 'email', 'codigo'] }
];

const normalizePlayerName = (row: Record<string, unknown>) => {
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
};

export const getRegisteredPlayers = async () => {
  for (const source of PLAYER_SOURCES) {
    try {
      const { data, error } = await supabase
        .from(source.table)
        .select(source.columns.join(','))
        .limit(1000);

      if (error) continue;

      const names = ((data ?? []) as unknown as Array<Record<string, unknown>>)
        .map(normalizePlayerName)
        .filter(Boolean);

      if (names.length > 0) {
        return [...new Set(names)];
      }
    } catch {
      // ignore and try next source
    }
  }

  return [];
};

export const getLeaderboards = async () => {
  const { data, error } = await supabase
    .from('game_results')
    .select('player_name, correct_answers, played_at, day_index')
    .order('played_at', { ascending: false })
    .limit(5000);

  if (error) throw error;
  return (data ?? []) as GameResultRow[];
};

export const getUserDailyPlays = async (userId: string, daysCount: number) => {
  const { data, error } = await supabase
    .from('game_results')
    .select('day_index, played_at')
    .eq('user_id', userId)
    .eq('play_mode', 'DAILY')
    .not('day_index', 'is', null)
    .order('played_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ day_index: number | null; played_at: string | null }>;
  const uniqueByDay = new Map<number, UserDailyPlayRow>();

  rows.forEach((row) => {
    if (!Number.isInteger(row.day_index) || !row.played_at) return;
    const dayIdx = row.day_index as number;
    if (dayIdx < 0 || dayIdx >= daysCount) return;
    if (!uniqueByDay.has(dayIdx)) {
      uniqueByDay.set(dayIdx, { day_index: dayIdx, played_at: row.played_at });
    }
  });

  return [...uniqueByDay.values()].sort((a, b) => a.day_index - b.day_index);
};

export const getEdukiak = async (daysCount: number) => {
  const { data, error } = await supabase.from('korrika_edukiak').select('*');
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => {
      const dayRaw = row['day'] ?? row['day_index'] ?? row['dia'] ?? row['eguna'];
      const titleRaw = row['title'] ?? row['titulo'] ?? row['izenburua'] ?? row['izenburua_eu'];
      const contentRaw = row['content'] ?? row['text'] ?? row['testua'] ?? row['edukia'] ?? row['body'];

      const day = Number(dayRaw);
      const title = String(titleRaw ?? `Eguna ${day}`);
      const content = String(contentRaw ?? '').trim();

      if (!Number.isFinite(day) || day < 0 || day > daysCount || !content) return null;
      return { day, title, content };
    })
    .filter((item): item is KorrikaEdukia => Boolean(item))
    .sort((a, b) => a.day - b.day);
};

export const getQuizData = async () => {
  const { data, error } = await supabase
    .from('chapters')
    .select(
      'id, name, questions:questions (id, legacy_id, question_text, correct_key, options:options (opt_key, opt_text))'
    );

  if (error) throw error;

  return ((data ?? []) as Array<Record<string, any>>).map((chapter) => ({
    capitulo: String(chapter.name ?? ''),
    preguntas: (chapter.questions ?? []).map((q: any) => {
      const sortedOptions = (q.options ?? []).sort((a: any, b: any) =>
        String(a.opt_key).localeCompare(String(b.opt_key))
      );

      return {
        id: q.id,
        pregunta: q.question_text,
        respuesta_correcta: q.correct_key,
        categoryName: chapter.name,
        opciones: sortedOptions.reduce((acc: Record<string, string>, opt: any) => {
          acc[opt.opt_key] = opt.opt_text;
          return acc;
        }, {})
      };
    })
  })) as QuizData[];
};

export const getGlobalStartDate = async (configTable: string, configKey: string) => {
  const { data, error } = await supabase
    .from(configTable)
    .select('config_value')
    .eq('config_key', configKey)
    .maybeSingle();

  if (error) throw error;

  const rawValue = String((data as { config_value?: string } | null)?.config_value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(rawValue) ? rawValue : null;
};

export const saveGlobalStartDate = async (configTable: string, configKey: string, value: string) => {
  const { error } = await supabase
    .from(configTable)
    .upsert(
      {
        config_key: configKey,
        config_value: value
      },
      { onConflict: 'config_key' }
    );

  if (error) throw error;
};
