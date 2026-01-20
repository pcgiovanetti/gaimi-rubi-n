import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import GameCard from './components/GameCard';
import MagicSearch from './components/MagicSearch';
import GamePlayer from './components/GamePlayer';
import AuthModal from './components/AuthModal';
import { GAMES } from './constants';
import { Game } from './types';

const App: React.FC = () => {
  const [filteredGames, setFilteredGames] = useState<Game[] | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayGames = filteredGames || GAMES;

  if (activeGame) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <GamePlayer 
          game={activeGame} 
          onBack={() => setActiveGame(null)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-red-500 selection:text-white font-sans">
      <Header user={user} onLogin={() => setShowAuth(true)} onLogout={() => supabase.auth.signOut()} />
      
      <main className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-32">
          <h1 className="text-6xl md:text-8xl font-thin tracking-tighter text-slate-900 mb-8">
            gaimi <span className="font-medium text-slate-900">rubi</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-light mb-12">
            Minimalist game portfolio.
          </p>
          <MagicSearch games={GAMES} onSearchResults={setFilteredGames} />
        </div>

        {/* Catalog */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {displayGames.map((game) => (
            <GameCard 
              key={game.id} 
              game={game} 
              onClick={setActiveGame}
            />
          ))}
        </div>

        {displayGames.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 font-light">Nenhum jogo encontrado.</p>
          </div>
        )}
      </main>

      <footer className="py-12 border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-xs text-slate-300 font-medium uppercase tracking-widest">
           <div>© {new Date().getFullYear()} gaimi rubi</div>
           <div>by pcgiovanetti</div>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
};

export default App;