import React from 'react';
import { Player } from '../../types';

type RankingScreenProps = {
  sortedPlayersByScore: Player[];
  onBack: () => void;
};

const RankingScreen: React.FC<RankingScreenProps> = React.memo(({ sortedPlayersByScore, onBack }) => (
  <div className="flex-1 overflow-auto py-4 sm:py-6 space-y-4">
    <div className="text-center mb-5 sm:mb-6">
      <h2 className="text-xl sm:text-2xl font-black korrika-pink uppercase italic">Sailkapena</h2>
    </div>
    <div className="space-y-3 px-2 sm:px-4">
      {sortedPlayersByScore.map((player, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-gray-100 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="text-xl sm:text-2xl font-black text-gray-300 w-9 text-center">{idx + 1}.</div>
            <div className="min-w-0">
              <p className="text-sm sm:text-base font-black text-gray-800 truncate">{player.name}</p>
              <p className="text-[11px] text-gray-400 font-bold">{player.score} puntu</p>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black korrika-pink">{player.score}</div>
        </div>
      ))}
    </div>
    <div className="flex gap-2 mt-6 px-2 sm:px-4">
      <button onClick={onBack} className="flex-1 korrika-bg-gradient text-white py-3.5 sm:py-4 rounded-2xl font-black uppercase text-xs sm:text-sm">
        Itzuli
      </button>
    </div>
  </div>
));

RankingScreen.displayName = 'RankingScreen';

export default RankingScreen;
