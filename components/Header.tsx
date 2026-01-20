import React from 'react';
import { Gem } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <Gem className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-xl font-light tracking-tight text-slate-900">
              gaimi <span className="font-semibold">rubi</span>
            </h1>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">Jogos</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Sobre</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contato</a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;