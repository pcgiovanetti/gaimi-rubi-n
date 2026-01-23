import React, { useState } from 'react';
import { Sparkles, Loader2, X, Search, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { Game } from '../types';

interface MagicSearchProps {
  games: Game[];
  onSearchResults: (filteredGames: Game[] | null) => void;
}

const MagicSearch: React.FC<MagicSearchProps> = ({ games, onSearchResults }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const gamesContext = games.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        theme: g.theme,
        platforms: g.platforms
      }));

      const prompt = `
        Search query: "${query}"
        Games: ${JSON.stringify(gamesContext)}
        Return matching game IDs.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gameIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              reasoning: { type: Type.STRING }
            }
          }
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result = JSON.parse(responseText);
        const filtered = games.filter(g => (result.gameIds || []).includes(g.id));
        onSearchResults(filtered);
        setActiveFilter(result.reasoning || query);
      }
    } catch (err) {
      console.error(err);
      // Fallback
      const lower = query.toLowerCase();
      onSearchResults(games.filter(g => 
        g.title.toLowerCase().includes(lower) || 
        g.description.toLowerCase().includes(lower)
      ));
      setActiveFilter(query);
    } finally {
      setIsSearching(false);
      setQuery('');
    }
  };

  const clear = () => {
    onSearchResults(null);
    setActiveFilter(null);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={handleSearch} className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque por um jogo..."
          className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border-0 rounded-2xl px-5 py-4 md:px-6 md:py-5 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-100 transition-all outline-none text-base md:text-lg font-light"
          disabled={isSearching}
        />
        <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2">
           {isSearching ? (
             <Loader2 className="animate-spin text-red-500" size={18} md:size={20} />
           ) : query ? (
             <button type="submit" className="p-1.5 md:p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors">
               <ArrowRight size={14} md:size={16} />
             </button>
           ) : (
             <Search className="text-slate-300" size={18} md:size={20} />
           )}
        </div>
      </form>

      {activeFilter && (
        <div className="mt-6 md:mt-8 flex justify-center animate-in fade-in slide-in-from-bottom-2 px-4">
          <button 
            onClick={clear}
            className="group flex items-center gap-2 md:gap-3 px-4 py-1.5 md:px-5 md:py-2 bg-white border border-slate-100 rounded-full hover:border-red-100 transition-colors shadow-sm hover:shadow-md max-w-full overflow-hidden"
          >
            <Sparkles size={12} md:size={14} className="text-red-500 shrink-0" />
            <span className="text-[10px] md:text-sm text-slate-600 font-medium truncate">{activeFilter}</span>
            <X size={12} md:size={14} className="text-slate-300 group-hover:text-red-500 transition-colors shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MagicSearch;