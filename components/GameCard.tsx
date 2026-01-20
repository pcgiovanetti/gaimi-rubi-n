import React from 'react';
import { Monitor, Smartphone, User, Calendar, Play } from 'lucide-react';
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
      className="group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg hover:border-slate-200 transition-all duration-300 cursor-pointer relative"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        <img 
          src={game.thumbnailUrl} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-300">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 text-red-500 fill-current ml-1" />
          </div>
        </div>

        <div className="absolute top-2 right-2 flex gap-1">
          {hasPC && (
            <div className="bg-white/90 backdrop-blur text-slate-700 p-1.5 rounded-md shadow-sm" title="Compatível com PC">
              <Monitor size={14} />
            </div>
          )}
          {hasMobile && (
            <div className="bg-white/90 backdrop-blur text-slate-700 p-1.5 rounded-md shadow-sm" title="Compatível com Celular">
              <Smartphone size={14} />
            </div>
          )}
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <div className="text-xs font-semibold text-red-500 tracking-wide uppercase">
            {game.theme}
          </div>
          <div className="flex items-center text-xs text-slate-400 gap-1">
            <Calendar size={12} />
            <span>{game.year}</span>
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-slate-900 mb-2 group-hover:text-red-600 transition-colors">
          {game.title}
        </h3>
        
        <p className="text-sm text-slate-500 leading-relaxed mb-4 line-clamp-2">
          {game.description}
        </p>
        
        <div className="flex items-center pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <div className="bg-slate-100 p-1 rounded-full">
              <User size={12} />
            </div>
            <span>{game.creator}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;