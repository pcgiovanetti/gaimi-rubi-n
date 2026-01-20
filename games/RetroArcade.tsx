import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, ArrowLeft, ArrowUp, ArrowDown, ArrowRight, Circle } from 'lucide-react';

type GameType = 'MENU' | 'SNAKE' | 'PONG' | 'BREAKOUT' | 'INVADERS' | 'DODGE';

const RetroArcade: React.FC = () => {
  const [currentGame, setCurrentGame] = useState<GameType>('MENU');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // Game Loop Ref
  const requestRef = useRef<number>(0);
  const gameStateRef = useRef<any>({});

  // Helper to handle input from both keyboard and virtual buttons
  const handleInput = (key: string) => {
    const state = gameStateRef.current;
    
    // Global restart
    if (isGameOver && key === 'Space') {
       if (canvasRef.current) initGame(currentGame, canvasRef.current.width, canvasRef.current.height);
       return;
    }

    switch (currentGame) {
      case 'SNAKE':
        if (key === 'ArrowUp' && state.dir.y === 0) state.nextDir = { x: 0, y: -1 };
        if (key === 'ArrowDown' && state.dir.y === 0) state.nextDir = { x: 0, y: 1 };
        if (key === 'ArrowLeft' && state.dir.x === 0) state.nextDir = { x: -1, y: 0 };
        if (key === 'ArrowRight' && state.dir.x === 0) state.nextDir = { x: 1, y: 0 };
        break;
      case 'PONG':
        // Pong input is continuous, handled by state flags, see helper below
        break;
    }
  };

  // State for continuous button pressing (for Pong/Breakout)
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});

  const setKey = (key: string, pressed: boolean) => {
    setPressedKeys(prev => ({ ...prev, [key]: pressed }));
  };

  // Initialize Game State based on type
  const initGame = (type: GameType, width: number, height: number) => {
    setScore(0);
    setIsGameOver(false);
    setPressedKeys({});

    switch (type) {
      case 'SNAKE':
        gameStateRef.current = {
          gridSize: 20,
          snake: [{ x: 10, y: 10 }],
          food: { x: 15, y: 15 },
          dir: { x: 1, y: 0 },
          nextDir: { x: 1, y: 0 },
          speed: 10, // Frames per move
          frame: 0
        };
        break;
      case 'PONG':
        gameStateRef.current = {
          paddleH: 80,
          paddleW: 10,
          p1: { y: height / 2 - 40, score: 0 },
          p2: { y: height / 2 - 40, score: 0 }, // AI
          ball: { x: width / 2, y: height / 2, dx: 5, dy: 5, size: 10 }
        };
        break;
      case 'BREAKOUT':
        const cols = 8;
        const rows = 5;
        const bricks = [];
        const bW = width / cols;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (Math.random() > 0.1) {
               bricks.push({ x: c * bW, y: r * 20 + 40, w: bW - 2, h: 18, active: true });
            }
          }
        }
        gameStateRef.current = {
          paddle: { x: width / 2 - 50, w: 100, h: 10 },
          ball: { x: width / 2, y: height - 30, dx: 4, dy: -4, size: 8 },
          bricks
        };
        break;
      case 'INVADERS':
         gameStateRef.current = {
             player: { x: width / 2, w: 30, h: 20 },
             bullets: [],
             enemies: [],
             frame: 0,
             enemySpeed: 1,
             spawnRate: 60
         };
         break;
      case 'DODGE':
          gameStateRef.current = {
              player: { x: width / 2, w: 20, h: 20 },
              rocks: [],
              frame: 0,
              speed: 5
          };
          break;
    }
  };

  useEffect(() => {
    if (currentGame === 'MENU') return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize
    const handleResize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Initial Setup
    initGame(currentGame, canvas.width, canvas.height);

    // Keyboard Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
        handleInput(e.key);
        setKey(e.key, true);
        if (e.key === ' ') handleInput('Space');
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        setKey(e.key, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- GAME LOOPS ---

    const updateSnake = (width: number, height: number) => {
        const state = gameStateRef.current;
        state.frame++;
        if (state.frame % state.speed === 0) {
            state.dir = state.nextDir;
            const head = { ...state.snake[0] };
            head.x += state.dir.x;
            head.y += state.dir.y;

            const cols = Math.floor(width / state.gridSize);
            const rows = Math.floor(height / state.gridSize);
            
            if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
                setIsGameOver(true);
                return;
            }
            if (state.snake.some((s: any) => s.x === head.x && s.y === head.y)) {
                setIsGameOver(true);
                return;
            }

            state.snake.unshift(head);

            if (head.x === state.food.x && head.y === state.food.y) {
                setScore(s => s + 10);
                state.food = {
                    x: Math.floor(Math.random() * cols),
                    y: Math.floor(Math.random() * rows)
                };
                if (state.speed > 2) state.speed--;
            } else {
                state.snake.pop();
            }
        }
    };

    const drawSnake = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = gameStateRef.current;
        const gs = state.gridSize;
        ctx.fillStyle = '#ef4444';
        state.snake.forEach((s: any) => ctx.fillRect(s.x * gs, s.y * gs, gs - 2, gs - 2));
        ctx.fillStyle = '#334155';
        ctx.fillRect(state.food.x * gs, state.food.y * gs, gs - 2, gs - 2);
    };

    const updatePong = (width: number, height: number) => {
        const state = gameStateRef.current;
        
        // Use pressedKeys state which is updated by both Keyboard and Touch buttons
        if (pressedKeys['ArrowUp']) state.p1.y -= 8;
        if (pressedKeys['ArrowDown']) state.p1.y += 8;
        state.p1.y = Math.max(0, Math.min(height - state.paddleH, state.p1.y));

        const center = state.p2.y + state.paddleH / 2;
        if (center < state.ball.y - 10) state.p2.y += 6;
        if (center > state.ball.y + 10) state.p2.y -= 6;
        state.p2.y = Math.max(0, Math.min(height - state.paddleH, state.p2.y));

        state.ball.x += state.ball.dx;
        state.ball.y += state.ball.dy;

        if (state.ball.y <= 0 || state.ball.y >= height) state.ball.dy *= -1;

        if (state.ball.x <= state.paddleW + 10 && 
            state.ball.y >= state.p1.y && 
            state.ball.y <= state.p1.y + state.paddleH) {
                state.ball.dx = Math.abs(state.ball.dx) + 0.5;
        }

        if (state.ball.x >= width - state.paddleW - 10 && 
            state.ball.y >= state.p2.y && 
            state.ball.y <= state.p2.y + state.paddleH) {
                state.ball.dx = -Math.abs(state.ball.dx) - 0.5;
        }

        if (state.ball.x < 0) setIsGameOver(true);
        if (state.ball.x > width) {
            state.ball.x = width / 2;
            state.ball.y = height / 2;
            state.ball.dx = -5;
            state.ball.dy = 5;
            setScore(s => s + 1);
        }
    };

    const drawPong = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = gameStateRef.current;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(10, state.p1.y, state.paddleW, state.paddleH);
        ctx.fillRect(width - 10 - state.paddleW, state.p2.y, state.paddleW, state.paddleH);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const updateBreakout = (width: number, height: number) => {
        const state = gameStateRef.current;
        if (pressedKeys['ArrowLeft']) state.paddle.x -= 8;
        if (pressedKeys['ArrowRight']) state.paddle.x += 8;
        state.paddle.x = Math.max(0, Math.min(width - state.paddle.w, state.paddle.x));

        state.ball.x += state.ball.dx;
        state.ball.y += state.ball.dy;

        if (state.ball.x <= 0 || state.ball.x >= width) state.ball.dx *= -1;
        if (state.ball.y <= 0) state.ball.dy *= -1;
        
        if (state.ball.y + state.ball.size >= height - 30 &&
            state.ball.x >= state.paddle.x &&
            state.ball.x <= state.paddle.x + state.paddle.w) {
            state.ball.dy = -Math.abs(state.ball.dy);
        }

        if (state.ball.y > height) setIsGameOver(true);

        state.bricks.forEach((b: any) => {
            if (!b.active) return;
            if (state.ball.x > b.x && state.ball.x < b.x + b.w &&
                state.ball.y > b.y && state.ball.y < b.y + b.h) {
                    state.ball.dy *= -1;
                    b.active = false;
                    setScore(s => s + 10);
                }
        });

        if (state.bricks.every((b: any) => !b.active)) {
             state.bricks.forEach((b: any) => b.active = true);
             state.ball.dx *= 1.1;
             state.ball.dy *= 1.1;
        }
    };

    const drawBreakout = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = gameStateRef.current;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(state.paddle.x, height - 30, state.paddle.w, state.paddle.h);
        
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, state.ball.size, 0, Math.PI * 2);
        ctx.fill();

        state.bricks.forEach((b: any) => {
            if (b.active) {
                ctx.fillStyle = '#64748b';
                ctx.fillRect(b.x, b.y, b.w, b.h);
            }
        });
    };

    const updateInvaders = (width: number, height: number) => {
        const state = gameStateRef.current;
        state.frame++;

        if (pressedKeys['ArrowLeft']) state.player.x -= 5;
        if (pressedKeys['ArrowRight']) state.player.x += 5;
        state.player.x = Math.max(0, Math.min(width - state.player.w, state.player.x));

        if (pressedKeys[' '] && state.frame % 15 === 0) {
            state.bullets.push({ x: state.player.x + state.player.w / 2, y: height - 40, active: true });
        }

        if (state.frame % state.spawnRate === 0) {
            state.enemies.push({ x: Math.random() * (width - 30), y: -20, w: 30, h: 20 });
            if (state.spawnRate > 20) state.spawnRate--;
        }

        state.bullets.forEach((b: any) => {
            b.y -= 8;
            if (b.y < 0) b.active = false;
        });

        for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            e.y += state.enemySpeed + (score / 500);

            if (e.y > height) {
                setIsGameOver(true);
            }

            state.bullets.forEach((b: any) => {
                if (b.active && b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
                    b.active = false;
                    state.enemies.splice(i, 1);
                    setScore(s => s + 50);
                }
            });
        }
    };

    const drawInvaders = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = gameStateRef.current;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(state.player.x, height - 30, state.player.w, state.player.h);

        ctx.fillStyle = '#ef4444';
        state.bullets.forEach((b: any) => {
            if (b.active) ctx.fillRect(b.x - 2, b.y, 4, 10);
        });

        ctx.fillStyle = '#1e293b';
        state.enemies.forEach((e: any) => {
            ctx.fillRect(e.x, e.y, e.w, e.h);
        });
    };

    const updateDodge = (width: number, height: number) => {
        const state = gameStateRef.current;
        state.frame++;

        if (pressedKeys['ArrowLeft']) state.player.x -= 8;
        if (pressedKeys['ArrowRight']) state.player.x += 8;
        state.player.x = Math.max(0, Math.min(width - state.player.w, state.player.x));

        if (state.frame % 10 === 0) {
            const size = 20 + Math.random() * 40;
            state.rocks.push({ x: Math.random() * (width - size), y: -size, w: size, h: size });
        }

        for (let i = state.rocks.length - 1; i >= 0; i--) {
            const r = state.rocks[i];
            r.y += state.speed + (score / 1000); 

            if (r.y > height) {
                state.rocks.splice(i, 1);
                setScore(s => s + 10);
            }

            if (state.player.x < r.x + r.w &&
                state.player.x + state.player.w > r.x &&
                height - 50 < r.y + r.h &&
                height - 30 > r.y) {
                    setIsGameOver(true);
            }
        }
    };

    const drawDodge = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        const state = gameStateRef.current;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(state.player.x, height - 50, state.player.w, state.player.h);

        ctx.fillStyle = '#64748b';
        state.rocks.forEach((r: any) => {
            ctx.fillRect(r.x, r.y, r.w, r.h);
        });
    };

    // MAIN GAME LOOP
    const loop = () => {
        if (!canvasRef.current || isGameOver) return;
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const w = canvasRef.current.width;
        const h = canvasRef.current.height;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        switch (currentGame) {
            case 'SNAKE': updateSnake(w, h); drawSnake(ctx, w, h); break;
            case 'PONG': updatePong(w, h); drawPong(ctx, w, h); break;
            case 'BREAKOUT': updateBreakout(w, h); drawBreakout(ctx, w, h); break;
            case 'INVADERS': updateInvaders(w, h); drawInvaders(ctx, w, h); break;
            case 'DODGE': updateDodge(w, h); drawDodge(ctx, w, h); break;
        }

        if (!isGameOver) {
            requestRef.current = requestAnimationFrame(loop);
        }
    };

    if (!isGameOver) {
        requestRef.current = requestAnimationFrame(loop);
    }

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        cancelAnimationFrame(requestRef.current);
    };
  }, [currentGame, isGameOver, pressedKeys]);

  // RENDER UI
  if (currentGame === 'MENU') {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
        <div className="text-center z-10 w-full">
          <div className="mb-8 flex justify-center">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
              <Gamepad2 className="w-12 h-12 text-red-500" />
            </div>
          </div>
          <h2 className="text-4xl font-light text-slate-800 mb-2">Retro Arcade</h2>
          <p className="text-slate-400 mb-8">Selecione um clássico</p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl px-4 mx-auto">
            {['SNAKE', 'PONG', 'BREAKOUT', 'INVADERS', 'DODGE'].map((g) => (
                <button key={g} onClick={() => setCurrentGame(g as GameType)} className="p-6 bg-white hover:bg-red-50 hover:border-red-100 border border-slate-200 rounded-xl transition-all shadow-sm group">
                  <h3 className="font-bold text-slate-700 group-hover:text-red-500 capitalize">{g}</h3>
                  <p className="text-xs text-slate-400 mt-1">Jogar</p>
                </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Determine which controls to show
  const showUD = currentGame === 'SNAKE' || currentGame === 'PONG';
  const showLR = currentGame === 'SNAKE' || currentGame === 'BREAKOUT' || currentGame === 'INVADERS' || currentGame === 'DODGE';
  const showAction = currentGame === 'INVADERS' || isGameOver;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas ref={canvasRef} className="block w-full h-full bg-white touch-none" />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-4 pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-4 py-1 rounded-full border border-slate-200 shadow-sm">
           <span className="text-xs font-bold text-slate-400 uppercase mr-2">{currentGame}</span>
           <span className="font-mono font-bold text-slate-800">{score}</span>
        </div>
      </div>

      <div className="absolute top-4 left-4 pointer-events-auto">
        <button 
          onClick={() => {
              setIsGameOver(true);
              setCurrentGame('MENU');
          }}
          className="p-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full text-slate-600 hover:text-red-500 transition-colors shadow-sm ml-[120px]"
        >
          <ArrowLeft size={16} />
        </button>
      </div>

      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-20">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">Fim de Jogo</h3>
            <p className="text-slate-500 mb-6">Pontuação Final: <span className="text-red-500 font-bold">{score}</span></p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setCurrentGame('MENU')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
              >
                Menu
              </button>
              <button 
                onClick={() => {
                   if (canvasRef.current) initGame(currentGame, canvasRef.current.width, canvasRef.current.height);
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium shadow-md shadow-red-500/20"
              >
                Jogar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIRTUAL CONTROLS OVERLAY */}
      {!isGameOver && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-between px-8 pb-4 pointer-events-none select-none">
             {/* D-Pad Area */}
             <div className="pointer-events-auto flex flex-col items-center gap-2">
                 {showUD && (
                     <button 
                       className="w-14 h-14 bg-slate-100/80 backdrop-blur border border-slate-300 rounded-full flex items-center justify-center active:bg-red-100 active:text-red-500 transition-colors shadow-sm"
                       onPointerDown={() => { handleInput('ArrowUp'); setKey('ArrowUp', true); }}
                       onPointerUp={() => setKey('ArrowUp', false)}
                       onPointerLeave={() => setKey('ArrowUp', false)}
                     >
                         <ArrowUp size={24} />
                     </button>
                 )}
                 <div className="flex gap-4">
                     {showLR && (
                         <button 
                           className="w-14 h-14 bg-slate-100/80 backdrop-blur border border-slate-300 rounded-full flex items-center justify-center active:bg-red-100 active:text-red-500 transition-colors shadow-sm"
                           onPointerDown={() => { handleInput('ArrowLeft'); setKey('ArrowLeft', true); }}
                           onPointerUp={() => setKey('ArrowLeft', false)}
                           onPointerLeave={() => setKey('ArrowLeft', false)}
                         >
                             <ArrowLeft size={24} />
                         </button>
                     )}
                     {showLR && (
                         <button 
                           className="w-14 h-14 bg-slate-100/80 backdrop-blur border border-slate-300 rounded-full flex items-center justify-center active:bg-red-100 active:text-red-500 transition-colors shadow-sm"
                           onPointerDown={() => { handleInput('ArrowRight'); setKey('ArrowRight', true); }}
                           onPointerUp={() => setKey('ArrowRight', false)}
                           onPointerLeave={() => setKey('ArrowRight', false)}
                         >
                             <ArrowRight size={24} />
                         </button>
                     )}
                 </div>
                 {showUD && (
                     <button 
                       className="w-14 h-14 bg-slate-100/80 backdrop-blur border border-slate-300 rounded-full flex items-center justify-center active:bg-red-100 active:text-red-500 transition-colors shadow-sm"
                       onPointerDown={() => { handleInput('ArrowDown'); setKey('ArrowDown', true); }}
                       onPointerUp={() => setKey('ArrowDown', false)}
                       onPointerLeave={() => setKey('ArrowDown', false)}
                     >
                         <ArrowDown size={24} />
                     </button>
                 )}
             </div>

             {/* Action Buttons Area */}
             {showAction && (
                 <div className="pointer-events-auto flex items-end mb-4">
                     <button 
                       className="w-16 h-16 bg-red-50/80 backdrop-blur border border-red-200 rounded-full flex items-center justify-center text-red-500 active:bg-red-500 active:text-white transition-colors shadow-sm"
                       onPointerDown={() => { handleInput('Space'); setKey(' ', true); }}
                       onPointerUp={() => setKey(' ', false)}
                     >
                         <Circle size={24} fill="currentColor" className="opacity-50" />
                     </button>
                 </div>
             )}
          </div>
      )}
    </div>
  );
};

export default RetroArcade;