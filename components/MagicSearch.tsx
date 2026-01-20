import React, { useState } from 'react';
import { Sparkles, Loader2, X, Search } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

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
        Aja como um especialista em jogos do portfólio "gaimi rubi".
        O usuário está procurando um jogo com a seguinte descrição/vibe: "${query}".
        
        Analise a lista de jogos disponível: ${JSON.stringify(gamesContext)}.
        
        Selecione os IDs dos jogos que melhor combinam com a intenção do usuário.
        Se o usuário pedir algo genérico como "jogos de pc", retorne todos os jogos de PC.
        Se pedir algo específico, seja criterioso.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gameIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of game IDs that match the criteria"
              },
              reasoning: {
                type: Type.STRING,
                description: "Short explanation of why these games were chosen"
              }
            }
          }
        },
      });

      const responseText = response.text;
      if (responseText) {
        const result = JSON.parse(responseText);
        const matchedIds = result.gameIds || [];
        
        const filtered = games.filter(g => matchedIds.includes(g.id));
        onSearchResults(filtered);
        setActiveFilter(result.reasoning || `Resultados para: ${query}`);
      }
    } catch (err) {
      console.error("Search failed", err);
      setError("Não foi possível realizar a busca mágica agora.");
      // Fallback simple search
      const lowerQuery = query.toLowerCase();
      const filtered = games.filter(g => 
        g.title.toLowerCase().includes(lowerQuery) || 
        g.description.toLowerCase().includes(lowerQuery) ||
        g.theme.toLowerCase().includes(lowerQuery)
      );
      onSearchResults(filtered);
      setActiveFilter(`Busca simples: ${query}`);
    } finally {
      setIsSearching(false);
      setQuery('');
    }
  };

  const clearSearch = () => {
    onSearchResults(null);
    setActiveFilter(null);
    setQuery('');
  };

  return (
    <div className="w-full relative">
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-red-400 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: 'quero um jogo relaxante' ou 'algo cyberpunk para pc'"
          className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-200 shadow-sm transition-all hover:shadow-md"
          disabled={isSearching}
        />
        <div className="absolute inset-y-0 right-2 flex items-center">
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={18} />
          </button>
        </div>
      </form>

      {activeFilter && (
        <div className="mt-4 flex items-center justify-center animate-in fade-in slide-in-from-top-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 text-sm rounded-full border border-slate-100">
            <Sparkles size={14} className="text-red-500" />
            <span>{activeFilter}</span>
            <button 
              onClick={clearSearch}
              className="ml-1 p-0.5 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  );
};

export default MagicSearch;