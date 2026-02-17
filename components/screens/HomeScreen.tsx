import React from 'react';
import { KorrikaEdukia } from '../../services/korrikaApi';
import { RankingEntry } from '../../utils/ranking';

type LeaderboardView = 'DAILY' | 'GENERAL';

type HomeScreenProps = {
  loadingEdukiak: boolean;
  activeEdukia: KorrikaEdukia | null;
  isAdmin: boolean;
  sequentialSimulationActive: boolean;
  sequentialSimulationDay: number;
  daysCount: number;
  onStartSequentialSimulation: () => void;
  onStopSequentialSimulation: () => void;
  adminStartDateInput: string;
  onAdminStartDateInputChange: (value: string) => void;
  onSaveChallengeStartDate: () => void;
  onResetChallengeStartDate: () => void;
  savingAdminConfig: boolean;
  simulationEnabled: boolean;
  onToggleSimulation: () => void;
  simulationDayIndex: number;
  onSimulationDayIndexChange: (dayIndex: number) => void;
  dayOptions: number[];
  onStartSimulationDay: (dayIndex: number) => void;
  showDailyPlayButton: boolean;
  onStartDailyPlay: () => void;
  dailyPlayButtonDisabled: boolean;
  validatingDailyStart: boolean;
  nextAvailableDay: number;
  timeUntilStart: number;
  formatCountdown: (ms: number) => string;
  dailyPlayLockMessage: string | null;
  completedDayIndexes: number[];
  onReviewDay: (dayIndex: number) => void;
  loadingRanking: boolean;
  leaderboardView: LeaderboardView;
  onLeaderboardViewChange: (view: LeaderboardView) => void;
  selectedDailyLeaderboardDay: number;
  onSelectedDailyLeaderboardDayChange: (day: number) => void;
  activeRanking: RankingEntry[];
  currentPlayerName: string;
};

type EdukiaCardProps = {
  loadingEdukiak: boolean;
  activeEdukia: KorrikaEdukia | null;
};

const EdukiaCard: React.FC<EdukiaCardProps> = React.memo(({ loadingEdukiak, activeEdukia }) => (
  <section className="w-full px-2 sm:px-4">
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3.5 sm:p-4">
      {loadingEdukiak ? (
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-gray-400">Edukia kargatzen...</p>
      ) : activeEdukia ? (
        <div>
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-pink-500">Eguneko edukia</p>
          <h3 className="text-[15px] sm:text-base font-black text-gray-800 mt-1">{activeEdukia.title}</h3>
          <p className="text-sm sm:text-[15px] leading-relaxed text-gray-600 mt-2">{activeEdukia.content}</p>
        </div>
      ) : (
        <p className="text-xs sm:text-sm font-bold text-gray-400">Ez dago edukirik egun honetarako.</p>
      )}
    </div>
  </section>
));

EdukiaCard.displayName = 'EdukiaCard';

type AdminPanelProps = {
  sequentialSimulationActive: boolean;
  sequentialSimulationDay: number;
  daysCount: number;
  onStartSequentialSimulation: () => void;
  onStopSequentialSimulation: () => void;
  adminStartDateInput: string;
  onAdminStartDateInputChange: (value: string) => void;
  onSaveChallengeStartDate: () => void;
  onResetChallengeStartDate: () => void;
  savingAdminConfig: boolean;
  simulationEnabled: boolean;
  onToggleSimulation: () => void;
  simulationDayIndex: number;
  onSimulationDayIndexChange: (dayIndex: number) => void;
  dayOptions: number[];
  onStartSimulationDay: (dayIndex: number) => void;
};

