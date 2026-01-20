import React from 'react';
import { Gem, User, LogOut } from 'lucide-react';

interface HeaderProps {
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogin, onLogout }) => {
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
            <a href="#" className="hover:text-red-500 transition-colors duration-300">Jogos</a>
            <a href="#" className="hover:text-red-500 transition-colors duration-300">Sobre</a>
          </nav>

          {user ? (
             <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">{user.email?.split('@')[0]}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Online</div>
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
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;