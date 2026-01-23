import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Game, Language } from '../types';
import StickRun from '../games/DinoRun';
import RetroArcade from '../games/RetroArcade';
import TwoPlayerGames from '../games/TwoPlayerGames';
import PushBattles from '../games/PushBattles';

interface GamePlayerProps {
  game: Game;
  lang: Language;
  onBack: () => void;
  onUnlockAchievement: (id: string) => void;
}

const GamePlayer: React.FC<GamePlayerProps> = ({ game, lang, onBack, onUnlockAchievement }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Error attempting to enable fullscreen:", err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const renderGame = () => {
    switch (game.id) {
      case 'push-battles':
        return <PushBattles lang={lang} onUnlockAchievement={onUnlockAchievement} />;
      case 'stick-run': 
      case 'dino-run':
        return <StickRun />;
      case 'retro-arcade':
        return <RetroArcade />;
      case 'pocket-versus':
        return <TwoPlayerGames />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
            <p className="text-lg font-medium">Game in development</p>
            <p className="text-sm">ID: {game.id} - {game.title}</p>
          </div>
        );
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`bg-white flex flex-col ${isFullscreen ? 'w-full h-screen' : 'w-full min-h-[600px] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden'}`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
            title="Voltar ao menu"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-medium text-slate-800">{game.title}</h2>
        </div>

        <button 
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          {isFullscreen ? (
            <>
              <Minimize2 size={16} />
              <span>Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 size={16} />
              <span>Fullscreen</span>
            </>
          )}
        </button>
      </div>

      <div className="flex-1 relative bg-slate-50 overflow-hidden select-none">
        {renderGame()}
      </div>
    </div>
  );
};

export default GamePlayer;