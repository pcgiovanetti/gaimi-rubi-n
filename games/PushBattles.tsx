import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Zap, Target, Globe, Users, Lock, Wind, Crosshair, Loader2, ShieldAlert, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Admin Configuration
const ADMIN_EMAIL = "pcgiovanetti2011@gmail.com";

interface Entity {
  id: string;
  name: string; 
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayer: boolean;
  isAdmin: boolean;
  isRemote?: boolean; 
  
  // Ability System
  ability: 'IMPACT' | 'DASH' | 'QUAKE' | 'SNIPER' | 'VORTEX';
  
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
  maxAttackCooldown: number;

  dead: boolean;
  facing: number; 
  stunTimer: number; 
  skillAnim: number; 
}

const ARENA_RADIUS = 600; 
const PLAYER_RADIUS = 20;
const FRICTION = 0.92;
const ATTACK_DURATION = 20; 
const ATTACK_RADIUS = 45;
const PUSH_FORCE = 22.0;

const ABILITIES = {
  IMPACT: {
    name: 'Super Impacto',
    desc: 'Empurrão médio equilibrado.',
    color: '#3b82f6',
    icon: <Target />,
    cooldown: 180, 
    range: 160,
    force: 35.0,
    stun: 60,
    reqPoints: 0
  },
  DASH: {
    name: 'Investida',
    desc: 'Atropele inimigos com velocidade.',
    color: '#f59e0b',
    icon: <Zap />,
    cooldown: 120, 
    range: 70,
    force: 15.0,
    stun: 30,
    reqPoints: 50
  },
  QUAKE: {
    name: 'Terremoto',
    desc: 'Atordoa área ao redor.',
    color: '#10b981',
    icon: <Settings />, 
    cooldown: 300, 
    range: 140,
    force: 10.0,
    stun: 180,
    reqPoints: 150
  },
  SNIPER: {
    name: 'Sniper',
    desc: 'Alcance extremo, empurrão brutal.',
    color: '#ef4444',
    icon: <Crosshair />,
    cooldown: 400, 
    range: 400, 
    force: 60.0,
    stun: 90,
    reqPoints: 300
  },
  VORTEX: {
    name: 'Vórtice',
    desc: 'Puxa inimigos para você.',
    color: '#8b5cf6',
    icon: <Wind />,
    cooldown: 360, 
    range: 250,
    force: -15.0, 
    stun: 45,
    reqPoints: 500
  }
};

const BOT_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Omega"];

