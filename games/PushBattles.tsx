import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Zap, Circle, Shield, Target, Globe, Users, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Entity {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  isRemote?: boolean; // NEW: Distinguish network players
  
  // Ability System
  ability: 'IMPACT' | 'DASH' | 'QUAKE';
  
  // Stats
  moveSpeed: number; 
  
  // Attack Logic
  isAttacking: boolean;
  attackTimer: number; 
  hitList: string[];
  
  // Cooldowns
  attackCooldown: number; 
  skillCooldown: number;  
  maxSkillCooldown: number;

  dead: boolean;
  facing: number; 
  stunTimer: number; 
  skillAnim: number; 
}

const ARENA_RADIUS = 600; 
const PLAYER_RADIUS = 20;
const FRICTION = 0.90; 
const ATTACK_DURATION = 30; 
const ATTACK_RADIUS = 35; 

const ABILITIES = {
  IMPACT: {
    name: 'Super Impacto',
    desc: 'Um empurrão massivo com longo alcance.',
    color: '#3b82f6',
    icon: <Target />,
    cooldown: 180, 
    range: 140,
    force: 25.0,
    stun: 45
  },
  DASH: {
    name: 'Investida',
    desc: 'Ganhe velocidade explosiva para atropelar.',
    color: '#f59e0b',
    icon: <Zap />,
    cooldown: 120, 
    range: 60,
    force: 8.0,
    stun: 20
  },
  QUAKE: {
    name: 'Terremoto',
    desc: 'Atordoa inimigos próximos por muito tempo.',
    color: '#10b981',
    icon: <Shield />,
    cooldown: 300, 
    range: 110,
    force: 5.0,
    stun: 150
  }
};

