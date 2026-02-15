import React from 'react';
import { QuizData } from '../../types';

type SupervisorScreenProps = {
  supervisorCategory: string;
  quizData: QuizData[];
  filteredSupervisorData: QuizData[];
  onSelectCategory: (category: string) => void;
  onBack: () => void;
};

const SupervisorScreen: React.FC<SupervisorScreenProps> = React.memo(
  ({ supervisorCategory, quizData, filteredSupervisorData, onSelectCategory, onBack }) => (
    <div className="flex-1 overflow-auto py-4 sm:py-6 space-y-4">
      <div className="mb-4">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h2 className="text-lg sm:text-xl font-black korrika-pink uppercase italic">Galderak</h2>
          <button
            onClick={onBack}
            className="bg-gray-800 text-white px-4 py-2.5 rounded-full font-black text-[11px] uppercase"
          >
            Itzuli
          </button>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => onSelectCategory('GUZTIAK')}
              className={`px-4 py-2.5 rounded-full font-black text-[11px] uppercase transition-all ${
                supervisorCategory === 'GUZTIAK'
                  ? 'korrika-bg-gradient text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              GUZTIAK
            </button>
            {quizData.map((cat) => (
              <button
                key={cat.capitulo}
                onClick={() => onSelectCategory(cat.capitulo)}
                className={`px-4 py-2.5 rounded-full font-black text-[11px] uppercase transition-all ${
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
      </div>
      {filteredSupervisorData.length === 0 ? (
        <p className="text-center text-sm text-gray-400 font-bold py-10">Ez dago galderarik kargatuta.</p>
      ) : (
        filteredSupervisorData.map((category) => (
          <div
            key={category.capitulo}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4"
          >
            <div className="korrika-bg-gradient p-3 text-white font-black text-xs sm:text-sm uppercase">{category.capitulo}</div>
            <div className="p-4 space-y-4">
              {category.preguntas.map((q) => (
                <div key={q.id} className="border-b border-gray-50 pb-2">
                  <p className="font-bold text-xs sm:text-sm text-gray-800">{q.pregunta}</p>
                  <p className="text-xs sm:text-sm text-green-600 font-black">{q.opciones[q.respuesta_correcta]}</p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
);

SupervisorScreen.displayName = 'SupervisorScreen';

export default SupervisorScreen;
