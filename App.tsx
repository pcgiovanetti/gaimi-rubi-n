import React, { useState } from 'react';
import Header from './components/Header';
import GameCard from './components/GameCard';
import MagicSearch from './components/MagicSearch';
import GamePlayer from './components/GamePlayer';
import { GAMES } from './constants';
import { Game } from './types';
import { Ghost } from 'lucide-react';

const App: React.FC = () => {
  const [filteredGames, setFilteredGames] = useState<Game[] | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  const displayGames = filteredGames || GAMES;

  // If a game is active, render the GamePlayer instead of the site structure
  if (activeGame) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <GamePlayer 
          game={activeGame} 
          onBack={() => setActiveGame(null)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-red-100 selection:text-red-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero & Search Section */}
        <section className="mb-16 text-center max-w-2xl mx-auto pt-8">
          <p className="text-slate-400 font-medium mb-4 text-sm tracking-widest uppercase">
            by pcgiovanetti
          </p>
          <h1 className="text-6xl md:text-7xl font-thin text-slate-900 mb-10 tracking-tighter">
            gaimi <span className="font-semibold text-red-500">rubi</span>
          </h1>
          
          <MagicSearch games={GAMES} onSearchResults={setFilteredGames} />
        </section>

        {/* Games Grid */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-medium text-slate-800 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
              Catálogo
            </h3>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {displayGames.length} {displayGames.length === 1 ? 'jogo' : 'jogos'}
            </span>
          </div>

          {displayGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayGames.map((game) => (
                <GameCard 
                  key={game.id} 
                  game={game} 
                  onClick={setActiveGame}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="inline-block p-4 bg-white rounded-full mb-4 shadow-sm">
                <Ghost className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">Nenhum jogo encontrado.</p>
              <button 
                onClick={() => setFilteredGames(null)}
                className="mt-4 text-sm text-red-500 hover:text-red-600 font-medium hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-100 py-12 mt-12 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-400 text-sm font-light">
          <p>&copy; {new Date().getFullYear()} gaimi rubi by pcgiovanetti.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;