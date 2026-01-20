import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Game } from '../types';
import StickRun from '../games/DinoRun'; // File kept as DinoRun.tsx but exports StickRun logic
import RetroArcade from '../games/RetroArcade';
import TwoPlayerGames from '../games/TwoPlayerGames';
import PushBattles from '../games/PushBattles';

interface GamePlayerProps {
  game: Game;
  onBack: () => void;
}

const GamePlayer: React.FC<GamePlayerProps> = ({ game, onBack }) => {
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

  // Listen for fullscreen changes (ESC key interaction)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Render the specific game based on ID
  const renderGame = () => {
    switch (game.id) {
      case 'push-battles':
        return <PushBattles />;
      case 'stick-run': // Updated ID
      case 'dino-run':  // Legacy support just in case
        return <StickRun />;
      case 'retro-arcade':
        return <RetroArcade />;
      case 'pocket-versus':
        return <TwoPlayerGames />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50">
            <p className="text-lg font-medium">Jogo em desenvolvimento</p>
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
      {/* Game Toolbar */}
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
              <span>Sair da Tela Cheia</span>
            </>
          ) : (
            <>
              <Maximize2 size={16} />
              <span>Tela Cheia</span>
            </>
          )}
        </button>
      </div>

      {/* Game Viewport */}
      <div className="flex-1 relative bg-slate-50 overflow-hidden select-none">
        {renderGame()}
      </div>
    </div>
  );
};

export default GamePlayer;