import React from 'react';
import { Gem, User, LogOut, Crown, CreditCard, Globe } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface HeaderProps {
  user: any;
  isVip: boolean;
  lang: Language;
  setLang: (l: Language) => void;
  onLogin: () => void;
  onLogout: () => void;
  onBuyVip: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, isVip, lang, setLang, onLogin, onLogout, onBuyVip }) => {
  const t = TRANSLATIONS[lang];
  const isAdmin = user?.email === 'pcgiovanetti2011@gmail.com';
  
  // Tenta pegar o nome salvo nos metadados, senão pega a primeira parte do email
  let displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0];
  
  // Enforce official name for admin
  if (isAdmin) displayName = "pcgiovanetti";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-red-50 transition-colors duration-500">
            <Gem className="w-5 h-5 text-slate-300 group-hover:text-red-500 transition-colors duration-500" />
          </div>
          <h1 className="text-2xl font-light tracking-tight text-slate-900 group-hover:tracking-wide transition-all duration-500">
            gaimi <span className="font-semibold text-slate-900">rubi</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-red-500 transition-colors duration-300">{t.games}</a>
            <a href="#" className="hover:text-red-500 transition-colors duration-300">{t.about}</a>
          </nav>

          {/* Language Toggle */}
          <button 
            onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase"
          >
            <Globe size={14} />
            {lang}
          </button>

          {user ? (
             <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                {!isVip && (
                    <button onClick={onBuyVip} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg text-xs font-bold shadow-md shadow-yellow-500/20 transition-all active:scale-95">
                        <CreditCard size={14} /> {t.vipButton}
                    </button>
                )}
                
                <div className="text-right hidden sm:block">
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isAdmin ? 'text-red-500' : isVip ? 'text-yellow-600' : 'text-slate-900'}`}>
                      {displayName}
                      {(isAdmin || isVip) && <Crown size={12} fill="currentColor" className={isAdmin ? 'text-red-500' : 'text-yellow-500'} />}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {isAdmin ? 'Admin' : isVip ? 'VIP Member' : 'Player'}
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Sair"
                >
                  <LogOut size={18} />
                </button>
             </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
            >
              <User size={16} />
              <span>{t.login}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;