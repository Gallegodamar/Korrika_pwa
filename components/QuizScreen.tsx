import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Question } from '../types';

type QuizScreenProps = {
  playerName: string;
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (selectedOption: string | null) => void;
  timerKey: string;
  secondsPerQuestion?: number;
};

type QuestionTimerProps = {
  timerKey: string;
  secondsPerQuestion: number;
  onTimeout: () => void;
};

const QuestionTimer: React.FC<QuestionTimerProps> = React.memo(({ timerKey, secondsPerQuestion, onTimeout }) => {
  const [timer, setTimer] = useState(secondsPerQuestion);
  const timeoutTriggeredRef = useRef(false);

  useEffect(() => {
    timeoutTriggeredRef.current = false;
    setTimer(secondsPerQuestion);
  }, [timerKey, secondsPerQuestion]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (!timeoutTriggeredRef.current) {
            timeoutTriggeredRef.current = true;
            onTimeout();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [onTimeout, timerKey]);

  return (
    <div className="w-11 h-11 sm:w-12 sm:h-12 ml-2 sm:ml-3 flex items-center justify-center bg-white rounded-full shadow-md text-xs sm:text-sm font-black shrink-0">
      {timer}
    </div>
  );
});

QuestionTimer.displayName = 'QuestionTimer';

const QuizScreen: React.FC<QuizScreenProps> = React.memo(
  ({
    playerName,
    question,
    questionIndex,
    totalQuestions,
    onAnswer,
    timerKey,
    secondsPerQuestion = 20
  }) => {
    const answeredRef = useRef(false);

    useEffect(() => {
      answeredRef.current = false;
    }, [timerKey]);

    const optionEntries = useMemo(() => Object.entries(question.opciones), [question]);
    const handleTimeout = useCallback(() => {
      if (answeredRef.current) return;
      answeredRef.current = true;
      onAnswer(null);
    }, [onAnswer]);

    return (
      <div className="flex-1 flex flex-col py-2 sm:py-4 space-y-3 sm:space-y-4 overflow-hidden">
        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-end mb-1 gap-2">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-pink-500 truncate max-w-[55%]">{playerName}</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase truncate max-w-[45%] text-right">{question.categoryName}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalQuestions }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    i === questionIndex ? 'korrika-bg-pink' : i < questionIndex ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <QuestionTimer
            timerKey={timerKey}
            secondsPerQuestion={secondsPerQuestion}
            onTimeout={handleTimeout}
          />
        </div>
        <div className="flex-1 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-gray-100 flex flex-col min-h-0">
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 italic">"{question.pregunta}"</h3>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-auto pr-0.5">
            {optionEntries.map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  if (answeredRef.current) return;
                  answeredRef.current = true;
                  onAnswer(key);
                }}
                className="w-full min-h-[3.5rem] md:min-h-[4rem] text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-gray-100 active:scale-95 transition-all flex items-center gap-3"
              >
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded bg-gray-100 flex items-center justify-center font-black text-gray-400 text-xs sm:text-sm">
                  {key.toUpperCase()}
                </span>
                <span className="font-bold text-gray-700 text-sm sm:text-base leading-tight break-words">{value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

QuizScreen.displayName = 'QuizScreen';

export default QuizScreen;
