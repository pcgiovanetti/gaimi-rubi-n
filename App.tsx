import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import GameCard from './components/GameCard';
import MagicSearch from './components/MagicSearch';
import GamePlayer from './components/GamePlayer';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import AchievementToast from './components/AchievementToast';
import { GAMES, TRANSLATIONS, ACHIEVEMENTS_LIST } from './constants';
import { Game, Language, Achievement } from './types';
import { Crown, Check, X, Shield, Trophy, User as UserIcon, Copy, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [filteredGames, setFilteredGames] = useState<Game[] | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isVip, setIsVip] = useState(false);
  const [lang, setLang] = useState<Language>('en'); 
  const [showVipModal, setShowVipModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Data
  const [careerPushes, setCareerPushes] = useState(0);
  const [myAchievements, setMyAchievements] = useState<string[]>([]);
  
  // Toast
  const [latestAchievement, setLatestAchievement] = useState<Achievement | null>(null);

  const t = TRANSLATIONS[lang];
  const isAdmin = user?.email === 'pcgiovanetti2011@gmail.com';

  const checkUserStatus = async (sessionUser: any) => {
      if (!sessionUser) {
          setUser(null);
          setIsVip(false);
          setMyAchievements([]);
          return;
      }
      setUser(sessionUser);
      const isUserAdmin = sessionUser.email === 'pcgiovanetti2011@gmail.com';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_vip, total_pushes, achievements')
        .eq('id', sessionUser.id)
        .single();
      
      if (data) {
          setIsVip(isUserAdmin || data.is_vip || false);
          setCareerPushes(data.total_pushes || 0);
          setMyAchievements(data.achievements || []);
      } else if (error && error.code === 'PGRST116') {
          // Create profile if missing
          await supabase.from('profiles').insert({ 
              id: sessionUser.id, 
              full_name: sessionUser.user_metadata.full_name,
              total_pushes: 0,
              is_vip: isUserAdmin,
              achievements: []
          });
          setIsVip(isUserAdmin);
      }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
       checkUserStatus(session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
       checkUserStatus(session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUnlockAchievement = async (id: string) => {
      if (!user || myAchievements.includes(id)) return;
      
      const achievement = ACHIEVEMENTS_LIST.find(a => a.id === id);
      if (!achievement) return;

      const newAch = [...myAchievements, id];
      setMyAchievements(newAch);
      setLatestAchievement(achievement);
      
      await supabase.from('profiles').update({ achievements: newAch }).eq('id', user.id);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
  };

  const displayGames = filteredGames || GAMES;

  if (activeGame) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center z-50 overflow-hidden">
        <GamePlayer 
          game={activeGame}
          lang={lang}
          onBack={() => setActiveGame(null)} 
          onUnlockAchievement={handleUnlockAchievement}
        />
        <AchievementToast achievement={latestAchievement} onClose={() => setLatestAchievement(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white selection:bg-red-500 selection:text-white font-sans overflow-x-hidden">
      <Header 
        user={user} 
        isVip={isVip}
        lang={lang}
        setLang={setLang}
        onLogin={() => setShowAuth(true)} 
        onLogout={() => supabase.auth.signOut()} 
        onBuyVip={() => setShowVipModal(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-24">
        {/* Admin & Profile Controls */}
        {user && (
            <div className="flex flex-wrap gap-2 justify-center md:justify-end mb-8 md:absolute md:top-24 md:right-6 md:mb-0">
                {isAdmin && (
                    <button onClick={() => setShowAdmin(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-yellow-500 font-bold rounded-full text-[10px] md:text-xs hover:bg-slate-800 shadow-xl">
                        <Shield size={12} /> ADMIN
                    </button>
                )}
                <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-full text-[10px] md:text-xs hover:bg-slate-50 shadow-sm">
                    <UserIcon size={12} /> {t.profile}
                </button>
            </div>
        )}

        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-24">
          <h1 className="text-3xl md:text-8xl font-thin tracking-tighter text-slate-900 mb-4 md:mb-6">
            gaimi <span className="font-medium text-slate-900">rubi</span>
          </h1>
          <p className="text-sm md:text-xl text-slate-400 font-light mb-6 md:mb-8 px-4">
            {t.heroSubtitle}
          </p>
          
          {!isVip && (
              <button 
                onClick={() => setShowVipModal(true)} 
                className="mb-8 md:mb-10 px-5 py-2 md:px-6 md:py-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-full text-xs md:text-sm shadow-lg shadow-yellow-500/20 transition-transform active:scale-95 flex items-center gap-2 mx-auto"
              >
                  <Crown size={14} /> {t.vipButton}
              </button>
          )}
          
          <MagicSearch games={GAMES} onSearchResults={setFilteredGames} />
        </div>

        {/* Catalog */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 md:gap-x-8 gap-y-10 md:gap-y-16">
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
            <p className="text-slate-400 font-light">{t.notFound}</p>
          </div>
        )}
      </main>

      <footer className="py-8 md:py-12 border-t border-slate-50">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center text-[10px] text-slate-300 font-medium uppercase tracking-widest">
           <div>© {new Date().getFullYear()} gaimi rubi</div>
           <div>{t.footer}</div>
        </div>
      </footer>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* ADMIN PANEL */}
      {showAdmin && user && (
          <AdminPanel 
            onClose={() => setShowAdmin(false)} 
            currentPushes={careerPushes}
            onUpdatePushes={setCareerPushes}
            userId={user.id}
          />
      )}

      {/* PROFILE MODAL */}
      {showProfile && user && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 relative flex flex-col">
                  <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 z-10"><X size={20}/></button>
                  <div className="p-6 md:p-8 border-b border-slate-100 flex-shrink-0">
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                          <UserIcon className="text-red-500" /> {user.user_metadata?.full_name || 'Jogador'}
                      </h2>
                      <p className="text-slate-400 text-xs md:text-sm truncate">{user.email}</p>
                      
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group">
                          <div className="overflow-hidden">
                              <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase mb-0.5">ID de Usuário (UUID)</div>
                              <div className="text-[10px] md:text-[11px] font-mono text-slate-500 truncate pr-4">{user.id}</div>
                          </div>
                          <button 
                            onClick={() => copyToClipboard(user.id)}
                            className={`p-1.5 md:p-2 rounded-lg transition-all flex-shrink-0 ${copiedId ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm'}`}
                            title="Copiar ID"
                          >
                            {copiedId ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          </button>
                      </div>

                      {isVip && <div className="mt-4 inline-block px-3 py-1 bg-yellow-100 text-yellow-700 font-bold text-[10px] md:text-xs rounded-full">VIP MEMBER</div>}
                  </div>
                  <div className="p-4 md:p-8 bg-slate-50 overflow-y-auto flex-1">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm md:text-base"><Trophy size={14}/> {t.achievements}</h3>
                      <div className="space-y-3">
                          {ACHIEVEMENTS_LIST.map(ach => {
                              const unlocked = myAchievements.includes(ach.id);
                              return (
                                  <div key={ach.id} className={`p-3 md:p-4 rounded-xl border flex items-center gap-3 md:gap-4 ${unlocked ? 'bg-white border-green-200 shadow-sm' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-lg md:text-xl flex-shrink-0 ${unlocked ? 'bg-green-100' : 'bg-slate-200 grayscale'}`}>
                                          {ach.icon}
                                      </div>
                                      <div>
                                          <div className={`font-bold text-xs md:text-sm ${unlocked ? 'text-slate-800' : 'text-slate-500'}`}>{ach.title}</div>
                                          <div className="text-[10px] md:text-xs text-slate-400">{ach.description}</div>
                                          {unlocked && ach.reward && <div className="text-[9px] md:text-[10px] font-bold text-blue-500 mt-0.5 md:mt-1 uppercase">Recompensa: {ach.reward}</div>}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* VIP Modal */}
      {showVipModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 relative">
                  <button onClick={() => setShowVipModal(false)} className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                      <X size={18} />
                  </button>
                  
                  <div className="p-6 md:p-8 text-center bg-slate-900 text-white">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 text-black shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                          <Crown size={24} md:size={32} fill="currentColor" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight mb-2">{t.vipModalTitle}</h2>
                      <p className="text-slate-400 text-xs md:text-sm">{t.vipModalSubtitle}</p>
                  </div>

                  <div className="p-6 md:p-8 space-y-4">
                      {t.perks.map((perk, i) => (
                          <div key={i} className="flex gap-3 md:gap-4 items-start">
                              <div className="mt-1 p-1 bg-green-100 text-green-600 rounded-full flex-shrink-0">
                                  <Check size={10} md:size={12} strokeWidth={4} />
                              </div>
                              <div>
                                  <h3 className="font-bold text-sm md:text-base text-slate-800">{perk.title}</h3>
                                  <p className="text-[10px] md:text-xs text-slate-400">{perk.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50">
                      <button disabled className="w-full py-4 bg-slate-200 text-slate-500 font-bold rounded-xl cursor-not-allowed flex flex-col items-center leading-none gap-1">
                          <span className="text-[10px] md:text-sm uppercase tracking-wider">{lang === 'pt' ? 'EM BREVE' : 'COMING SOON'}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      <AchievementToast achievement={latestAchievement} onClose={() => setLatestAchievement(null)} />
    </div>
  );
};

export default App;