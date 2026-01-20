import React from 'react';
import { Monitor, Smartphone, Play } from 'lucide-react';
import { Game, Platform } from '../types';

interface GameCardProps {
  game: Game;
  onClick: (game: Game) => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
  const hasPC = game.platforms.includes(Platform.PC);
  const hasMobile = game.platforms.includes(Platform.MOBILE);

  return (
    <div 
      onClick={() => onClick(game)}
      className="group cursor-pointer flex flex-col gap-4"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-50">
        <img 
          src={game.thumbnailUrl} 
          alt={game.title}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:opacity-90 grayscale-[20%] group-hover:grayscale-0"
          loading="lazy"
        />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/10 backdrop-blur-[2px]">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform duration-500">
             <Play className="w-6 h-6 text-red-500 fill-current ml-1" />
          </div>
        </div>

        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-2 group-hover:translate-y-0">
          {hasPC && (
            <div className="bg-white/90 backdrop-blur text-slate-900 p-2 rounded-lg shadow-sm">
              <Monitor size={14} />
            </div>
          )}
          {hasMobile && (
            <div className="bg-white/90 backdrop-blur text-slate-900 p-2 rounded-lg shadow-sm">
              <Smartphone size={14} />
            </div>
          )}
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="text-lg font-medium text-slate-900 group-hover:text-red-600 transition-colors duration-300">
            {game.title}
          </h3>
          <span className="text-xs font-mono text-slate-300 group-hover:text-slate-500 transition-colors">{game.year}</span>
        </div>
        
        <div className="flex items-center gap-3 text-xs text-slate-400">
           <span className="uppercase tracking-wider font-semibold text-slate-300 group-hover:text-red-400 transition-colors">{game.theme}</span>
           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
           <span className="truncate">{game.creator}</span>
        </div>
      </div>
    </div>
  );
};

export default GameCard;