import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Zap, Hash, Clock, MousePointer, Target, ArrowLeft, Search } from 'lucide-react';

// Game Types
type MiniGame = 'MENU' | 'TAP_WAR' | 'REFLEX' | 'MATH' | 'TIMING' | 'ODD_ONE' | 'REACTION' | 'HOLD' | 'SPAM' | 'SIMON' | 'HIGH_LOW';
type Player = 'P1' | 'P2';

// Global state bucket
let sharedState: any = {};
let listeners: Function[] = [];

const updateState = (newState: any) => {
    sharedState = { ...sharedState, ...newState };
    listeners.forEach(l => l(sharedState));
};

const TwoPlayerGames: React.FC = () => {
  const [game, setGame] = useState<MiniGame>('MENU');
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [winner, setWinner] = useState<Player | 'DRAW' | null>(null);
  
  // MENU Component
  if (game === 'MENU') {
    return (
      <div className="w-full h-full bg-slate-50 flex flex-col p-4 overflow-y-auto">
        <div className="text-center py-8">
          <h2 className="text-4xl font-light text-slate-800 mb-2">Pocket Versus</h2>
          <p className="text-slate-400 mb-6">10 Mini-Games para 2 Jogadores (Split Screen)</p>
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-sm text-red-500 font-bold uppercase mb-1">Rubi (P1)</div>
              <div className="text-4xl font-mono text-slate-800">{score.p1}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 font-bold uppercase mb-1">Slate (P2)</div>
              <div className="text-4xl font-mono text-slate-800">{score.p2}</div>
            </div>
          </div>
          <button onClick={() => setScore({ p1: 0, p2: 0 })} className="text-xs text-slate-400 hover:text-red-500 underline">Resetar Placar</button>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-8">
          <MenuButton onClick={() => setGame('TAP_WAR')} icon={<MousePointer />} label="Tap War" />
          <MenuButton onClick={() => setGame('REFLEX')} icon={<Zap />} label="Reflexo" />
          <MenuButton onClick={() => setGame('MATH')} icon={<Hash />} label="Matemática" />
          <MenuButton onClick={() => setGame('TIMING')} icon={<Clock />} label="Timing" />
          <MenuButton onClick={() => setGame('ODD_ONE')} icon={<Target />} label="O Intruso" />
          <MenuButton onClick={() => setGame('REACTION')} icon={<Zap />} label="Reação" />
          <MenuButton onClick={() => setGame('HOLD')} icon={<MousePointer />} label="Segure" />
          <MenuButton onClick={() => setGame('SPAM')} icon={<Target />} label="Alvo Móvel" />
          <MenuButton onClick={() => setGame('SIMON')} icon={<Search />} label="Símbolo" />
          <MenuButton onClick={() => setGame('HIGH_LOW')} icon={<Hash />} label="Alto/Baixo" />
        </div>
      </div>
    );
  }

  // WIN SCREEN
  if (winner) {
     const handleReset = () => {
         if (winner === 'P1') setScore(s => ({ ...s, p1: s.p1 + 1 }));
         if (winner === 'P2') setScore(s => ({ ...s, p2: s.p2 + 1 }));
         
         // CRITICAL: Clear shared state to prevent next game from auto-winning/glitching
         sharedState = {};
         
         setWinner(null);
         setGame('MENU');
     }
     
     return (
        <div onClick={handleReset} className="w-full h-full absolute inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer">
            <Trophy className={`w-24 h-24 mb-6 ${winner === 'P1' ? 'text-red-500' : winner === 'P2' ? 'text-slate-700' : 'text-yellow-500'}`} />
            <h2 className="text-5xl font-black text-slate-900 mb-2">
                {winner === 'DRAW' ? 'EMPATE!' : `${winner === 'P1' ? 'RUBI' : 'SLATE'} VENCEU!`}
            </h2>
            <p className="text-slate-400 animate-pulse">Toque para continuar</p>
        </div>
     );
  }

  // Render specific game
  return (
    <div className="w-full h-full relative flex flex-col">
        {/* PLAYER 1 AREA (Top, Rotated) */}
        <div className="flex-1 bg-red-50 border-b-4 border-slate-200 relative rotate-180 overflow-hidden">
            <div className="absolute top-2 left-2 px-2 py-1 bg-white/50 rounded text-xs font-bold text-red-400 pointer-events-none z-10">P1</div>
            <GameLogic gameType={game} player="P1" onWin={(p) => setWinner(p)} />
        </div>

        {/* PLAYER 2 AREA (Bottom) */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden">
            <div className="absolute top-2 left-2 px-2 py-1 bg-white/50 rounded text-xs font-bold text-slate-400 pointer-events-none z-10">P2</div>
            <GameLogic gameType={game} player="P2" onWin={(p) => setWinner(p)} />
        </div>
        
        {/* QUIT BUTTON */}
        <button 
            onClick={() => {
              sharedState = {};
              setGame('MENU');
            }}
            className="absolute top-1/2 left-4 -translate-y-1/2 z-40 p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 border border-slate-100"
        >
            <ArrowLeft size={16} />
        </button>
    </div>
  );
};

const MenuButton = ({ onClick, icon, label }: any) => (
  <button onClick={onClick} className="p-4 bg-white border border-slate-200 rounded-xl hover:bg-red-50 hover:border-red-100 transition-all flex flex-col items-center gap-2 shadow-sm">
    <div className="text-slate-400">{icon}</div>
    <span className="font-bold text-slate-700 text-sm">{label}</span>
  </button>
);

const useSharedState = () => {
    const [state, setState] = useState(sharedState);
    useEffect(() => {
        const l = (s: any) => setState(s);
        listeners.push(l);
        return () => { listeners = listeners.filter(x => x !== l); };
    }, []);
    return state;
};

// --- MINI GAME COMPONENTS ---

const GameLogic: React.FC<{ gameType: MiniGame, player: Player, onWin: (p: Player | 'DRAW') => void }> = ({ gameType, player, onWin }) => {
    // Safety delay to prevent accidental clicks from previous screen
    const [isReady, setIsReady] = useState(false);

    // Reset state on mount of a new game type
    useEffect(() => {
        // Small delay to prevent accidental inputs from win screen
        const timer = setTimeout(() => setIsReady(true), 500);

        if (player === 'P1') { // Only P1 initializes logic to avoid race cond
            sharedState = {}; // Clear again just to be safe
            switch(gameType) {
                case 'TAP_WAR': updateState({ p1Score: 50 }); break;
                case 'REFLEX': setTimeout(() => updateState({ color: 'GREEN', startTime: Date.now() }), 2000 + Math.random() * 4000); break;
                case 'MATH': generateMath(); break;
                case 'TIMING': updateState({ startTime: Date.now() }); break;
                case 'ODD_ONE': generateOddOne(); break;
                case 'REACTION': updateState({ active: false }); setTimeout(triggerReaction, 2000 + Math.random() * 3000); break;
                case 'HOLD': updateState({ p1Hold: false, p2Hold: false, goal: 5000, startHold: 0 }); break;
                case 'SPAM': spawnTarget(); break;
                case 'SIMON': generateSymbolGame(); break;
                case 'HIGH_LOW': generateHighLow(); break;
            }
        }
        return () => clearTimeout(timer);
    }, [gameType]);

    const state = useSharedState();

    // Prevent interaction until ready
    const handleInteraction = (callback: () => void) => {
      if (isReady) callback();
    };

    // -- GAMES --

    // 1. TAP WAR
    if (gameType === 'TAP_WAR') {
        const handleTap = () => {
            const diff = player === 'P1' ? 5 : -5;
            const newScore = (state.p1Score || 50) + diff;
            updateState({ p1Score: newScore });
            if (newScore >= 100) onWin('P1');
            if (newScore <= 0) onWin('P2');
        };
        const height = player === 'P1' ? state.p1Score : 100 - (state.p1Score || 50);
        return (
            <div onPointerDown={() => handleInteraction(handleTap)} className="w-full h-full flex items-center justify-center active:bg-black/5 transition-colors cursor-pointer select-none">
                <div className="text-center pointer-events-none">
                    <h3 className="text-4xl font-black opacity-20">TAP!</h3>
                    <div className="h-4 w-64 bg-slate-200 rounded-full mt-4 overflow-hidden relative">
                         <div style={{ width: `${height}%` }} className={`h-full transition-all duration-75 ${player === 'P1' ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. REFLEX
    if (gameType === 'REFLEX') {
        const handleClick = () => {
            if (!state.color) { // Clicked too early
                 onWin(player === 'P1' ? 'P2' : 'P1'); 
            } else {
                 onWin(player);
            }
        };
        return (
             <div onPointerDown={() => handleInteraction(handleClick)} className={`w-full h-full flex items-center justify-center cursor-pointer transition-colors duration-0 ${state.color ? 'bg-green-500' : 'bg-transparent'}`}>
                 {!state.color ? <div className="text-slate-400 font-bold">AGUARDE O VERDE...</div> : <div className="text-white font-black text-4xl">AGORA!</div>}
             </div>
        );
    }

    // 3. MATH
    if (gameType === 'MATH') {
        if (!state.q) return null;
        const checkAnswer = (ans: number) => {
            if (ans === state.a) onWin(player);
            else onWin(player === 'P1' ? 'P2' : 'P1'); // Wrong answer loses
        };
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-5xl font-mono font-bold text-slate-800 mb-4">{state.q}</div>
                <div className="grid grid-cols-2 gap-4 w-full px-8">
                    {state.options.map((opt: number, i: number) => (
                        <button key={i} onPointerDown={() => handleInteraction(() => checkAnswer(opt))} className="py-4 bg-white border border-slate-300 rounded-xl font-bold text-xl active:bg-slate-200">
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 4. TIMING
    if (gameType === 'TIMING') {
        const [time, setTime] = useState(0);
        const running = !state[player + 'Done'];
        
        // Local timer for display
        useEffect(() => {
            let interval: any;
            if (running && state.startTime) {
                interval = setInterval(() => {
                    setTime((Date.now() - state.startTime) / 1000);
                }, 50);
            }
            return () => clearInterval(interval);
        }, [running, state.startTime]);

        const handleStop = () => {
            if (!running) return;
            const finalTime = (Date.now() - state.startTime) / 1000;
            updateState({ [player + 'Done']: true, [player + 'Time']: finalTime });
            
            // If both done, check winner
            if ((player === 'P1' && state.P2Done) || (player === 'P2' && state.P1Done)) {
                 const t1 = Math.abs(5.0 - (player === 'P1' ? finalTime : state.P1Time));
                 const t2 = Math.abs(5.0 - (player === 'P2' ? finalTime : state.P2Time));
                 setTimeout(() => onWin(t1 < t2 ? 'P1' : 'P2'), 1000);
            }
        };

        return (
             <div onPointerDown={() => handleInteraction(handleStop)} className="w-full h-full flex flex-col items-center justify-center active:bg-black/5 cursor-pointer">
                 <div className="text-slate-400 text-sm font-bold mb-2">PARE EM 5.000s</div>
                 <div className="text-6xl font-mono font-black text-slate-800">
                     {running ? time.toFixed(3) : state[player + 'Time']?.toFixed(3)}
                 </div>
                 {!running && <div className="text-green-500 font-bold mt-2">TRAVADO</div>}
             </div>
        );
    }

    // 5. ODD ONE
    if (gameType === 'ODD_ONE') {
        if (!state.grid) return null;
        const check = (isTarget: boolean) => {
            if (isTarget) onWin(player);
        };
        return (
            <div className="w-full h-full grid grid-cols-4 gap-2 p-4 content-center">
                {state.grid.map((item: any, i: number) => (
                    <button key={i} onPointerDown={() => handleInteraction(() => check(item.isTarget))} className="aspect-square bg-white rounded-lg flex items-center justify-center text-3xl shadow-sm active:scale-90 transition-transform">
                        {item.icon}
                    </button>
                ))}
            </div>
        );
    }

    // 6. REACTION (Wait for icon)
    if (gameType === 'REACTION') {
         const handleClick = () => {
             if (state.active) onWin(player);
         };
         return (
             <div onPointerDown={() => handleInteraction(handleClick)} className="w-full h-full flex items-center justify-center cursor-pointer">
                 {state.active ? <Zap className="w-24 h-24 text-yellow-500 animate-bounce" /> : <div className="w-4 h-4 bg-slate-300 rounded-full animate-pulse"></div>}
             </div>
         );
    }

    // 7. HOLD (Hold button, release at 5s - simplified to: Hold until Full)
    if (gameType === 'HOLD') {
        // Change: Hold button to fill bar first
        const isHolding = state[player + 'Holding'];
        const progress = state[player + 'Progress'] || 0;
        
        useEffect(() => {
             let int: any;
             if (isHolding) {
                 int = setInterval(() => {
                     const p = (state[player + 'Progress'] || 0) + 2;
                     updateState({ [player + 'Progress']: p });
                     if (p >= 100) onWin(player);
                 }, 50);
             }
             return () => clearInterval(int);
        }, [isHolding, state[player + 'Progress']]);

        return (
            <div 
              onPointerDown={() => handleInteraction(() => updateState({ [player + 'Holding']: true }))}
              onPointerUp={() => updateState({ [player + 'Holding']: false })}
              onPointerLeave={() => updateState({ [player + 'Holding']: false })}
              className="w-full h-full flex flex-col items-center justify-center gap-4 select-none cursor-pointer active:bg-black/5"
            >
                <div className="font-bold text-slate-400">SEGURE PARA ENCHER!</div>
                <div className="w-32 h-64 bg-slate-200 rounded-2xl overflow-hidden relative border-4 border-slate-300">
                     <div style={{ height: `${progress}%` }} className={`w-full absolute bottom-0 transition-all ${player === 'P1' ? 'bg-red-500' : 'bg-slate-700'}`}></div>
                </div>
            </div>
        );
    }

    // 8. SPAM (Target Practice)
    if (gameType === 'SPAM') {
        const handleClick = (id: string) => {
            if (id === state.targetId) {
                const s = (state[player + 'Score'] || 0) + 1;
                updateState({ [player + 'Score']: s });
                if (s >= 5) onWin(player);
                spawnTarget();
            }
        };
        
        if (!state.targetPos) return null;

        return (
            <div className="w-full h-full relative overflow-hidden">
                <div className="absolute top-2 right-2 text-xl font-bold opacity-50">{state[player + 'Score'] || 0}/5</div>
                <button 
                   onPointerDown={() => handleInteraction(() => handleClick(state.targetId))}
                   style={{ left: `${state.targetPos.x}%`, top: `${state.targetPos.y}%` }}
                   className="absolute w-16 h-16 -ml-8 -mt-8 bg-red-500 rounded-full border-4 border-white shadow-lg active:scale-90 transition-transform"
                >
                    <Target className="w-full h-full p-2 text-white" />
                </button>
            </div>
        );
    }

    // 9. HIGH LOW
    if (gameType === 'HIGH_LOW') {
        if (!state.currentNum) return null;
        const guess = (dir: 'HIGH' | 'LOW') => {
             const next = state.nextNum;
             const isCorrect = (dir === 'HIGH' && next > state.currentNum) || (dir === 'LOW' && next < state.currentNum);
             if (isCorrect) onWin(player);
             else onWin(player === 'P1' ? 'P2' : 'P1');
        };
        return (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                <div className="text-6xl font-black text-slate-800">{state.currentNum}</div>
                <div className="text-sm text-slate-400 font-bold mb-4">O PRÓXIMO É? (1-100)</div>
                <div className="flex gap-4">
                    <button onPointerDown={() => handleInteraction(() => guess('LOW'))} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold">MENOR</button>
                    <button onPointerDown={() => handleInteraction(() => guess('HIGH'))} className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold">MAIOR</button>
                </div>
            </div>
        );
    }

    // 10. SIMON (Now SYMBOL FIND)
    if (gameType === 'SIMON') {
        if (!state.targetSymbol || !state.symbolGrid) return null;
        
        const check = (symbol: string) => {
            if (symbol === state.targetSymbol) onWin(player);
            else onWin(player === 'P1' ? 'P2' : 'P1');
        };

        return (
            <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase block text-center mb-1">ENCONTRE</span>
                    <div className="text-4xl bg-white p-2 rounded-lg border border-slate-200 shadow-sm">{state.targetSymbol}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-2">
                    {state.symbolGrid.map((s: string, i: number) => (
                         <button key={i} onPointerDown={() => handleInteraction(() => check(s))} className="w-16 h-16 bg-white rounded-lg text-2xl border border-slate-200 shadow-sm flex items-center justify-center active:bg-slate-100">
                             {s}
                         </button>
                    ))}
                </div>
            </div>
        );
    }

    return <div className="p-4 text-center">Carregando...</div>;
};

// --- GAME HELPERS ---

function generateMath() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ans = a + b;
    const options = [ans, ans + 1, ans - 1, ans + 2].sort(() => Math.random() - 0.5);
    updateState({ q: `${a} + ${b}`, a: ans, options });
}

function generateOddOne() {
    const emojis = ['🍎', '🍌', '🍒', '🍇', '🍉'];
    const target = emojis[Math.floor(Math.random() * emojis.length)];
    const others = emojis.filter(e => e !== target);
    const filler = others[Math.floor(Math.random() * others.length)];
    
    const grid = Array(16).fill(null).map(() => ({ icon: filler, isTarget: false }));
    const idx = Math.floor(Math.random() * 16);
    grid[idx] = { icon: target, isTarget: true };
    updateState({ grid });
}

function triggerReaction() {
    updateState({ active: true });
}

function spawnTarget() {
    updateState({ 
        targetPos: { x: 20 + Math.random() * 60, y: 20 + Math.random() * 60 },
        targetId: Math.random().toString()
    });
}

function generateHighLow() {
    const current = Math.floor(Math.random() * 80) + 10;
    let next = Math.floor(Math.random() * 80) + 10;
    while (next === current) next = Math.floor(Math.random() * 80) + 10;
    updateState({ currentNum: current, nextNum: next });
}

function generateSymbolGame() {
    const emojis = ['🌟', '🌙', '☀️', '⚡', '🔥', '💧', '❄️', '🌈', '🍀', '🍎', '🚗', '👻'];
    const target = emojis[Math.floor(Math.random() * emojis.length)];
    
    // Generate grid of 9 items
    let grid = [];
    // Add target
    grid.push(target);
    // Fill rest with random other emojis
    while(grid.length < 9) {
        const rand = emojis[Math.floor(Math.random() * emojis.length)];
        if (rand !== target) grid.push(rand);
    }
    // Shuffle
    grid = grid.sort(() => Math.random() - 0.5);
    
    updateState({ targetSymbol: target, symbolGrid: grid });
}

export default TwoPlayerGames;