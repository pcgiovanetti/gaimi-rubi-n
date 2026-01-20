import React, { useEffect, useRef, useState } from 'react';
import { Target, ArrowUp, ArrowDown, ShoppingBag, Lock, Shield, Zap, Plus, Palette, Check } from 'lucide-react';

const StickRun: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'SHOP'>('START');
  const [shopTab, setShopTab] = useState<'UPGRADES' | 'SKINS'>('UPGRADES');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [ammo, setAmmo] = useState(2);
  const [bossActive, setBossActive] = useState(false);
  const [bossHealth, setBossHealth] = useState(0);
  const [bossMaxHealth, setBossMaxHealth] = useState(10);

  // Skins Configuration
  const SKINS = [
      { id: 'default', name: 'Clássico', body: '#0f172a', scarf: '#ef4444', price: 0 },
      { id: 'shadow', name: 'Sombra', body: '#000000', scarf: '#fbbf24', price: 1000 },
      { id: 'cyber', name: 'Cyber', body: '#0891b2', scarf: '#f472b6', price: 2500 },
      { id: 'specops', name: 'Tático', body: '#14532d', scarf: '#f97316', price: 5000 },
  ];
  const [currentSkin, setCurrentSkin] = useState(SKINS[0]);

  // Game Configuration
  const GROUND_HEIGHT = 50;
  const GRAVITY = 0.8;
  const JUMP_FORCE = -14;
  const SPEED_INITIAL = 4;
  const MAX_AMMO = 2;
  const BULLET_SPEED = 40; 

  // Touch handling refs
  const touchRef = useRef({ startX: 0, startY: 0, isTouching: false });

  // Refs for logic
  const gameRef = useRef({
    player: { 
      x: 60, 
      y: 0, 
      w: 30, 
      h: 60, 
      dy: 0, 
      grounded: true, 
      crouching: false,
      isDead: false,
      rotation: 0
    },
    skin: { body: SKINS[0].body, scarf: SKINS[0].scarf }, // Sync with state
    boss: {
        active: false,
        stage: 0,
        x: 0,
        y: 0,
        w: 120,
        h: 300,
        hp: 0,
        maxHp: 0,
        cooldown: 0,
        defeatedStages: [] as number[]
    },
    obstacles: [] as any[],
    bullets: [] as any[],
    enemyBullets: [] as any[],
    particles: [] as any[],
    clouds: [] as any[],
    speed: SPEED_INITIAL,
    distance: 0,
    frame: 0,
    scoreFloat: 0,
    width: 0,
    height: 0,
    animationId: 0
  });

  // Update ref when skin changes
  useEffect(() => {
      gameRef.current.skin = { body: currentSkin.body, scarf: currentSkin.scarf };
  }, [currentSkin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- SETUP ---
    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      gameRef.current.width = canvas.width;
      gameRef.current.height = canvas.height;
      
      // Initialize clouds
      if (gameRef.current.clouds.length === 0) {
          for(let i=0; i<5; i++) {
              gameRef.current.clouds.push({
                  x: Math.random() * canvas.width,
                  y: Math.random() * (canvas.height/2),
                  w: 60 + Math.random() * 100,
                  speed: 0.5 + Math.random() * 0.5
              });
          }
      }

      if (gameState === 'START') {
         gameRef.current.player.y = canvas.height - GROUND_HEIGHT - 60;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // --- INPUTS ---
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState !== 'PLAYING') return;
        
        if (e.code === 'Space' || e.code === 'ArrowUp') jump();
        if (e.code === 'ArrowDown') gameRef.current.player.crouching = true;
        if (e.code === 'KeyF' || e.code === 'ArrowRight') shoot();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'ArrowDown') gameRef.current.player.crouching = false;
    };

    const jump = () => {
        const p = gameRef.current.player;
        if (p.grounded) {
            p.dy = JUMP_FORCE;
            p.grounded = false;
            // Add jump particles
            spawnParticles(p.x + p.w/2, p.y + p.h, '#cbd5e1', 5);
        }
    };

    const shoot = () => {
        if (ammo > 0) {
            setAmmo(prev => prev - 1);
            const p = gameRef.current.player;
            const bulletY = p.crouching ? p.y + 20 : p.y + 25;
            gameRef.current.bullets.push({
                x: p.x + 30,
                y: bulletY,
                w: 12,
                h: 4,
                active: true,
                trail: [], // For visual trail
                prevX: p.x + 30 // For collision interpolation
            });
            // Recoil
            spawnParticles(p.x + p.w, bulletY, '#fbbf24', 3);
        }
    };

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
        for (let i = 0; i < count; i++) {
            gameRef.current.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    };

    // --- TOUCH CONTROLS ---
    const handleTouchStart = (e: TouchEvent) => {
        if (gameState !== 'PLAYING') return;
        const touch = e.changedTouches[0];
        touchRef.current.startX = touch.clientX;
        touchRef.current.startY = touch.clientY;
        touchRef.current.isTouching = true;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (gameState !== 'PLAYING') return;
        touchRef.current.isTouching = false;
        
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - touchRef.current.startX;
        const diffY = touch.clientY - touchRef.current.startY;

        gameRef.current.player.crouching = false;

        if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
            // Tap
            if (touch.clientX > window.innerWidth / 2) shoot();
            else jump();
        } else {
            // Swipe Up
            if (diffY < -30) jump();
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (gameState !== 'PLAYING') return;
        const touch = e.changedTouches[0];
        const diffY = touch.clientY - touchRef.current.startY;
        
        // Hold down to crouch
        if (diffY > 30) {
            gameRef.current.player.crouching = true;
        } else {
            gameRef.current.player.crouching = false;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove);

    // --- GAME LOOP ---
    const loop = () => {
        if (gameState !== 'PLAYING') {
            if (gameState === 'START' || gameState === 'SHOP') drawStatic(ctx);
            return;
        }
        update();
        draw(ctx);
        gameRef.current.animationId = requestAnimationFrame(loop);
    };

    const update = () => {
        const state = gameRef.current;
        const p = state.player;
        const boss = state.boss;
        const groundY = state.height - GROUND_HEIGHT;

        // 0. Update Distance (For floor animation)
        state.distance += state.speed;

        // 1. Passive Score
        if (!boss.active) {
            state.scoreFloat += 0.16;
        }
        const currentScore = Math.floor(state.scoreFloat);
        setScore(currentScore);

        // --- BOSS CHECK ---
        if (!boss.active) {
            if (currentScore >= 500 && !boss.defeatedStages.includes(1)) {
                startBoss(1);
            } else if (currentScore >= 1500 && !boss.defeatedStages.includes(2)) {
                startBoss(2);
            }
        }

        // 2. Player Physics
        if (!p.grounded) {
             p.dy += GRAVITY;
             p.y += p.dy;
        }

        const normalH = 60;
        const crouchH = 30;
        
        if (p.crouching) {
            p.h = crouchH;
            if (p.grounded) p.y = groundY - p.h;
        } else {
            p.h = normalH;
            if (p.grounded) p.y = groundY - p.h;
        }

        // 3. Ground/Hole Logic
        let onGround = false;
        // Use a slightly smaller hit box for the hole logic to be forgiving
        const overHole = state.obstacles.some(o => 
            o.type === 'HOLE' && 
            p.x + p.w * 0.5 > o.x && // Must be at least half way in
            p.x + p.w * 0.5 < o.x + o.w
        );

        if (!overHole) {
             // FIXED LANDING LOGIC
             // If we are NOT over a hole, we should snap to the ground if we are roughly near it.
             // We allow a large tolerance because high falling speed might skip the exact pixel.
             if (p.y + p.h >= groundY - 10) { // -10 allows snapping even if slightly above
                 // Only snap if we haven't fallen WAY below the screen (which means we fell in a previous hole)
                 if (p.y < state.height) {
                    p.y = groundY - p.h;
                    p.dy = 0;
                    p.grounded = true;
                    onGround = true;
                 }
             }
        } else {
            // We are over a hole
            p.grounded = false;
        }
        
        // Death by falling
        if (p.y > state.height) gameOver();

        // 4. Update Bullets (WITH SWEPT COLLISION)
        state.bullets.forEach(b => {
            b.prevX = b.x;
            b.x += BULLET_SPEED;
            b.trail.push({x: b.x, y: b.y});
            if (b.trail.length > 5) b.trail.shift();

            if (b.active) {
                // Check Boss
                if (boss.active) {
                    if (b.x + b.w > boss.x && b.prevX < boss.x + boss.w &&
                        b.y > boss.y && b.y < boss.y + boss.h) {
                            b.active = false;
                            boss.hp--;
                            setBossHealth(boss.hp);
                            spawnParticles(boss.x, b.y, '#ef4444', 5);
                            setAmmo(MAX_AMMO);

                            if (boss.hp <= 0) {
                                boss.active = false;
                                boss.defeatedStages.push(boss.stage);
                                setBossActive(false);
                                const reward = boss.stage === 1 ? 500 : 1000;
                                state.scoreFloat += reward;
                                spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ef4444', 50);
                                setAmmo(MAX_AMMO);
                            }
                    }
                }

                // Check Obstacles
                state.obstacles.forEach(o => {
                    if (!o.active) return;
                    if (o.type === 'ENEMY' || o.type === 'SNIPER') {
                        const bulletRight = b.x + b.w;
                        const bulletLeft = b.prevX; 
                        const enemyLeft = o.x;
                        const enemyRight = o.x + o.w;
                        const yOverlap = b.y < o.y + o.h && b.y + b.h > o.y;

                        if (yOverlap && bulletRight > enemyLeft && bulletLeft < enemyRight) {
                             o.active = false;
                             b.active = false;
                             setAmmo(MAX_AMMO);
                             if (!boss.active) {
                                 state.scoreFloat += 5;
                             }
                             spawnParticles(o.x + o.w/2, o.y + o.h/2, '#ef4444', 10);
                        }
                    }
                });
            }
        });
        state.bullets = state.bullets.filter(b => b.x < state.width && b.active);

        // Update Enemy Bullets
        state.enemyBullets.forEach(b => {
            b.x -= b.speed;
        });
        state.enemyBullets = state.enemyBullets.filter(b => b.x > 0 && b.active);

        // --- BULLET VS BULLET COLLISION ---
        state.bullets.forEach(pb => {
            if (!pb.active) return;
            state.enemyBullets.forEach(eb => {
                if (!eb.active) return;
                if (pb.x < eb.x + eb.w && pb.x + pb.w > eb.x && pb.y < eb.y + eb.h && pb.y + pb.h > eb.y) {
                        pb.active = false;
                        eb.active = false;
                        spawnParticles((pb.x + eb.x)/2, (pb.y + eb.y)/2, '#fbbf24', 8);
                }
            });
        });
        
        // Enemy Bullet Collision
        state.enemyBullets.forEach(b => {
             if (b.active && 
                 b.x < p.x + p.w && b.x + b.w > p.x && 
                 b.y < p.y + p.h && b.y + b.h > p.y) {
                     gameOver();
             }
        });

        // 6. Particles
        state.particles.forEach(pt => {
            pt.x += pt.vx;
            pt.y += pt.vy;
            pt.life -= 0.05;
        });
        state.particles = state.particles.filter(pt => pt.life > 0);

        // 7. Clouds
        state.clouds.forEach(c => {
            c.x -= c.speed;
            if (c.x + c.w < 0) {
                c.x = state.width;
                c.y = Math.random() * (state.height / 2);
            }
        });

        // 8. BOSS LOGIC
        if (boss.active) {
            const targetX = state.width - 150;
            if (boss.x > targetX) boss.x -= 3;
            else boss.x = targetX;
            
            boss.cooldown--;
            if (boss.cooldown <= 0) {
                const rand = Math.random();
                if (rand < 0.6) {
                    state.obstacles.push({
                        type: 'ENEMY',
                        x: boss.x,
                        y: groundY - 50,
                        w: 30, h: 50,
                        speed: state.speed + 1,
                        active: true
                    });
                } else {
                    state.obstacles.push({
                        type: 'MISSILE',
                        x: boss.x,
                        y: groundY - 55,
                        w: 40, h: 20,
                        speed: state.speed + 4,
                        active: true
                    });
                }
                boss.cooldown = boss.stage === 1 ? 80 : 50;
            }
            if (p.x + p.w > boss.x && p.x < boss.x + boss.w) gameOver();
        } else {
            // 9. Normal Spawning
            state.frame++;
            let lastObstacleRightX = state.obstacles.length > 0 ? state.obstacles[state.obstacles.length - 1].x + state.obstacles[state.obstacles.length - 1].w : -999;
            const distanceToEdge = state.width - lastObstacleRightX;
            const minGap = 400 + (Math.random() * 300); 

            if (state.obstacles.length === 0 || distanceToEdge > minGap) {
                 const rand = Math.random();
                 let type = 'ENEMY';
                 if (rand < 0.25) type = 'HOLE';
                 else if (rand < 0.5) type = 'MISSILE';
                 else if (rand > 0.8 && boss.defeatedStages.includes(1)) type = 'SNIPER';
                 
                 let obs: any = { type, x: state.width, active: true };

                 if (type === 'HOLE') {
                     obs.w = (120 + (state.speed * 4)) * 0.75;
                     obs.h = GROUND_HEIGHT;
                     obs.y = groundY;
                 } else if (type === 'MISSILE') {
                     obs.w = 40;
                     obs.h = 20;
                     obs.y = groundY - 50; 
                     obs.speed = state.speed * 1.8;
                 } else if (type === 'SNIPER') {
                     obs.w = 30;
                     obs.h = 50;
                     obs.y = groundY - 50;
                     obs.speed = state.speed; 
                     obs.hasShot = false;
                 } else { // ENEMY
                     obs.w = 30;
                     obs.h = 50;
                     obs.y = groundY - 50;
                     obs.speed = state.speed + 5; 
                 }
                 state.obstacles.push(obs);
            }
        }

        // 10. Obstacles Logic
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
            const o = state.obstacles[i];
            
            if (o.type === 'HOLE') o.x -= state.speed;
            else o.x -= (o.speed || state.speed);

            if (o.type === 'SNIPER' && o.active && !o.hasShot) {
                if (o.x < state.width - 50) {
                     o.hasShot = true;
                     state.enemyBullets.push({
                         x: o.x,
                         y: o.y + 15,
                         w: 15, h: 4,
                         speed: 25,
                         color: '#0f172a',
                         active: true
                     });
                     spawnParticles(o.x, o.y + 15, '#fbbf24', 3);
                }
            }

            if (o.x + o.w < 0) {
                state.obstacles.splice(i, 1);
                if (!boss.active) state.scoreFloat += 5; 
                if (Math.floor(state.scoreFloat) % 50 === 0 && !boss.active) state.speed += 0.5;
                continue;
            }

            if (o.type !== 'HOLE' && o.active) {
                const hitX = p.x + 8;
                const hitW = p.w - 16;
                const hitY = p.y + 4;
                const hitH = p.h - 8;
                if (hitX < o.x + o.w && hitX + hitW > o.x && hitY < o.y + o.h && hitY + hitH > o.y) {
                    gameOver();
                }
            }
        }
    };

    const startBoss = (stage: number) => {
        const state = gameRef.current;
        state.boss.active = true;
        state.boss.stage = stage;
        state.boss.hp = stage === 1 ? 15 : 30;
        state.boss.maxHp = state.boss.hp;
        state.boss.x = state.width + 100;
        state.boss.y = state.height - GROUND_HEIGHT - 280;
        setBossActive(true);
        setBossHealth(state.boss.hp);
        setBossMaxHealth(state.boss.maxHp);
    };

    // --- NEW PLAYER ANIMATION ---
    const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, crouching: boolean, grounded: boolean) => {
        const time = Date.now() / 80;
        const skin = gameRef.current.skin;
        const color = skin.body; 
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dimensions
        const headR = 6;
        const torsoH = crouching ? 15 : 25;
        const torsoY = y + (crouching ? 20 : 10);
        
        // 1. Scarf / Headband (Flowing back)
        ctx.beginPath();
        ctx.moveTo(x + w/2 - 2, torsoY - 2);
        const scarfY = Math.sin(time) * 5;
        ctx.quadraticCurveTo(x - 20, torsoY - 5 + scarfY, x - 40, torsoY + 10 + scarfY);
        ctx.strokeStyle = skin.scarf;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Reset style for body
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;

        // 2. Head
        ctx.beginPath();
        // Lean forward slightly
        ctx.arc(x + w/2 + 4, torsoY - 5, headR, 0, Math.PI * 2); 
        ctx.fill();

        // 3. Body (Torso)
        ctx.beginPath();
        ctx.moveTo(x + w/2, torsoY);
        ctx.lineTo(x + w/2 - 2, torsoY + torsoH);
        ctx.stroke();

        // 4. Legs (Better cycle)
        const hipX = x + w/2 - 2;
        const hipY = torsoY + torsoH;
        
        // Leg 1 (Front)
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        if (!grounded) {
             // Jump pose
             ctx.lineTo(hipX + 10, hipY + 10);
             ctx.lineTo(hipX + 5, hipY + 25);
        } else if (crouching) {
             // Slide pose
             ctx.lineTo(hipX + 15, hipY + 5);
             ctx.lineTo(hipX + 30, hipY + 5);
        } else {
             // Run cycle
             const l1 = Math.sin(time);
             const kneeX = hipX + (l1 * 10) + 5;
             const kneeY = hipY + 12 - (l1 * 2);
             const footX = kneeX + (l1 * 8);
             const footY = hipY + 25;
             ctx.lineTo(kneeX, kneeY);
             ctx.lineTo(footX, footY);
        }
        ctx.stroke();

        // Leg 2 (Back)
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        if (!grounded) {
             // Jump pose
             ctx.lineTo(hipX - 5, hipY + 12);
             ctx.lineTo(hipX - 10, hipY + 20);
        } else if (crouching) {
             // Slide pose (back leg tucked)
             ctx.lineTo(hipX - 10, hipY + 5);
             ctx.lineTo(hipX - 20, hipY + 5);
        } else {
             // Run cycle offset
             const l2 = Math.sin(time + Math.PI);
             const kneeX2 = hipX + (l2 * 10) + 5;
             const kneeY2 = hipY + 12 - (l2 * 2);
             const footX2 = kneeX2 + (l2 * 8);
             const footY2 = hipY + 25;
             ctx.lineTo(kneeX2, kneeY2);
             ctx.lineTo(footX2, footY2);
        }
        ctx.stroke();

        // 5. Arms (Holding gun)
        const shoulderX = x + w/2;
        const shoulderY = torsoY + 4;
        
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        // Arm pointing forward
        const handX = x + w + (crouching ? 5 : 0);
        const handY = shoulderY + (crouching ? 5 : 4);
        ctx.lineTo(shoulderX + 10, shoulderY + 5); // Elbow
        ctx.lineTo(handX, handY); // Hand
        ctx.stroke();
        
        // Gun
        ctx.fillStyle = '#334155';
        ctx.fillRect(handX - 2, handY - 4, 16, 6);
    };

    const drawEnemy = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, isBoss: boolean, isSniper: boolean) => {
         let color = isBoss ? '#7f1d1d' : (isSniper ? '#10b981' : '#ef4444');
         ctx.strokeStyle = color;
         ctx.lineWidth = isBoss ? 8 : 4;
         ctx.lineCap = 'round';
         ctx.lineJoin = 'round';

         const time = Date.now() / 80;
         const runCycle = Math.sin(time);
         
         const headR = isBoss ? 20 : 8;
         let headY = y + headR + 2;
         let bodyTop = headY + headR;
         let bodyBot = y + h - 20; 

         // Head
         ctx.beginPath();
         ctx.arc(x + w/2, headY, headR, 0, Math.PI * 2);
         ctx.stroke();
         
         // Sniper Eye
         if (isSniper) {
             ctx.fillStyle = '#000';
             ctx.fillRect(x + w/2 - 5, headY - 2, 10, 4);
         }

         // Body
         ctx.beginPath();
         ctx.moveTo(x + w/2, bodyTop);
         ctx.lineTo(x + w/2, bodyBot);
         ctx.stroke();

         // Legs (Simple run)
         if (!isSniper) {
             ctx.beginPath();
             ctx.moveTo(x + w/2, bodyBot);
             ctx.lineTo(x + w/2 - 10 + runCycle * 10, y + h);
             ctx.moveTo(x + w/2, bodyBot);
             ctx.lineTo(x + w/2 + 10 - runCycle * 10, y + h);
             ctx.stroke();
         } else {
             // Sniper stance
             ctx.beginPath();
             ctx.moveTo(x + w/2, bodyBot);
             ctx.lineTo(x + w/2 - 10, y + h);
             ctx.moveTo(x + w/2, bodyBot);
             ctx.lineTo(x + w/2 + 10, y + h);
             ctx.stroke();
         }

         // Arms
         ctx.beginPath();
         const shoulderY = bodyTop + (isBoss ? 20 : 5);
         ctx.moveTo(x + w/2, shoulderY);
         
         if (isSniper) {
             // Aiming
             ctx.lineTo(x - 15, shoulderY + 5);
             // Gun
             ctx.fillStyle = '#064e3b';
             ctx.fillRect(x - 25, shoulderY, 20, 6);
         } else {
             // Running arms
             ctx.lineTo(x + w/2 + 10 + runCycle * 10, shoulderY + 15);
         }
         ctx.stroke();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const state = gameRef.current;
        const { width, height } = state;
        const groundY = height - GROUND_HEIGHT;

        // Sky Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Clouds
        ctx.fillStyle = '#ffffff';
        state.clouds.forEach(c => {
            ctx.beginPath();
            ctx.roundRect(c.x, c.y, c.w, 30, 15);
            ctx.fill();
        });

        // Ground with Speed Lines
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, groundY, width, GROUND_HEIGHT);
        
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        const lineOffset = state.distance % 100;
        for(let i=0; i<width; i+=100) {
            ctx.beginPath();
            ctx.moveTo(i - lineOffset, groundY + 10);
            ctx.lineTo(i - lineOffset + 50, groundY + 10);
            ctx.stroke();
        }

        // Holes
        state.obstacles.forEach(o => {
            if (o.type === 'HOLE') {
                ctx.clearRect(o.x, groundY, o.w, GROUND_HEIGHT);
            }
        });

        // Boss
        if (state.boss.active) {
            drawEnemy(ctx, state.boss.x, state.boss.y, state.boss.w, state.boss.h, true, false);
            
            // Health Bar
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(state.boss.x, state.boss.y - 20, state.boss.w * (state.boss.hp / state.boss.maxHp), 10);
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.strokeRect(state.boss.x, state.boss.y - 20, state.boss.w, 10);
        }

        // Obstacles (Enemies / Missiles)
        state.obstacles.forEach(o => {
            if (!o.active) return;
            if (o.type === 'ENEMY') {
                drawEnemy(ctx, o.x, o.y, o.w, o.h, false, false);
            } else if (o.type === 'SNIPER') {
                drawEnemy(ctx, o.x, o.y, o.w, o.h, false, true);
            } else if (o.type === 'MISSILE') {
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.ellipse(o.x + o.w/2, o.y + o.h/2, o.w/2, o.h/2, 0, 0, Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#f97316';
                ctx.beginPath();
                ctx.moveTo(o.x + o.w, o.y + 5);
                ctx.lineTo(o.x + o.w + 15 + Math.random()*10, o.y + 10);
                ctx.lineTo(o.x + o.w, o.y + 15);
                ctx.fill();
            }
        });

        // Bullets
        state.bullets.forEach(b => {
            if (!b.active) return;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + b.h/2);
            for(let p of b.trail) ctx.lineTo(p.x, p.y + b.h/2);
            ctx.strokeStyle = `rgba(251, 191, 36, 0.5)`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(b.x, b.y, b.w, b.h);
        });

        // Enemy Bullets
        state.enemyBullets.forEach(b => {
             if(b.active) {
                 ctx.fillStyle = b.color || '#ef4444';
                 ctx.fillRect(b.x, b.y, b.w, b.h);
             }
        });

        // Particles
        state.particles.forEach(pt => {
            ctx.fillStyle = pt.color;
            ctx.globalAlpha = pt.life;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 3, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        // Player
        const p = state.player;
        if (!p.isDead) {
            drawPlayer(ctx, p.x, p.y, p.w, p.h, p.crouching, p.grounded);
        }
    };

    const drawStatic = (ctx: CanvasRenderingContext2D) => {
        const state = gameRef.current;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, state.width, state.height);
        
        const groundY = state.height - GROUND_HEIGHT;
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, groundY, state.width, GROUND_HEIGHT);

        const p = state.player;
        drawPlayer(ctx, p.x, p.y, p.w, p.h, false, false);
    };

    const gameOver = () => {
        setGameState('GAMEOVER');
        gameRef.current.player.isDead = true;
        const p = gameRef.current.player;
        spawnParticles(p.x + p.w/2, p.y + p.h/2, '#1e293b', 20);
        
        if (Math.floor(gameRef.current.scoreFloat) > highScore) {
            setHighScore(Math.floor(gameRef.current.scoreFloat));
        }
        cancelAnimationFrame(gameRef.current.animationId);
    };

    if (gameState === 'PLAYING') loop();
    else drawStatic(ctx);

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchmove', handleTouchMove);
        cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState, ammo, highScore, currentSkin]);

  const resetGame = () => {
    const state = gameRef.current;
    state.obstacles = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.particles = [];
    state.scoreFloat = 0;
    state.speed = SPEED_INITIAL;
    state.distance = 0;
    state.frame = 0;
    if (state.height) {
        state.player.y = state.height - GROUND_HEIGHT - 60;
    }
    state.player.dy = 0;
    state.player.isDead = false;
    state.player.crouching = false;
    state.boss.active = false;
    state.boss.defeatedStages = [];
    
    setBossActive(false);
    setAmmo(MAX_AMMO);
    setScore(0);
    setGameState('PLAYING');
  };

  return (
    <div ref={containerRef} className="w-full h-full relative font-mono select-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      
      {/* HUD */}
      <div className="absolute top-4 left-6 flex gap-4">
         <div className="flex gap-2 items-center bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
             <Target size={16} className="text-slate-600" />
             <div className="flex gap-1">
                 {[...Array(MAX_AMMO)].map((_, i) => (
                     <div key={i} className={`w-2 h-5 rounded-sm transition-colors ${i < ammo ? 'bg-yellow-500' : 'bg-slate-200'}`} />
                 ))}
             </div>
         </div>
      </div>

      <div className="absolute top-4 right-8 text-right pointer-events-none">
        <div className="text-3xl font-black text-slate-800 tracking-tighter">
          {score.toString().padStart(5, '0')}
        </div>
        <div className="text-xs font-bold text-slate-400">
          HI {highScore.toString().padStart(5, '0')}
        </div>
      </div>
      
      {/* Boss Warning */}
      {bossActive && (
          <div className="absolute top-20 left-0 right-0 text-center pointer-events-none animate-pulse">
              <span className="text-red-600 font-black text-2xl bg-white/80 px-4 py-1 rounded-full uppercase border border-red-200">
                  CHEFE - HP {bossHealth}/{bossMaxHealth}
              </span>
          </div>
      )}

      {/* Mobile Controls Hint */}
      {gameState === 'PLAYING' && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 text-slate-400 text-xs pointer-events-none opacity-40">
              <div className="flex flex-col items-center">
                  <ArrowUp size={24} />
                  <span className="font-bold">SWIPE</span>
              </div>
              <div className="flex flex-col items-center">
                  <Target size={24} />
                  <span className="font-bold">TAP</span>
              </div>
          </div>
      )}

      {/* SHOP UI OVERLAY */}
      {gameState === 'SHOP' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20">
              <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                          <ShoppingBag className="text-red-500" /> LOJA
                      </h2>
                      <div className="text-right">
                          <div className="text-xs text-slate-400 font-bold uppercase">PONTOS</div>
                          <div className="text-xl font-mono font-bold text-slate-800">{highScore}</div>
                      </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-6">
                      <button 
                        onClick={() => setShopTab('UPGRADES')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${shopTab === 'UPGRADES' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                          UPGRADES
                      </button>
                      <button 
                        onClick={() => setShopTab('SKINS')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${shopTab === 'SKINS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                          PERSONALIZAR
                      </button>
                  </div>

                  <div className="mb-8">
                      {shopTab === 'UPGRADES' ? (
                          <div className="grid grid-cols-1 gap-4">
                              {/* Upgrade Items (Placeholders) */}
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                  <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-lg shadow-sm text-slate-400"><Plus size={20} /></div>
                                      <div>
                                          <div className="font-bold text-slate-700">Munição Extra</div>
                                          <div className="text-xs text-slate-400">Comece com 3 balas</div>
                                      </div>
                                  </div>
                                  <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 rounded-lg text-sm font-bold flex items-center gap-2">
                                      <Lock size={14} /> 1000
                                  </button>
                              </div>

                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 opacity-60">
                                  <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-lg shadow-sm text-slate-400"><Zap size={20} /></div>
                                      <div>
                                          <div className="font-bold text-slate-700">Tiro Duplo</div>
                                          <div className="text-xs text-slate-400">Dispara 2 balas por vez</div>
                                      </div>
                                  </div>
                                  <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 rounded-lg text-sm font-bold flex items-center gap-2">
                                      <Lock size={14} /> 2500
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="grid grid-cols-2 gap-4">
                              {SKINS.map((skin) => {
                                  const isOwned = highScore >= skin.price;
                                  const isEquipped = currentSkin.id === skin.id;
                                  
                                  return (
                                    <div key={skin.id} className={`p-4 rounded-xl border ${isEquipped ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'} transition-all`}>
                                        <div className="flex justify-center mb-3">
                                            {/* Mini Preview */}
                                            <div className="w-8 h-12 relative">
                                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: skin.body }}></div>
                                                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-6" style={{ backgroundColor: skin.body }}></div>
                                                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full" style={{ backgroundColor: skin.scarf }}></div>
                                            </div>
                                        </div>
                                        <div className="text-center mb-2 font-bold text-slate-700">{skin.name}</div>
                                        
                                        {isEquipped ? (
                                            <button className="w-full py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                                                <Check size={12} /> EQUIPADO
                                            </button>
                                        ) : isOwned ? (
                                            <button 
                                                onClick={() => setCurrentSkin(skin)}
                                                className="w-full py-1.5 bg-white border border-slate-200 text-slate-600 hover:border-slate-400 rounded-lg text-xs font-bold"
                                            >
                                                USAR
                                            </button>
                                        ) : (
                                            <button disabled className="w-full py-1.5 bg-slate-200 text-slate-400 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                                                <Lock size={12} /> {skin.price}
                                            </button>
                                        )}
                                    </div>
                                  );
                              })}
                          </div>
                      )}
                  </div>

                  <button 
                      onClick={() => setGameState('START')}
                      className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors"
                  >
                      VOLTAR
                  </button>
              </div>
          </div>
      )}

      {/* MAIN MENU / GAME OVER OVERLAY */}
      {(gameState === 'START' || gameState === 'GAMEOVER') && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
          <div className="text-center p-8 bg-white border border-slate-200 shadow-2xl rounded-3xl animate-in zoom-in-95 duration-200 max-w-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            <h2 className="text-4xl font-black text-slate-900 mb-1 tracking-tight">
              {gameState === 'GAMEOVER' ? 'FIM DE JOGO' : 'STICK RUN'}
            </h2>
            <p className="text-slate-400 text-sm font-bold mb-6 tracking-widest uppercase">Action Runner</p>
            
            <div className="text-left bg-slate-50 p-4 rounded-xl text-sm text-slate-600 mb-6 space-y-3 border border-slate-100">
                <div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center font-bold bg-white shadow-sm border border-slate-200 rounded text-xs">↑</span> <span className="text-slate-500 font-medium">Pular Buracos</span></div>
                <div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center font-bold bg-white shadow-sm border border-slate-200 rounded text-xs">↓</span> <span className="text-slate-500 font-medium">Agachar (Slide)</span></div>
                <div className="flex items-center gap-3"><span className="w-6 h-6 flex items-center justify-center font-bold bg-white shadow-sm border border-slate-200 rounded text-xs">→</span> <span className="text-slate-500 font-medium">Atirar (Recarrega ao matar/boss)</span></div>
            </div>

            <div className="space-y-3">
                <button 
                  onClick={() => resetGame()}
                  className="w-full px-6 py-4 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                >
                  {gameState === 'GAMEOVER' ? <><span className="text-lg">↻</span> TENTAR DE NOVO</> : 'JOGAR AGORA'}
                </button>
                
                <button 
                  onClick={() => setGameState('SHOP')}
                  className="w-full px-6 py-3 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-bold rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={18} /> LOJA / SKINS
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickRun;