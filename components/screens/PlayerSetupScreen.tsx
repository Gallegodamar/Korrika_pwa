import React from 'react';

type PlayerSetupScreenProps = {
  tempPlayerNames: string[];
  onPlayerNameChange: (index: number, value: string) => void;
  onRemovePlayer: (index: number) => void;
  onAddPlayer: () => void;
  onCancel: () => void;
  onStart: () => void;
};

const PlayerSetupScreen: React.FC<PlayerSetupScreenProps> = React.memo(
  ({ tempPlayerNames, onPlayerNameChange, onRemovePlayer, onAddPlayer, onCancel, onStart }) => (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="text-center">
        <h2 className="text-lg sm:text-xl font-black uppercase italic korrika-pink">Jokalariak Gehitu</h2>
      </div>
      <div className="space-y-2 flex-1 overflow-auto">
        {tempPlayerNames.map((name, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => onPlayerNameChange(i, e.target.value)}
              className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3.5 text-sm font-bold focus:border-pink-300 outline-none"
              placeholder={`Jokalari ${i + 1}...`}
            />
            {tempPlayerNames.length > 2 && (
              <button
                onClick={() => onRemovePlayer(i)}
                className="bg-red-50 text-red-500 w-12 rounded-xl border border-red-100 font-black text-sm"
              >
                X
              </button>
            )}
          </div>
        ))}
        {tempPlayerNames.length < 4 && (
          <button
            onClick={onAddPlayer}
            className="w-full py-3.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-xs sm:text-sm uppercase"
          >
            + Gehitu
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onCancel} className="flex-1 bg-gray-200 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase">
          Utzi
        </button>
        <button
          onClick={onStart}
          className="flex-[2] korrika-bg-gradient text-white py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase"
        >
          Hasi
        </button>
      </div>
    </div>
  )
);

PlayerSetupScreen.displayName = 'PlayerSetupScreen';

export default PlayerSetupScreen;
