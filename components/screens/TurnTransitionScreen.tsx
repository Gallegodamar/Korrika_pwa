import React from 'react';

type TurnTransitionScreenProps = {
  playerName: string | null;
  onReady: () => void;
};

const TurnTransitionScreen: React.FC<TurnTransitionScreenProps> = React.memo(({ playerName, onReady }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl w-full max-w-md">
      <h2 className="text-xl sm:text-2xl font-black korrika-pink uppercase italic mb-5 sm:mb-6">Txandakoa!</h2>
      {playerName && (
        <div className="space-y-6">
          <p className="text-lg sm:text-xl font-black text-gray-800 break-words">{playerName}</p>
          <button
            onClick={onReady}
            className="korrika-bg-gradient text-white px-8 py-3.5 sm:py-4 rounded-2xl font-black uppercase text-xs sm:text-sm w-full"
          >
            Prest
          </button>
        </div>
      )}
    </div>
  </div>
));

TurnTransitionScreen.displayName = 'TurnTransitionScreen';

export default TurnTransitionScreen;
