import React from 'react';

type AuthScreenProps = {
  username: string;
  password: string;
  showPassword: boolean;
  loginError: string | null;
  loadingAuth: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
};

const AuthScreen: React.FC<AuthScreenProps> = React.memo(
  ({
    username,
    password,
    showPassword,
    loginError,
    loadingAuth,
    onSubmit,
    onUsernameChange,
    onPasswordChange,
    onTogglePassword
  }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 space-y-6 sm:space-y-8 animate-in fade-in zoom-in-95 overflow-auto">
      <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 w-full max-w-md">
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black uppercase italic korrika-pink">Sartu Lekukoan</h2>
          <p className="text-[11px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
            Erabiltzaile kodea behar duzu
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">
              Erabiltzailea (k_XXXX)
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="k_0001"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 sm:px-5 py-3.5 text-[16px] font-bold text-gray-700 focus:border-pink-300 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Pasahitza</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="........"
              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 sm:px-5 py-3.5 text-[16px] font-bold text-gray-700 focus:border-pink-300 outline-none transition-all pr-12"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-4 bottom-3.5 text-[11px] sm:text-xs font-black uppercase text-gray-400 hover:text-pink-500 transition-colors"
            >
              {showPassword ? 'Ezkutatu' : 'Ikusi'}
            </button>
          </div>
          {loginError && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100 animate-pulse">
              <p className="text-[11px] sm:text-xs text-red-500 font-bold text-center leading-tight">{loginError}</p>
            </div>
          )}
          <button
            disabled={loadingAuth}
            type="submit"
            className="w-full korrika-bg-gradient text-white py-4 rounded-2xl font-black uppercase italic text-sm sm:text-base shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {loadingAuth ? 'Sartzen...' : 'SARTU'}
          </button>
        </form>
      </div>
      <p className="text-[10px] font-black text-gray-300 uppercase text-center">AEK - EUSKARA BIZIRIK</p>
    </div>
  )
);

AuthScreen.displayName = 'AuthScreen';

export default AuthScreen;