const AdminPanel: React.FC<AdminPanelProps> = React.memo(
  ({
    sequentialSimulationActive,
    sequentialSimulationDay,
    daysCount,
    onStartSequentialSimulation,
    onStopSequentialSimulation,
    adminStartDateInput,
    onAdminStartDateInputChange,
    onSaveChallengeStartDate,
    onResetChallengeStartDate,
    savingAdminConfig,
    simulationEnabled,
    onToggleSimulation,
    simulationDayIndex,
    onSimulationDayIndexChange,
    dayOptions,
    onStartSimulationDay
  }) => (
    <section className="w-full px-2 sm:px-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 shadow-sm p-4 space-y-3">
        <p className="text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] text-amber-700">
          Kudeaketa panela
        </p>

        <div className="rounded-xl bg-white border border-amber-100 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase text-amber-700">Simulazio sekuentziala</p>
            <span
              className={`text-[11px] font-black uppercase ${sequentialSimulationActive ? 'text-emerald-700' : 'text-gray-500'}`}
            >
              {sequentialSimulationActive
                ? `Eguna ${Math.min(sequentialSimulationDay + 1, daysCount)}`
                : 'Itzalita'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onStartSequentialSimulation}
              className="rounded-xl bg-emerald-600 text-white px-3 py-2.5 text-[11px] font-black uppercase"
            >
              Hasi simulazioa
            </button>
            <button
              onClick={onStopSequentialSimulation}
              className="rounded-xl bg-white border border-amber-200 text-amber-700 px-3 py-2.5 text-[11px] font-black uppercase"
            >
              Gelditu
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-center">
          <input
            type="date"
            value={adminStartDateInput}
            onChange={(e) => onAdminStartDateInputChange(e.target.value)}
            className="bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none"
          />
          <button
            onClick={onSaveChallengeStartDate}
            disabled={savingAdminConfig}
            className="rounded-xl bg-amber-500 text-white px-3 py-2.5 text-[11px] font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingAdminConfig ? 'Gordetzen...' : 'Gorde'}
          </button>
          <button
            onClick={onResetChallengeStartDate}
            disabled={savingAdminConfig}
            className="rounded-xl bg-white border border-amber-200 text-amber-700 px-3 py-2.5 text-[11px] font-black uppercase disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Berrezarri
          </button>
        </div>

        <div className="rounded-xl bg-white border border-amber-100 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase text-amber-700">Simulazioa</p>
            <button
              onClick={onToggleSimulation}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase ${
                simulationEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {simulationEnabled ? 'Aktibatuta' : 'Desaktibatuta'}
            </button>
          </div>

          {simulationEnabled && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <select
                value={simulationDayIndex}
                onChange={(e) => onSimulationDayIndexChange(Number(e.target.value))}
                className="bg-white border border-amber-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none"
              >
                {dayOptions.map((i) => (
                  <option key={`sim-day-${i}`} value={i}>
                    {i + 1}. eguna
                  </option>
                ))}
              </select>
              <button
                onClick={() => onStartSimulationDay(simulationDayIndex)}
                className="rounded-xl bg-gray-800 text-white px-3 py-2.5 text-[11px] font-black uppercase"
              >
                Probatu
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
);

AdminPanel.displayName = 'AdminPanel';

type DailyPlayPanelProps = {
  showDailyPlayButton: boolean;
  onStartDailyPlay: () => void;
  dailyPlayButtonDisabled: boolean;
  validatingDailyStart: boolean;
  nextAvailableDay: number;
  timeUntilStart: number;
  formatCountdown: (ms: number) => string;
  dailyPlayLockMessage: string | null;
};

const DailyPlayPanel: React.FC<DailyPlayPanelProps> = React.memo(
  ({
    showDailyPlayButton,
    onStartDailyPlay,
    dailyPlayButtonDisabled,
    validatingDailyStart,
    nextAvailableDay,
    timeUntilStart,
    formatCountdown,
    dailyPlayLockMessage
  }) =>
    showDailyPlayButton ? (
      <div className="flex flex-col gap-3 w-full px-4 sm:px-8">
        <button
          onClick={onStartDailyPlay}
          disabled={dailyPlayButtonDisabled}
          className="korrika-bg-gradient text-white px-3 py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base md:text-lg leading-tight uppercase italic shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-white/20 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {validatingDailyStart
            ? 'Egiaztatzen...'
            : nextAvailableDay === -4
              ? `Jolastu aktibatuko da: ${formatCountdown(timeUntilStart)}`
              : nextAvailableDay === -1 || nextAvailableDay === -2
                ? 'Gaurko saioa egina'
                : `Jolastu (${nextAvailableDay + 1}. Eguna)`}
        </button>
        {dailyPlayLockMessage && (
          <p className="text-xs sm:text-sm font-bold text-red-500 text-center bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {dailyPlayLockMessage}
          </p>
        )}
        {!dailyPlayLockMessage && (nextAvailableDay === -1 || nextAvailableDay === -2) && (
          <p className="text-xs sm:text-sm font-bold text-gray-500 text-center">
            Bihar berriz jokatu ahal izango duzu.
          </p>
        )}
      </div>
    ) : (
      <div className="bg-white px-5 sm:px-8 py-4 rounded-3xl shadow-md border border-gray-100 flex flex-col items-center text-center gap-2 w-full max-w-md mx-auto">
        <h2 className="text-base font-black uppercase italic text-gray-800">
          {nextAvailableDay === -4
            ? 'Erronka hasi gabe'
            : nextAvailableDay === -1
              ? 'Bihar saiatu'
              : nextAvailableDay === -2
                ? 'Bihar arte!'
                : 'Erronka Amaituta'}
        </h2>
        {(nextAvailableDay === -3 || nextAvailableDay === -5) && (
          <p className="text-xs font-bold text-gray-500">Eskerrik asko parte hartzeagatik.</p>
        )}
      </div>
    )
);

DailyPlayPanel.displayName = 'DailyPlayPanel';

type CompletedDaysPanelProps = {
  completedDayIndexes: number[];
  onReviewDay: (dayIndex: number) => void;
};

const CompletedDaysPanel: React.FC<CompletedDaysPanelProps> = React.memo(
  ({ completedDayIndexes, onReviewDay }) =>
    completedDayIndexes.length > 0 ? (
      <section className="w-full px-2 sm:px-4">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500 mb-2">
            Aurreko egunetako emaitzak
          </p>
          <div className="flex flex-wrap gap-2">
            {completedDayIndexes.map((idx) => (
              <button
                key={`review-day-${idx}`}
                onClick={() => onReviewDay(idx)}
                className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1.5 text-[11px] font-black uppercase text-pink-700 hover:bg-pink-100 transition-colors"
              >
                {idx + 1}. eguna
              </button>
            ))}
          </div>
        </div>
      </section>
    ) : null
);

CompletedDaysPanel.displayName = 'CompletedDaysPanel';

type RankingPanelProps = {
  loadingRanking: boolean;
  leaderboardView: LeaderboardView;
  onLeaderboardViewChange: (view: LeaderboardView) => void;
  selectedDailyLeaderboardDay: number;
  onSelectedDailyLeaderboardDayChange: (day: number) => void;
  dayOptions: number[];
  activeRanking: RankingEntry[];
  currentPlayerName: string;
};

const RankingPanel: React.FC<RankingPanelProps> = React.memo(
  ({
    loadingRanking,
    leaderboardView,
    onLeaderboardViewChange,
    selectedDailyLeaderboardDay,
    onSelectedDailyLeaderboardDayChange,
    dayOptions,
    activeRanking,
    currentPlayerName
  }) => {
    const visibleRanking = activeRanking.slice(0, 5);
    const normalizedCurrentPlayer = currentPlayerName.trim().toUpperCase();
    const currentPlayerRankIndex = activeRanking.findIndex(
      (entry) => entry.playerName === normalizedCurrentPlayer
    );
    const showCurrentPlayerRank = currentPlayerRankIndex >= 5;
    const currentPlayerRankEntry = showCurrentPlayerRank
      ? activeRanking[currentPlayerRankIndex]
      : null;

    return (
      <section className="w-full px-2 sm:px-4">
        <div className="rounded-[1.5rem] border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="korrika-bg-gradient p-4 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black uppercase">Sailkapena</h3>
              </div>
              {loadingRanking && (
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                  Kargatzen
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/15 p-1">
              <button
                onClick={() => onLeaderboardViewChange('DAILY')}
                className={`rounded-xl py-2 text-[11px] font-black uppercase transition-all ${
                  leaderboardView === 'DAILY'
                    ? 'bg-white text-pink-600 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Egunekoa
              </button>
              <button
                onClick={() => onLeaderboardViewChange('GENERAL')}
                className={`rounded-xl py-2 text-[11px] font-black uppercase transition-all ${
                  leaderboardView === 'GENERAL'
                    ? 'bg-white text-pink-600 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Orokorra
              </button>
            </div>

            {leaderboardView === 'DAILY' && (
              <div className="mt-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-white/80 mb-1">
                  Eguna
                </label>
                <select
                  value={selectedDailyLeaderboardDay}
                  onChange={(e) => onSelectedDailyLeaderboardDayChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/30 bg-white/90 text-pink-700 px-3 py-2.5 text-sm font-black outline-none"
                >
                  {dayOptions.map((idx) => (
                    <option key={`leaderboard-day-${idx}`} value={idx}>
                      {idx + 1}. eguna
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="p-4">
            {visibleRanking.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
                <p className="text-xs sm:text-sm font-bold text-gray-400">
                  {leaderboardView === 'DAILY'
                    ? `Ez dago ${selectedDailyLeaderboardDay + 1}. eguneko emaitzarik oraindik.`
                    : 'Oraindik ez dago rankingerako daturik.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleRanking.map((entry, idx) => (
                  <article
                    key={`${leaderboardView}-${entry.playerName}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black ${
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
                        <p className="text-sm font-black text-gray-800 truncate">{entry.playerName}</p>
                        {leaderboardView === 'GENERAL' && (
                          <p className="text-[10px] font-bold uppercase text-gray-400">{entry.games} saio</p>
                        )}
                      </div>
                    </div>
                    <p className="text-base font-black text-pink-600">{entry.points} pt</p>
                  </article>
                ))}

                {currentPlayerRankEntry && (
                  <article className="mt-4 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-pink-600 mb-1">
                      Zure posizioa
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-black">
                          {currentPlayerRankIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-800 truncate">
                            {currentPlayerRankEntry.playerName}
                          </p>
                          {leaderboardView === 'GENERAL' && (
                            <p className="text-[10px] font-bold uppercase text-gray-400">
                              {currentPlayerRankEntry.games} saio
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-base font-black text-pink-600">
                        {currentPlayerRankEntry.points} pt
                      </p>
                    </div>
                  </article>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
);

RankingPanel.displayName = 'RankingPanel';

const HomeScreen: React.FC<HomeScreenProps> = React.memo(
  ({
    loadingEdukiak,
    activeEdukia,
    isAdmin,
    sequentialSimulationActive,
    sequentialSimulationDay,
    daysCount,
    onStartSequentialSimulation,
    onStopSequentialSimulation,
    adminStartDateInput,
    onAdminStartDateInputChange,
    onSaveChallengeStartDate,
    onResetChallengeStartDate,
    savingAdminConfig,
    simulationEnabled,
    onToggleSimulation,
    simulationDayIndex,
    onSimulationDayIndexChange,
    dayOptions,
    onStartSimulationDay,
    showDailyPlayButton,
    onStartDailyPlay,
    dailyPlayButtonDisabled,
    validatingDailyStart,
    nextAvailableDay,
    timeUntilStart,
    formatCountdown,
    dailyPlayLockMessage,
    completedDayIndexes,
    onReviewDay,
    loadingRanking,
    leaderboardView,
    onLeaderboardViewChange,
    selectedDailyLeaderboardDay,
    onSelectedDailyLeaderboardDayChange,
    activeRanking,
    currentPlayerName
  }) => (
    <div className="flex-1 flex flex-col items-center justify-start space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-500 pt-2 sm:pt-3 pb-5 sm:pb-6 overflow-y-auto">
      <div className="w-full flex flex-col items-center space-y-4">
        <EdukiaCard loadingEdukiak={loadingEdukiak} activeEdukia={activeEdukia} />

        {isAdmin && (
          <AdminPanel
            sequentialSimulationActive={sequentialSimulationActive}
            sequentialSimulationDay={sequentialSimulationDay}
            daysCount={daysCount}
            onStartSequentialSimulation={onStartSequentialSimulation}
            onStopSequentialSimulation={onStopSequentialSimulation}
            adminStartDateInput={adminStartDateInput}
            onAdminStartDateInputChange={onAdminStartDateInputChange}
            onSaveChallengeStartDate={onSaveChallengeStartDate}
            onResetChallengeStartDate={onResetChallengeStartDate}
            savingAdminConfig={savingAdminConfig}
            simulationEnabled={simulationEnabled}
            onToggleSimulation={onToggleSimulation}
            simulationDayIndex={simulationDayIndex}
            onSimulationDayIndexChange={onSimulationDayIndexChange}
            dayOptions={dayOptions}
            onStartSimulationDay={onStartSimulationDay}
          />
        )}

        <DailyPlayPanel
          showDailyPlayButton={showDailyPlayButton}
          onStartDailyPlay={onStartDailyPlay}
          dailyPlayButtonDisabled={dailyPlayButtonDisabled}
          validatingDailyStart={validatingDailyStart}
          nextAvailableDay={nextAvailableDay}
          timeUntilStart={timeUntilStart}
          formatCountdown={formatCountdown}
          dailyPlayLockMessage={dailyPlayLockMessage}
        />

        <CompletedDaysPanel
          completedDayIndexes={completedDayIndexes}
          onReviewDay={onReviewDay}
        />
      </div>

      <RankingPanel
        loadingRanking={loadingRanking}
        leaderboardView={leaderboardView}
        onLeaderboardViewChange={onLeaderboardViewChange}
        selectedDailyLeaderboardDay={selectedDailyLeaderboardDay}
        onSelectedDailyLeaderboardDayChange={onSelectedDailyLeaderboardDayChange}
        dayOptions={dayOptions}
        activeRanking={activeRanking}
        currentPlayerName={currentPlayerName}
      />
    </div>
  )
);

HomeScreen.displayName = 'HomeScreen';

export default HomeScreen;
