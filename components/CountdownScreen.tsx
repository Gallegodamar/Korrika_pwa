import React, { useEffect, useState } from 'react';

type CountdownScreenProps = {
  playerName: string;
  onComplete: () => void;
  startFrom?: number;
};

const CountdownScreen: React.FC<CountdownScreenProps> = React.memo(
  ({ playerName, onComplete, startFrom = 3 }) => {
    const [countdown, setCountdown] = useState(startFrom);

    useEffect(() => {
      setCountdown(startFrom);
    }, [startFrom, playerName]);

    useEffect(() => {
      if (countdown <= 0) {
        onComplete();
        return;
      }

      const timerId = window.setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => window.clearTimeout(timerId);
    }, [countdown, onComplete]);

    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="text-pink-500 font-black uppercase tracking-[0.2em] text-xs sm:text-sm mb-4">{playerName} prest?</div>
        <div className="text-[clamp(4.5rem,24vw,10rem)] leading-none font-black korrika-pink animate-bounce">
          {countdown === 0 ? 'HASI' : countdown}
        </div>
      </div>
    );
  }
);

CountdownScreen.displayName = 'CountdownScreen';

export default CountdownScreen;