const PushBattles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'LOBBY' | 'PLAYING' | 'GAMEOVER'>('LOBBY');
  const [gameMode, setGameMode] = useState<'BOTS' | 'ONLINE'>('BOTS'); // NEW
  const [selectedAbility, setSelectedAbility] = useState<'IMPACT' | 'DASH' | 'QUAKE'>('IMPACT');
  const [highScore, setHighScore] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHitbox, setShowHitbox] = useState(false);

  // Supabase Channel Ref
  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));

  useEffect(() => {
    const saved = localStorage.getItem('pushBattlesHigh');
    if (saved) setHighScore(parseInt(saved));

    return () => {
      // Cleanup channel on unmount
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const gameRef = useRef({
    entities: [] as Entity[],
    particles: [] as any[],
    camera: { x: 0, y: 0 },
    keys: { up: false, down: false, left: false, right: false, attack: false, skill: false },
    animationId: 0,
    width: 0,
    height: 0,
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    currentScore: 0,
    lastBroadcast: 0
  });

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4;
        gameRef.current.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life: 1.0
        });
    }
  };

  const spawnShockwave = (x: number, y: number, radius: number, color: string, count: number = 8) => {
       for(let i=0; i<count; i++) {
           const angle = (Math.PI * 2 / count) * i;
           gameRef.current.particles.push({
               x: x + Math.cos(angle) * 10,
               y: y + Math.sin(angle) * 10,
               vx: Math.cos(angle) * 5,
               vy: Math.sin(angle) * 5,
               life: 0.5,
               color: color
           });
       }
  };

  const initGame = async () => {
    const ents: Entity[] = [];
    const abilityConfig = ABILITIES[selectedAbility];
    
    // Add My Player
    ents.push({
      id: myIdRef.current,
      x: (Math.random() - 0.5) * 200, 
      y: (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
      radius: PLAYER_RADIUS,
      color: abilityConfig.color,
      isPlayer: true,
      ability: selectedAbility,
      moveSpeed: 0.25,
      isAttacking: false,
      attackTimer: 0,
      hitList: [],
      attackCooldown: 0,
      skillCooldown: 0,
      maxSkillCooldown: abilityConfig.cooldown,
      dead: false,
      facing: 0,
      stunTimer: 0,
      skillAnim: 0
    });

    if (gameMode === 'BOTS') {
      for (let i = 0; i < 4; i++) {
        ents.push(createBot(i));
      }
    } else {
       // ONLINE MODE SETUP
       await connectToRoom();
    }

    gameRef.current.entities = ents;
    gameRef.current.particles = [];
    gameRef.current.currentScore = 0;
    setGameState('PLAYING');
  };

  const connectToRoom = async () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase.channel('push_battles_global', {
        config: {
          broadcast: { self: false },
          presence: { key: myIdRef.current },
        },
      });

      channel
        .on('broadcast', { event: 'player_update' }, ({ payload }) => {
           handleRemoteUpdate(payload);
        })
        .on('broadcast', { event: 'player_attack' }, ({ payload }) => {
           handleRemoteAttack(payload);
        })
        .on('presence', { event: 'sync' }, () => {
           const state = channel.presenceState();
           setOnlineCount(Object.keys(state).length);
        })
        .subscribe((status) => {
           if (status === 'SUBSCRIBED') {
               setIsConnected(true);
               channel.track({ online_at: new Date().toISOString() });
           }
        });

      channelRef.current = channel;
  };

  const handleRemoteUpdate = (data: any) => {
      const ref = gameRef.current;
      const existing = ref.entities.find(e => e.id === data.id);
      
      if (existing) {
          // Interpolation target
          existing.x += (data.x - existing.x) * 0.3;
          existing.y += (data.y - existing.y) * 0.3;
          existing.facing = data.facing;
          existing.ability = data.ability;
          existing.dead = data.dead;
      } else if (!data.dead) {
          // Create new remote player
          const config = ABILITIES[data.ability as keyof typeof ABILITIES] || ABILITIES.IMPACT;
          ref.entities.push({
              id: data.id,
              x: data.x,
              y: data.y,
              vx: 0, vy: 0,
              radius: PLAYER_RADIUS,
              color: config.color,
              isPlayer: false,
              isRemote: true, // Mark as remote
              ability: data.ability,
              moveSpeed: 0,
              isAttacking: false,
              attackTimer: 0,
              hitList: [],
              attackCooldown: 0,
              skillCooldown: 0,
              maxSkillCooldown: 0,
              dead: false,
              facing: data.facing,
              stunTimer: 0,
              skillAnim: 0
          });
      }
  };

  const handleRemoteAttack = (data: any) => {
      const ent = gameRef.current.entities.find(e => e.id === data.id);
      if (ent) {
          if (data.type === 'BASIC') {
              ent.isAttacking = true;
              ent.attackTimer = ATTACK_DURATION;
          } else if (data.type === 'SKILL') {
              ent.skillAnim = 15;
              // Visual only for remote skill
              const config = ABILITIES[ent.ability];
              if (ent.ability !== 'DASH') {
                  spawnShockwave(ent.x, ent.y, config.range, config.color, 10);
              } else {
                  spawnParticles(ent.x, ent.y, '#f59e0b', 10);
              }
          }
      }
  };

  const createBot = (index: number): Entity => {
     const angle = (Math.PI * 2 / 4) * index;
     const dist = 300;
     const abilityKeys = Object.keys(ABILITIES) as Array<keyof typeof ABILITIES>;
     const randomAbility = abilityKeys[Math.floor(Math.random() * abilityKeys.length)];
     const config = ABILITIES[randomAbility];

     return {
         id: `bot-${Math.random()}`,
         x: Math.cos(angle) * dist,
         y: Math.sin(angle) * dist,
         vx: 0, vy: 0,
         radius: PLAYER_RADIUS,
         color: '#ef4444', 
         isPlayer: false,
         ability: randomAbility,
         moveSpeed: 0.22,
         isAttacking: false,
         attackTimer: 0,
         hitList: [],
         attackCooldown: 0,
         skillCooldown: 0,
         maxSkillCooldown: config.cooldown,
         dead: false,
         facing: angle + Math.PI, 
         stunTimer: 0,
         skillAnim: 0
     };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      gameRef.current.width = canvas.width;
      gameRef.current.height = canvas.height;
    };
    window.addEventListener('resize', resize);
    resize();

    // Input handlers same as before...
    const handleKeyDown = (e: KeyboardEvent) => {
        const k = gameRef.current.keys;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') k.up = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') k.down = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') k.left = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') k.right = true;
        if (e.code === 'Space') k.attack = true;
        if (e.code === 'KeyE') k.skill = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        const k = gameRef.current.keys;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') k.up = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') k.down = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') k.left = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') k.right = false;
        if (e.code === 'Space') k.attack = false;
        if (e.code === 'KeyE') k.skill = false;
    };

    // Mobile inputs same as before...
    const getTouchPos = (touch: React.Touch | Touch) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    };

    const handleTouchStart = (e: TouchEvent) => {
       e.preventDefault(); 
       const w = gameRef.current.width;
       const h = gameRef.current.height;
       
       for (let i = 0; i < e.changedTouches.length; i++) {
           const touch = e.changedTouches[i];
           const pos = getTouchPos(touch);

           if (pos.x < w / 2) {
               gameRef.current.joystick.active = true;
               gameRef.current.joystick.x = pos.x;
               gameRef.current.joystick.y = pos.y;
           } else {
               if (pos.y < h - 150 && pos.x > w - 150) {
                   gameRef.current.keys.skill = true;
               } else {
                   gameRef.current.keys.attack = true;
               }
           }
       }
    };

    const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (!gameRef.current.joystick.active) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = getTouchPos(touch);
            if (pos.x < gameRef.current.width * 0.7) { 
                 const dx = pos.x - gameRef.current.joystick.x;
                 const dy = pos.y - gameRef.current.joystick.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 const maxDist = 50;
                 const clampedDist = Math.min(dist, maxDist);
                 const angle = Math.atan2(dy, dx);
                 gameRef.current.joystick.dx = Math.cos(angle) * clampedDist;
                 gameRef.current.joystick.dy = Math.sin(angle) * clampedDist;
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        const w = gameRef.current.width;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const pos = getTouchPos(touch);
            if (pos.x < w / 2) {
                gameRef.current.joystick.active = false;
                gameRef.current.joystick.dx = 0;
                gameRef.current.joystick.dy = 0;
            } else {
                gameRef.current.keys.attack = false;
                gameRef.current.keys.skill = false;
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    const loop = () => {
        if (gameState === 'PLAYING') {
            update();
            draw(ctx);
        } else {
            drawLobby(ctx);
        }
        gameRef.current.animationId = requestAnimationFrame(loop);
    };

    const update = () => {
        const ref = gameRef.current;
        const player = ref.entities.find(e => e.isPlayer);
        
        // Broadcast local player state
        if (gameMode === 'ONLINE' && player && !player.dead && channelRef.current) {
            const now = Date.now();
            if (now - ref.lastBroadcast > 50) { // Limit broadcast rate (20hz)
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'player_update',
                    payload: {
                        id: player.id,
                        x: player.x,
                        y: player.y,
                        facing: player.facing,
                        ability: player.ability,
                        dead: player.dead
                    }
                });
                ref.lastBroadcast = now;
            }
        }

        ref.entities.forEach(e => {
            if (e.dead) return;

            // Remote players don't have physics logic updated here, only visual interpolation
            if (e.isRemote) return;

            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.skillCooldown > 0) e.skillCooldown--;
            if (e.skillAnim > 0) e.skillAnim--;

            if (e.isAttacking) {
                e.attackTimer--;
                
                ref.entities.forEach(target => {
                    // Friendly fire off, don't hit self, don't hit dead
                    if (target.id === e.id || target.dead || e.hitList.includes(target.id)) return;
                    
                    const dx = target.x - e.x;
                    const dy = target.y - e.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < ATTACK_RADIUS + target.radius) {
                        e.hitList.push(target.id);
                        
                        // Physics only apply if I am master of the target (Bots) OR if target is me
                        // But in simple p2p, everyone is master of themselves.
                        // So if I hit a remote player, I see them move, but they might not feel it unless I send an event.
                        // For simplicity: Visual knockback only on remote, authoritative knockback on bots.
                        
                        if (!target.isRemote) {
                             const angle = Math.atan2(dy, dx);
                             const force = 12.0;
                             target.vx += Math.cos(angle) * force;
                             target.vy += Math.sin(angle) * force;
                             target.stunTimer = 45;
                        }
                        
                        spawnParticles(target.x, target.y, target.color, 5);
                        
                        if (e.isPlayer) {
                            ref.currentScore += 1;
                            if (ref.currentScore > highScore) {
                                setHighScore(ref.currentScore);
                                localStorage.setItem('pushBattlesHigh', ref.currentScore.toString());
                            }
                        }
                    }
                });

                if (e.attackTimer <= 0) {
                    e.isAttacking = false;
                }
            }

            if (e.stunTimer > 0) {
                e.stunTimer--;
            } else {
                if (Math.abs(e.vx) > 0.05 || Math.abs(e.vy) > 0.05) {
                    if (e.isPlayer) {
                        e.facing = Math.atan2(e.vy, e.vx);
                    }
                }

                if (e.isPlayer) {
                    const speed = e.moveSpeed;
                    if (ref.keys.up) e.vy -= speed;
                    if (ref.keys.down) e.vy += speed;
                    if (ref.keys.left) e.vx -= speed;
                    if (ref.keys.right) e.vx += speed;
                    
                    if (ref.joystick.active) {
                        e.vx += (ref.joystick.dx / 50) * speed;
                        e.vy += (ref.joystick.dy / 50) * speed;
                    }
                } else {
                    // BOT LOGIC
                    let target = null;
                    let minDist = 9999;
                    
                    ref.entities.forEach(other => {
                        if (other.id !== e.id && !other.dead) {
                            const d = Math.sqrt((other.x - e.x)**2 + (other.y - e.y)**2);
                            if (d < minDist) {
                                minDist = d;
                                target = other;
                            }
                        }
                    });

                    if (target) {
                        const targetAngle = Math.atan2(target.y - e.y, target.x - e.x);
                        
                        let angleDiff = targetAngle - e.facing;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        const turnSpeed = 0.1;
                        if (Math.abs(angleDiff) > turnSpeed) {
                            e.facing += Math.sign(angleDiff) * turnSpeed;
                        } else {
                            e.facing = targetAngle;
                        }

                        const randomWobble = (Math.random() - 0.5) * 0.5; 
                        e.vx += Math.cos(e.facing + randomWobble) * (e.moveSpeed * 0.8);
                        e.vy += Math.sin(e.facing + randomWobble) * (e.moveSpeed * 0.8);

                        if (minDist < 60 && e.attackCooldown <= 0 && !e.isAttacking && Math.random() < 0.05) {
                            startBasicAttack(e);
                        }
                        
                        if (minDist < ABILITIES[e.ability].range && e.skillCooldown <= 0 && Math.random() < 0.01) {
                            useActiveSkill(e);
                        }
                    }
                    
                    // Keep bots in arena
                    const distFromCenter = Math.sqrt(e.x*e.x + e.y*e.y);
                    if (distFromCenter > ARENA_RADIUS * 0.9) {
                        const angle = Math.atan2(0 - e.y, 0 - e.x);
                        e.vx += Math.cos(angle) * 0.5;
                        e.vy += Math.sin(angle) * 0.5;
                    }
                }
            }

            e.x += e.vx;
            e.y += e.vy;
            e.vx *= FRICTION;
            e.vy *= FRICTION;
        });

        if (player && !player.dead && player.stunTimer <= 0) {
            if (ref.keys.attack && player.attackCooldown <= 0 && !player.isAttacking) {
                startBasicAttack(player);
                if (gameMode === 'ONLINE' && channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'player_attack',
                        payload: { id: player.id, type: 'BASIC' }
                    });
                }
            }
            if (ref.keys.skill && player.skillCooldown <= 0) {
                useActiveSkill(player);
                if (gameMode === 'ONLINE' && channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'player_attack',
                        payload: { id: player.id, type: 'SKILL' }
                    });
                }
            }
        }

        ref.entities.forEach(e => {
            if (e.dead) return;
            const dist = Math.sqrt(e.x*e.x + e.y*e.y);
            
            if (dist > ARENA_RADIUS + e.radius) {
                e.dead = true;
                spawnParticles(e.x, e.y, e.color, 20);
                
                if (e.isPlayer) {
                    setTimeout(() => setGameState('GAMEOVER'), 1000);
                } else if (!e.isRemote) {
                    // Respawn Bots
                    setTimeout(() => {
                         const newBot = createBot(Math.floor(Math.random()*4));
                         const idx = ref.entities.findIndex(ent => ent.id === e.id);
                         if (idx !== -1) ref.entities[idx] = newBot;
                    }, 1500);
                }
            }
        });

        ref.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
        });
        ref.particles = ref.particles.filter(p => p.life > 0);

        if (player && !player.dead) {
            ref.camera.x += (player.x - ref.camera.x) * 0.1;
            ref.camera.y += (player.y - ref.camera.y) * 0.1;
        }
    };

    const startBasicAttack = (user: Entity) => {
        user.isAttacking = true;
        user.attackTimer = ATTACK_DURATION;
        user.attackCooldown = 50; 
        user.hitList = []; 
    };

    const useActiveSkill = (user: Entity) => {
        const config = ABILITIES[user.ability];
        user.skillCooldown = user.maxSkillCooldown;
        user.skillAnim = 15;

        if (user.ability === 'DASH') {
             user.vx += Math.cos(user.facing) * 35;
             user.vy += Math.sin(user.facing) * 35;
             spawnParticles(user.x, user.y, '#f59e0b', 10);
             applySkillEffect(user, config.range, config.force, config.stun);
        } else {
             spawnShockwave(user.x, user.y, config.range, config.color, 20);
             applySkillEffect(user, config.range, config.force, config.stun);
        }
    };

    const applySkillEffect = (user: Entity, range: number, force: number, stunFrames: number) => {
        const ref = gameRef.current;
        ref.entities.forEach(target => {
            if (target.id === user.id || target.dead) return;
            // In online mode, I only calculate physics for bots, not other players
            if (gameMode === 'ONLINE' && target.isRemote) return;

            const dx = target.x - user.x;
            const dy = target.y - user.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < range + target.radius) {
                const angle = Math.atan2(dy, dx);
                target.vx += Math.cos(angle) * force;
                target.vy += Math.sin(angle) * force;
                target.stunTimer = stunFrames;
                spawnParticles(target.x, target.y, target.color, 4);
                
                if (user.isPlayer) {
                    ref.currentScore += 1;
                    if (ref.currentScore > highScore) {
                        setHighScore(ref.currentScore);
                        localStorage.setItem('pushBattlesHigh', ref.currentScore.toString());
                    }
                }
            }
        });
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const ref = gameRef.current;
        const { width, height, camera } = ref;
        
        ctx.clearRect(0, 0, width, height);
        
        ctx.save();
        ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

        // Arena Background
        ctx.fillStyle = '#cbd5e1'; 
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        const gridSize = 100;
        const startX = Math.floor((camera.x - width/2) / gridSize) * gridSize;
        const startY = Math.floor((camera.y - height/2) / gridSize) * gridSize;
        
        for (let x = startX; x < startX + width + gridSize; x+=gridSize) {
             for (let y = startY; y < startY + height + gridSize; y+=gridSize) {
                  ctx.beginPath(); 
                  ctx.arc(x, y, 2, 0, Math.PI*2);
                  ctx.fill();
             }
        }
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#e2e8f0';
        ctx.stroke();

        ctx.save();
        ctx.clip();
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 2;
        for(let i = -ARENA_RADIUS; i < ARENA_RADIUS; i+=80) {
            ctx.beginPath(); ctx.moveTo(i, -ARENA_RADIUS); ctx.lineTo(i, ARENA_RADIUS); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-ARENA_RADIUS, i); ctx.lineTo(ARENA_RADIUS, i); ctx.stroke();
        }
        ctx.restore();

        ref.entities.forEach(e => {
            if (e.dead) return;
            
            ctx.save();
            ctx.translate(e.x, e.y);
            
            // Hitbox debug
            if (showHitbox) {
                ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1; ctx.stroke();
            }

            // Attack Visual
            if (e.isAttacking) {
                ctx.beginPath(); ctx.arc(0, 0, ATTACK_RADIUS, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255, 0.2)'; ctx.fill();
                const pulse = (Date.now() % 500) / 500;
                ctx.strokeStyle = `rgba(255,255,255, ${1 - pulse})`; ctx.lineWidth = 2 + (pulse * 2);
                ctx.beginPath(); ctx.arc(0, 0, ATTACK_RADIUS + (pulse * 5), 0, Math.PI*2); ctx.stroke();
            }

            // Skill Visual
            if (e.skillAnim > 0) {
                const progress = 1 - (e.skillAnim / 15);
                const maxRange = ABILITIES[e.ability].range;
                ctx.beginPath(); ctx.arc(0, 0, maxRange * progress, 0, Math.PI*2); ctx.fillStyle = e.color + '66'; ctx.fill();
            }
            
            // Body
            ctx.fillStyle = e.stunTimer > 0 ? '#94a3b8' : e.color; 
            ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
            
            // Name tag for online
            if (e.isRemote) {
                ctx.fillStyle = '#94a3b8';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('PLAYER', 0, -e.radius - 10);
            }

            // Direction indicator
            if (!e.isPlayer) {
                ctx.rotate(e.facing);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.beginPath(); ctx.moveTo(e.radius + 5, 0); ctx.lineTo(e.radius + 15, -5); ctx.lineTo(e.radius + 15, 5); ctx.fill();
                ctx.rotate(-e.facing);
            }
            
            // Stun Stars
            if (e.stunTimer > 0) {
                 const time = Date.now() / 100;
                 ctx.fillStyle = '#fbbf24';
                 for(let i=0; i<3; i++) {
                      const starA = time + (Math.PI*2/3)*i;
                      ctx.beginPath(); ctx.arc(Math.cos(starA) * (e.radius + 5), Math.sin(starA) * 5 - e.radius - 5, 3, 0, Math.PI*2); ctx.fill();
                 }
            }

            // Eyes
            const lookAngle = e.facing;
            const eyeOffX = Math.cos(lookAngle) * 8;
            const eyeOffY = Math.sin(lookAngle) * 8;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(eyeOffX, eyeOffY, 6, 0, Math.PI*2); ctx.fill();

            ctx.restore();
        });

        ref.particles.forEach(p => {
             ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
             ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        ctx.restore();

        // HUD
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`EMPURRÕES: ${ref.currentScore}`, 20, 40);
        
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`RECORD: ${highScore}`, 20, 65);

        if (gameMode === 'ONLINE') {
            ctx.fillStyle = isConnected ? '#22c55e' : '#ef4444';
            ctx.fillText(isConnected ? `ONLINE: ${onlineCount}` : 'CONECTANDO...', 20, 90);
        }

        // Joystick
        if (ref.joystick.active) {
            ctx.beginPath(); ctx.arc(ref.joystick.x, ref.joystick.y, 50, 0, Math.PI*2); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 4; ctx.stroke();
            ctx.beginPath(); ctx.arc(ref.joystick.x + ref.joystick.dx, ref.joystick.y + ref.joystick.dy, 25, 0, Math.PI*2); ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.fill();
        }
    };

    const drawLobby = (ctx: CanvasRenderingContext2D) => {
         const { width, height } = gameRef.current;
         ctx.fillStyle = '#f8fafc';
         ctx.fillRect(0, 0, width, height);
    };

    loop();

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState, selectedAbility, showHitbox, gameMode, isConnected, onlineCount]);

  const getPlayer = () => gameRef.current.entities.find(e => e.isPlayer);

  return (
    <div ref={containerRef} className="w-full h-full relative font-mono select-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      
      {gameState === 'LOBBY' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full animate-in zoom-in-95 relative">
                  
                  <button onClick={() => setShowSettings(true)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                      <Settings size={20} />
                  </button>

                  <h2 className="text-4xl font-black text-slate-800 mb-2 text-center">PUSH BATTLES</h2>
                  <div className="text-center mb-6">
                      <p className="text-slate-400">Escolha sua Habilidade</p>
                  </div>

                  {/* Mode Selector */}
                  <div className="flex justify-center gap-4 mb-6">
                      <button 
                        onClick={() => setGameMode('BOTS')}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${gameMode === 'BOTS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                      >
                         <Users size={18} /> TREINO (BOTS)
                      </button>
                      <button 
                        onClick={() => setGameMode('ONLINE')}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${gameMode === 'ONLINE' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 text-slate-500'}`}
                      >
                         <Globe size={18} /> ONLINE
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      {(Object.entries(ABILITIES) as [keyof typeof ABILITIES, any][]).map(([key, data]) => (
                          <button 
                            key={key}
                            onClick={() => setSelectedAbility(key)}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${selectedAbility === key ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-slate-300'}`}
                          >
                              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: data.color }}>
                                  {data.icon}
                              </div>
                              <div className="text-center">
                                  <div className="font-bold text-slate-800">{data.name}</div>
                                  <div className="text-xs text-slate-500 mt-2">{data.desc}</div>
                              </div>
                          </button>
                      ))}
                  </div>

                  <button 
                    onClick={initGame}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-500/20 transition-transform active:scale-95"
                  >
                      {gameMode === 'ONLINE' ? 'CONECTAR E JOGAR' : 'ENTRAR NA ARENA'}
                  </button>
              </div>
          </div>
      )}

      {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-2xl shadow-xl w-80 animate-in fade-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={18} /> Configurações</h3>
                       <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                   </div>
                   <div className="space-y-4">
                       <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                           <div className="flex items-center gap-3">
                               <Circle size={16} className={showHitbox ? "text-green-500 fill-current" : "text-slate-300"} />
                               <span className="text-sm font-medium text-slate-700">Mostrar Hitboxes</span>
                           </div>
                           <button onClick={() => setShowHitbox(!showHitbox)} className={`w-12 h-6 rounded-full p-1 transition-colors ${showHitbox ? 'bg-green-500' : 'bg-slate-300'}`}>
                               <div className={`w-4 h-4 bg-white rounded-full transition-transform ${showHitbox ? 'translate-x-6' : 'translate-x-0'}`} />
                           </button>
                       </div>
                   </div>
                   <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">Fechar</button>
               </div>
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                  <h2 className="text-3xl font-black text-slate-800 mb-2">VOCÊ CAIU!</h2>
                  <p className="text-slate-500 mb-6">Empurrões: <span className="font-bold text-red-500">{gameRef.current.currentScore}</span></p>
                  <button onClick={() => setGameState('LOBBY')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl">VOLTAR AO LOBBY</button>
              </div>
          </div>
      )}

      {gameState === 'PLAYING' && (
          <>
            <div className="absolute bottom-12 left-12 w-32 h-32 rounded-full border-4 border-slate-300/30 flex items-center justify-center pointer-events-none">
                <div className="text-slate-300/50 font-black text-sm">MOVE</div>
            </div>
            <div className="absolute bottom-12 right-12 w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/50 flex items-center justify-center pointer-events-none">
                <div className="text-red-500/50 font-black text-sm">ATK</div>
            </div>
            <div className="absolute bottom-48 right-12 w-20 h-20 rounded-full bg-blue-500/20 border-4 border-blue-500/50 flex items-center justify-center pointer-events-none">
                <div className="text-blue-500/50 font-black text-xs text-center leading-tight">SKILL<br/>(E)</div>
            </div>
          </>
      )}
    </div>
  );
};

export default PushBattles;