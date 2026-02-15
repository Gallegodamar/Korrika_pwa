import React from 'react';
import { UserAnswer } from '../../types';

type ResultsFeedback = {
  text: string;
  emoji: string;
};

type ResultsScreenProps = {
  isSimulationRun: boolean;
  reviewDayIndex: number | null;
  resultsFeedback: ResultsFeedback;
  resultsScore: number;
  resultsTotal: number;
  resultsAnswers: UserAnswer[];
  onBack: () => void;
};

const ResultsScreen: React.FC<ResultsScreenProps> = React.memo(
  ({
    isSimulationRun,
    reviewDayIndex,
    resultsFeedback,
    resultsScore,
    resultsTotal,
    resultsAnswers,
    onBack
  }) => (
    <div className="flex-1 overflow-auto py-4 sm:py-6 space-y-4">
      <div className="rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 text-white shadow-xl korrika-bg-gradient">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">
              {isSimulationRun
                ? 'Simulazio emaitza'
                : reviewDayIndex !== null
                  ? `${reviewDayIndex + 1}. eguneko emaitza`
                  : 'Azken Emaitza'}
            </p>
            <h2 className="text-xl sm:text-2xl font-black italic mt-1 leading-tight">{resultsFeedback.text}</h2>
          </div>
          <div className="text-4xl sm:text-5xl leading-none self-end sm:self-auto">{resultsFeedback.emoji}</div>
        </div>
        <div className="mt-5 bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <p className="text-3xl sm:text-4xl font-black">
              {resultsScore}
              <span className="text-lg font-bold text-white/80"> / {resultsTotal}</span>
            </p>
            <p className="text-[11px] sm:text-xs uppercase font-black tracking-widest text-white/80">
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
          onClick={onBack}
          className="mt-5 w-full bg-white text-pink-600 py-3.5 rounded-2xl font-black uppercase text-xs sm:text-sm shadow-md active:scale-95 transition-all"
        >
          Itzuli
        </button>
      </div>

      <div className="bg-white rounded-[1.75rem] p-3.5 sm:p-4 shadow-md border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wide text-gray-700">Erantzunen Xehetasuna</h3>
          <span className="text-[11px] sm:text-xs font-black uppercase text-gray-400">{resultsAnswers.length} galdera</span>
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
                className={`rounded-2xl border p-3.5 sm:p-4 ${
                  answer.isCorrect ? 'border-emerald-100 bg-emerald-50/50' : 'border-rose-100 bg-rose-50/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                  <p className="text-[12px] sm:text-[13px] font-black text-gray-700 leading-snug">
                    {idx + 1}. {answer.question.pregunta}
                  </p>
                  <span
                    className={`text-[11px] font-black uppercase px-2 py-1 rounded-full whitespace-nowrap self-start ${
                      answer.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {answer.isCorrect ? 'Zuzena' : 'Okerra'}
                  </span>
                </div>

                <div className="grid gap-2">
                  <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-gray-400 mb-1">Zure aukera</p>
                    <p className={`text-sm sm:text-[15px] font-bold leading-snug ${answer.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {selectedKey ? `${selectedKey.toUpperCase()}) ${selectedText}` : 'Erantzun gabe'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                    <p className="text-[10px] sm:text-[11px] font-black uppercase text-emerald-600/70 mb-1">Erantzun zuzena</p>
                    <p className="text-sm sm:text-[15px] font-black text-emerald-700 leading-snug">{`${correctKey.toUpperCase()}) ${correctText}`}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  )
);

ResultsScreen.displayName = 'ResultsScreen';

export default ResultsScreen;