const PushBattles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'LOBBY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('LOBBY');
  const [gameMode, setGameMode] = useState<'BOTS' | 'ONLINE'>('BOTS');
  const [selectedAbility, setSelectedAbility] = useState<'IMPACT' | 'DASH' | 'QUAKE' | 'SNIPER' | 'VORTEX'>('IMPACT');
  const [highScore, setHighScore] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [careerPushes, setCareerPushes] = useState(0); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showSettings, setShowSettings] = useState(false);

  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const myNameRef = useRef<string>("Player");
  
  // Track if we had opponents to determine victory
  const hasOpponentsRef = useRef(false);

  // Load User & Profile
  useEffect(() => {
    const loadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            myIdRef.current = session.user.id; 
            
            const email = session.user.email || "";
            const isUserAdmin = email === ADMIN_EMAIL;
            setIsAdmin(isUserAdmin);

            const displayName = session.user.user_metadata.full_name || email.split('@')[0];
            myNameRef.current = displayName;

            // Fetch Profile Stats
            const { data, error } = await supabase
                .from('profiles')
                .select('total_pushes')
                .eq('id', session.user.id)
                .single();
            
            if (data) {
                setCareerPushes(data.total_pushes || 0);
            } else {
                if (error && error.code === 'PGRST116') {
                    await supabase.from('profiles').insert({
                        id: session.user.id,
                        full_name: displayName,
                        total_pushes: 0
                    });
                }
            }
        }
        setLoadingProfile(false);
    };
    loadUser();

    const savedHigh = localStorage.getItem('pushBattlesHigh');
    if (savedHigh) setHighScore(parseInt(savedHigh));

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const saveProgress = async (sessionPushes: number) => {
      if (!user) return;
      const newTotal = careerPushes + sessionPushes;
      setCareerPushes(newTotal);

      await supabase.from('profiles').upsert({
          id: user.id,
          total_pushes: newTotal,
          updated_at: new Date()
      });
  };

  const handleAdminScoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAdmin || !user) return;
      const val = parseInt(e.target.value) || 0;
      setCareerPushes(val);
      await supabase.from('profiles').update({ total_pushes: val }).eq('id', user.id);
  };

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
    hasOpponentsRef.current = false;
    
    // Add My Player
    ents.push({
      id: myIdRef.current,
      name: myNameRef.current,
      x: (Math.random() - 0.5) * 200, 
      y: (Math.random() - 0.5) * 200,
      vx: 0, vy: 0,
      radius: PLAYER_RADIUS,
      color: abilityConfig.color,
      isPlayer: true,
      isAdmin: isAdmin,
      ability: selectedAbility,
      moveSpeed: 0.30,
      isAttacking: false,
      attackTimer: 0,
      hitList: [],
      attackCooldown: 0,
      skillCooldown: 0,
      maxSkillCooldown: abilityConfig.cooldown,
      maxAttackCooldown: 40,
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
        .on('broadcast', { event: 'player_hit' }, ({ payload }) => {
           handleRemoteHit(payload);
        })
        .on('presence', { event: 'sync' }, () => {
           const state = channel.presenceState();
           const presenceIds = Object.keys(state);
           setOnlineCount(presenceIds.length);
           
           if (presenceIds.length > 1) {
               hasOpponentsRef.current = true;
           }

           // CLEANUP: Remove players who left presence
           gameRef.current.entities = gameRef.current.entities.filter(e => {
               if (e.isPlayer) return true; // Keep self
               if (!e.isRemote) return true; // Keep local bots (if any)
               
               const stillOnline = presenceIds.includes(e.id);
               if (!stillOnline) {
                   spawnParticles(e.x, e.y, e.color, 10); // Poof effect
               }
               return stillOnline;
           });
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
          // Smooth Interpolation
          const dist = Math.sqrt((data.x - existing.x)**2 + (data.y - existing.y)**2);
          if (dist > 150) {
              // Teleport if too far (likely lag spike or respawn)
              existing.x = data.x;
              existing.y = data.y;
          } else {
              // Interpolate
              existing.x += (data.x - existing.x) * 0.25;
              existing.y += (data.y - existing.y) * 0.25;
          }
          
          existing.vx = data.vx || 0;
          existing.vy = data.vy || 0;
          existing.facing = data.facing;
          existing.ability = data.ability;
          
          if (data.stunned) {
               existing.stunTimer = Math.max(existing.stunTimer, 5);
          }

          if (data.dead && !existing.dead) {
              spawnParticles(existing.x, existing.y, existing.color, 20); // Death explosion
          }
          existing.dead = data.dead;
      } else if (!data.dead) {
          const config = ABILITIES[data.ability as keyof typeof ABILITIES] || ABILITIES.IMPACT;
          ref.entities.push({
              id: data.id,
              name: data.name || "Unknown",
              x: data.x,
              y: data.y,
              vx: 0, vy: 0,
              radius: PLAYER_RADIUS,
              color: config.color,
              isPlayer: false,
              isAdmin: data.isAdmin,
              isRemote: true,
              ability: data.ability,
              moveSpeed: 0,
              isAttacking: false,
              attackTimer: 0,
              hitList: [],
              attackCooldown: 0,
              skillCooldown: 0,
              maxSkillCooldown: 0,
              maxAttackCooldown: 40,
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
              const config = ABILITIES[ent.ability];
              spawnShockwave(ent.x, ent.y, config.range, config.color, 10);
          }
      }
  };

  const handleRemoteHit = (payload: any) => {
      const me = getPlayer();
      if (me && me.id === payload.targetId && !me.dead) {
          me.vx += Math.cos(payload.angle) * payload.force;
          me.vy += Math.sin(payload.angle) * payload.force;
          me.stunTimer = payload.stun;
          spawnParticles(me.x, me.y, me.color, 10);
      }
  };

  const createBot = (index: number): Entity => {
     const angle = (Math.PI * 2 / 4) * index;
     const dist = 300;
     const simpleAbilities = ['IMPACT', 'DASH', 'QUAKE'];
     const randomAbility = simpleAbilities[Math.floor(Math.random() * simpleAbilities.length)] as keyof typeof ABILITIES;
     const config = ABILITIES[randomAbility];

     return {
         id: `bot-${Math.random()}`,
         name: BOT_NAMES[index] || `Bot ${index}`,
         x: Math.cos(angle) * dist,
         y: Math.sin(angle) * dist,
         vx: 0, vy: 0,
         radius: PLAYER_RADIUS,
         color: config.color, 
         isPlayer: false,
         isAdmin: false,
         ability: randomAbility,
         moveSpeed: 0.25,
         isAttacking: false,
         attackTimer: 0,
         hitList: [],
         attackCooldown: 0,
         skillCooldown: 0,
         maxSkillCooldown: config.cooldown,
         maxAttackCooldown: 40,
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

    // --- GAME LOGIC FUNCTIONS ---
    
    const applyAreaEffect = (source: Entity, range: number, force: number, stun: number, directional: boolean = false) => {
        gameRef.current.entities.forEach(target => {
            if (target.id === source.id || target.dead) return;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < range + target.radius) {
                const angle = Math.atan2(dy, dx);
                
                if (directional) {
                    let angleDiff = angle - source.facing;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    if (Math.abs(angleDiff) > Math.PI / 3) return; 
                }

                if (!target.isRemote) {
                    target.vx += Math.cos(angle) * force;
                    target.vy += Math.sin(angle) * force;
                    target.stunTimer = stun;
                } else if (gameMode === 'ONLINE' && channelRef.current) {
                     channelRef.current.send({
                         type: 'broadcast',
                         event: 'player_hit',
                         payload: {
                             targetId: target.id,
                             force: force,
                             angle: angle,
                             stun: stun
                         }
                     });
                }
                spawnParticles(target.x, target.y, target.color, 5);
            }
        });
    };

    const startBasicAttack = (ent: Entity) => {
        ent.isAttacking = true;
        ent.attackTimer = ATTACK_DURATION;
        ent.hitList = [];
        ent.attackCooldown = ent.maxAttackCooldown;
    };

    const useActiveSkill = (ent: Entity) => {
        const config = ABILITIES[ent.ability];
        ent.skillCooldown = ent.maxSkillCooldown;
        ent.skillAnim = 15;

        if (ent.ability === 'DASH') {
            ent.vx += Math.cos(ent.facing) * config.force;
            ent.vy += Math.sin(ent.facing) * config.force;
            spawnParticles(ent.x, ent.y, config.color, 10);
        } else if (ent.ability === 'QUAKE') {
            spawnShockwave(ent.x, ent.y, config.range, config.color, 12);
            applyAreaEffect(ent, config.range, config.force, config.stun, false);
        } else if (ent.ability === 'IMPACT') {
            spawnShockwave(ent.x, ent.y, config.range, config.color, 8);
            applyAreaEffect(ent, config.range, config.force, config.stun, true);
        } else if (ent.ability === 'VORTEX') {
            spawnShockwave(ent.x, ent.y, config.range, config.color, 15);
            applyAreaEffect(ent, config.range, config.force, config.stun, false);
        } else if (ent.ability === 'SNIPER') {
            const endX = ent.x + Math.cos(ent.facing) * config.range;
            const endY = ent.y + Math.sin(ent.facing) * config.range;
            
            gameRef.current.entities.forEach(target => {
                if (target.id === ent.id || target.dead) return;
                const dx = target.x - ent.x;
                const dy = target.y - ent.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < config.range && dist > 0) {
                    const angleToTarget = Math.atan2(dy, dx);
                    let angleDiff = angleToTarget - ent.facing;
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    
                    if (Math.abs(angleDiff) < 0.2) { 
                        if (!target.isRemote) {
                            target.vx += Math.cos(ent.facing) * config.force;
                            target.vy += Math.sin(ent.facing) * config.force;
                            target.stunTimer = config.stun;
                        } else if (gameMode === 'ONLINE' && channelRef.current) {
                             channelRef.current.send({
                                 type: 'broadcast',
                                 event: 'player_hit',
                                 payload: {
                                     targetId: target.id,
                                     force: config.force,
                                     angle: ent.facing,
                                     stun: config.stun
                                 }
                             });
                        }
                        spawnParticles(target.x, target.y, target.color, 8);
                    }
                }
            });
        }
    };

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
        
        // CHECK VICTORY (Online Only)
        if (gameMode === 'ONLINE' && player && !player.dead) {
            // Count alive enemies
            const livingEnemies = ref.entities.filter(e => e.isRemote && !e.dead).length;
            
            if (hasOpponentsRef.current && livingEnemies === 0 && onlineCount > 1) {
                if (onlineCount === 1) {
                     // Everyone left?
                } else {
                    const allOthersDead = ref.entities.filter(e => e.isRemote).every(e => e.dead);
                    if (allOthersDead && ref.entities.filter(e => e.isRemote).length > 0) {
                         saveProgress(ref.currentScore + 5); // Bonus
                         setGameState('VICTORY');
                    }
                }
            }
        }

        if (gameMode === 'ONLINE' && player && channelRef.current) {
            const now = Date.now();
            if (now - ref.lastBroadcast > 30) { // Increased broadcast rate (33Hz)
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'player_update',
                    payload: {
                        id: player.id,
                        name: player.name, 
                        isAdmin: player.isAdmin,
                        x: player.x,
                        y: player.y,
                        vx: player.vx,
                        vy: player.vy,
                        facing: player.facing,
                        ability: player.ability,
                        dead: player.dead,
                        stunned: player.stunTimer > 0
                    }
                });
                ref.lastBroadcast = now;
            }
        }

        ref.entities.forEach(e => {
            if (e.dead) return;
            if (e.isRemote) {
                // Apply slight prediction for remote players to keep them moving
                if (Math.abs(e.vx) > 0.01) e.x += e.vx;
                if (Math.abs(e.vy) > 0.01) e.y += e.vy;
                e.vx *= FRICTION;
                e.vy *= FRICTION;
                if (e.stunTimer > 0) e.stunTimer--;
                return;
            }

            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.skillCooldown > 0) e.skillCooldown--;
            if (e.skillAnim > 0) e.skillAnim--;

            if (e.isAttacking) {
                e.attackTimer--;
                
                ref.entities.forEach(target => {
                    if (target.id === e.id || target.dead || e.hitList.includes(target.id)) return;
                    
                    const dx = target.x - e.x;
                    const dy = target.y - e.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < ATTACK_RADIUS + target.radius) {
                        e.hitList.push(target.id);
                        
                        const angle = Math.atan2(dy, dx);
                        
                        if (!target.isRemote) {
                             target.vx += Math.cos(angle) * PUSH_FORCE;
                             target.vy += Math.sin(angle) * PUSH_FORCE;
                             target.stunTimer = 45;
                        } else if (gameMode === 'ONLINE' && channelRef.current) {
                             channelRef.current.send({
                                 type: 'broadcast',
                                 event: 'player_hit',
                                 payload: {
                                     targetId: target.id,
                                     force: PUSH_FORCE,
                                     angle: angle,
                                     stun: 45
                                 }
                             });
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

                        if (minDist < 80 && e.attackCooldown <= 0 && !e.isAttacking && Math.random() < 0.05) {
                            startBasicAttack(e);
                        }
                        
                        if (minDist < ABILITIES[e.ability].range && e.skillCooldown <= 0 && Math.random() < 0.01) {
                            useActiveSkill(e);
                        }
                    }
                    
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
                    saveProgress(ref.currentScore);
                    setTimeout(() => setGameState('GAMEOVER'), 1000);
                } else if (!e.isRemote) {
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
            
            if (e.isAttacking) {
                ctx.beginPath();
                ctx.arc(0, 0, ATTACK_RADIUS + 5, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
                ctx.fill();
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            if (e.skillAnim > 0) {
                const progress = 1 - (e.skillAnim / 15);
                const maxRange = ABILITIES[e.ability].range;
                ctx.beginPath(); ctx.arc(0, 0, maxRange * progress, 0, Math.PI*2); ctx.fillStyle = e.color + '66'; ctx.fill();
            }
            
            // Name Tag & Admin Title
            ctx.save();
            ctx.fillStyle = e.isAdmin ? '#fbbf24' : '#64748b'; // Gold for Admin, Slate for others
            if (e.isAdmin) ctx.shadowBlur = 5;
            if (e.isAdmin) ctx.shadowColor = '#fbbf24';
            
            ctx.font = e.isAdmin ? 'bold 12px monospace' : 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(e.name.toUpperCase(), 0, -e.radius - 12);
            ctx.restore();

            // Body
            ctx.fillStyle = e.stunTimer > 0 ? '#94a3b8' : e.color; 
            
            // Admin Glow
            if (e.isAdmin) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = e.color;
            }
            
            ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0; // Reset
            
            // Direction indicator
            if (!e.isPlayer) {
                ctx.rotate(e.facing);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.beginPath(); ctx.moveTo(e.radius + 5, 0); ctx.lineTo(e.radius + 15, -5); ctx.lineTo(e.radius + 15, 5); ctx.fill();
                ctx.rotate(-e.facing);
            }
            
            if (e.stunTimer > 0) {
                 const time = Date.now() / 100;
                 ctx.fillStyle = '#fbbf24';
                 // Stars over head
                 for(let i=0; i<3; i++) {
                      const starA = time + (Math.PI*2/3)*i;
                      ctx.beginPath(); ctx.arc(Math.cos(starA) * (e.radius + 5), Math.sin(starA) * 5 - e.radius - 5, 3, 0, Math.PI*2); ctx.fill();
                 }
                 // Stun text
                 ctx.font = 'bold 10px monospace';
                 ctx.fillStyle = '#ef4444';
                 ctx.fillText("STUNNED", 0, 8);
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

        // --- HUD ---
        const player = getPlayer();
        if (player && !player.dead) {
             const barW = 100;
             const barH = 8;
             const centerX = width / 2;
             const bottomY = height - 40;

             // Attack Cooldown
             const atkPct = Math.max(0, 1 - (player.attackCooldown / player.maxAttackCooldown));
             ctx.fillStyle = '#1e293b';
             ctx.fillRect(centerX - barW - 10, bottomY, barW, barH);
             ctx.fillStyle = atkPct === 1 ? '#ef4444' : '#64748b';
             ctx.fillRect(centerX - barW - 10, bottomY, barW * atkPct, barH);
             ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right';
             ctx.fillText('EMPURRÃO (SPC)', centerX - 15, bottomY - 5);

             // Skill Cooldown
             const skillPct = Math.max(0, 1 - (player.skillCooldown / player.maxSkillCooldown));
             ctx.fillStyle = '#1e293b';
             ctx.fillRect(centerX + 10, bottomY, barW, barH);
             ctx.fillStyle = skillPct === 1 ? player.color : '#64748b';
             ctx.fillRect(centerX + 10, bottomY, barW * skillPct, barH);
             ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
             ctx.fillText('HABILIDADE (E)', centerX + 15, bottomY - 5);
        }

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
  }, [gameState, selectedAbility, gameMode, isConnected, onlineCount, user, careerPushes, isAdmin]);

  const getPlayer = () => gameRef.current.entities.find(e => e.isPlayer);

  return (
    <div ref={containerRef} className="w-full h-full relative font-mono select-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      
      {gameState === 'LOBBY' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20 overflow-y-auto py-8">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full animate-in zoom-in-95 relative my-auto">
                  
                  <button onClick={() => setShowSettings(true)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                      <Settings size={20} />
                  </button>

                  <div className="text-center mb-8">
                    <h2 className="text-4xl font-black text-slate-800 mb-2">PUSH BATTLES</h2>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 font-bold text-sm">
                        {loadingProfile ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                                <Target size={14} className="text-red-500" />
                                <span>TOTAL DE EMPURRÕES: {careerPushes}</span>
                            </>
                        )}
                    </div>
                  </div>

                  {/* ADMIN CONTROL PANEL */}
                  {isAdmin && (
                      <div className="mb-6 p-4 bg-slate-800 rounded-xl border-l-4 border-yellow-500 shadow-xl">
                          <div className="flex items-center gap-2 mb-3 text-yellow-400 font-bold text-xs uppercase tracking-widest">
                              <ShieldAlert size={14} /> Admin Control
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400 block mb-1">Set Career Pushes</label>
                                  <input 
                                    type="number" 
                                    value={careerPushes} 
                                    onChange={handleAdminScoreChange}
                                    className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono"
                                  />
                              </div>
                              <div className="text-xs text-slate-500 max-w-[150px]">
                                  Alterar este valor desbloqueia habilidades instantaneamente.
                              </div>
                          </div>
                      </div>
                  )}

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
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                      {(Object.entries(ABILITIES) as [keyof typeof ABILITIES, any][]).map(([key, data]) => {
                          const isLocked = careerPushes < data.reqPoints;
                          const isSelected = selectedAbility === key;
                          
                          return (
                            <button 
                                key={key}
                                onClick={() => !isLocked && setSelectedAbility(key)}
                                disabled={isLocked}
                                className={`
                                    relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3
                                    ${isSelected ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white hover:border-slate-300'}
                                    ${isLocked ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}
                                `}
                            >
                                {isLocked && (
                                    <div className="absolute inset-0 bg-slate-100/50 flex flex-col items-center justify-center rounded-2xl z-10 backdrop-blur-[1px]">
                                        <Lock className="text-slate-400 mb-1" size={24} />
                                        <div className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm">{data.reqPoints} pts</div>
                                    </div>
                                )}

                                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform" style={{ backgroundColor: isLocked ? '#94a3b8' : data.color }}>
                                    {data.icon}
                                </div>
                                <div className="text-center w-full">
                                    <div className="font-bold text-slate-800 text-sm">{data.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-1 leading-tight">{data.desc}</div>
                                </div>
                            </button>
                          );
                      })}
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
                   <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500">
                       Controles: WASD ou Setas para mover. Espaço para atacar. E para habilidade.
                   </div>
                   <button onClick={() => setShowSettings(false)} className="w-full mt-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">Fechar</button>
               </div>
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                  <h2 className="text-3xl font-black text-slate-800 mb-2">VOCÊ CAIU!</h2>
                  <p className="text-slate-500 mb-6">Empurrões nesta partida: <span className="font-bold text-red-500">{gameRef.current.currentScore}</span></p>
                  
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                      <div className="text-xs font-bold text-slate-400 uppercase">Total Carreira</div>
                      <div className="text-2xl font-black text-slate-800">{careerPushes}</div>
                  </div>

                  <button onClick={() => setGameState('LOBBY')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl w-full">VOLTAR AO LOBBY</button>
              </div>
          </div>
      )}

      {gameState === 'VICTORY' && (
          <div className="absolute inset-0 flex items-center justify-center bg-yellow-500/20 backdrop-blur-sm z-20">
              <div className="bg-white p-12 rounded-3xl shadow-2xl border-4 border-yellow-400 text-center animate-in zoom-in-95 transform scale-110">
                  <Trophy className="mx-auto text-yellow-500 mb-4 drop-shadow-lg" size={64} />
                  <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">VITÓRIA!</h2>
                  <p className="text-slate-500 mb-8 font-medium">Você é o último sobrevivente!</p>
                  
                  <div className="mb-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <div className="text-xs font-bold text-yellow-600 uppercase mb-1">Bônus de Vitória</div>
                      <div className="text-3xl font-black text-yellow-500">+5 EMPURRÕES</div>
                  </div>

                  <button onClick={() => setGameState('LOBBY')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl w-full shadow-xl">VOLTAR AO LOBBY</button>
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