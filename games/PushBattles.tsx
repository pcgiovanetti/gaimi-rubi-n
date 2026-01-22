import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Zap, Target, Globe, Users, Lock, Wind, Crosshair, Loader2, ShieldAlert, Trophy, Circle, Hexagon, Triangle, Square, Star, Crown, Box, Ghost, Anchor, RefreshCw, Link, MousePointer2, Gem, Skull, Bomb, Infinity, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Admin Configuration
const ADMIN_EMAIL = "pcgiovanetti2011@gmail.com";

interface Trap {
    id: string;
    x: number;
    y: number;
    radius: number;
    ownerId: string;
    type: 'LEGO' | 'MINE' | 'BLACKHOLE';
    color: string;
    active: boolean;
}

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
  isVip: boolean; // VIP Status
  isRemote?: boolean; 
  
  // Ability System
  ability: string;
  
  // Stats
  moveSpeed: number; 
  mass: number; 
  invisible: boolean; 
  invulnerable: boolean; // For Repulsor
  
  // Attack Logic
  isAttacking: boolean;
  attackTimer: number; 
  hitList: string[];
  lastAttackerId: string | null; 
  
  // Visuals
  hookTarget?: { x: number, y: number }; // For Hook visual
  
  // Cooldowns
  attackCooldown: number; 
  skillCooldown: number;  
  maxSkillCooldown: number;
  maxAttackCooldown: number;
  
  // Passive Logic
  passiveTimer: number;
  maxPassiveTimer: number;

  dead: boolean;
  facing: number; 
  stunTimer: number; 
  skillAnim: number; 
}

const ARENA_RADIUS = 1000; // Increased size significantly
const PLAYER_RADIUS = 20;
const FRICTION = 0.92;
const ATTACK_DURATION = 15; 
const ATTACK_RADIUS = 45;
const PUSH_FORCE = 22.0;

// --- ABILITIES CONFIGURATION ---
const ABILITIES: Record<string, any> = {
  // --- STARTER ---
  IMPACT: { 
      type: 'ACTIVE', name: 'Impacto', desc: '[ATIVO] Empurrão leve em área.', 
      color: '#3b82f6', icon: <Target />, cooldown: 180, range: 140, force: 18.0, stun: 45, reqPoints: 0 
  },
  
  // --- TIER 1 (Tactical) ---
  LEGO: { 
      type: 'PASSIVE', name: 'Lego', desc: '[PASSIVO] Solta blocos no chão.', 
      color: '#ef4444', icon: <Box />, cooldown: 0, passiveCooldown: 240, range: 0, force: 0, stun: 0, reqPoints: 50 
  },
  DASH: { 
      type: 'ACTIVE', name: 'Dash', desc: '[ATIVO] Aceleração explosiva.', 
      color: '#f59e0b', icon: <Wind />, cooldown: 120, range: 0, force: 20.0, stun: 30, reqPoints: 100 
  },
  
  // --- TIER 2 (Defensive/Tricky) ---
  SPIKES: { 
      type: 'PASSIVE', name: 'Espinhos', desc: '[PASSIVO] Dano ao contato.', 
      color: '#64748b', icon: <Triangle />, cooldown: 0, passiveCooldown: 60, range: 40, force: 15.0, stun: 10, reqPoints: 200 
  },
  FLASH: { 
      type: 'ACTIVE', name: 'Flash', desc: '[ATIVO] Teleporte instantâneo.', 
      color: '#ec4899', icon: <Zap />, cooldown: 200, range: 250, force: 0, stun: 0, reqPoints: 300 
  },

  // --- TIER 3 (Specialist) ---
  HOOK: { 
      type: 'ACTIVE', name: 'Gancho', desc: '[ATIVO] Puxa inimigo (Nerfado).', 
      color: '#d97706', icon: <Link />, cooldown: 300, range: 350, force: -12.0, stun: 30, reqPoints: 500 
  },
  GHOST: { 
      type: 'ACTIVE', name: 'Fantasma', desc: '[ATIVO] Invisível e intangível.', 
      color: '#cbd5e1', icon: <Ghost />, cooldown: 450, range: 0, force: 0, stun: 0, reqPoints: 750 
  },
  
  // --- TIER 4 (Chaos) ---
  SWAP: { 
      type: 'ACTIVE', name: 'Troca', desc: '[ATIVO] Troca de lugar com inimigo.', 
      color: '#8b5cf6', icon: <RefreshCw />, cooldown: 600, range: 500, force: 0, stun: 20, reqPoints: 1000 
  },
  REPULSOR: { 
      type: 'ACTIVE', name: 'Repulsor', desc: '[ATIVO] Reflete ataques por 2s.', 
      color: '#10b981', icon: <ShieldAlert />, cooldown: 400, range: 0, force: 0, stun: 0, reqPoints: 1500 
  },
  MASS: { 
      type: 'PASSIVE', name: 'Colosso', desc: '[PASSIVO] Imune a empurrões leves.', 
      color: '#1e293b', icon: <Anchor />, cooldown: 0, passiveCooldown: 0, range: 0, force: 0, stun: 0, reqPoints: 2000 
  },

  // --- VIP ONLY ---
  OVERKILL: { 
      type: 'PASSIVE', name: 'OVERKILL', desc: '[VIP] HK. Alcance curto. Auto-atk.', 
      color: '#000000', icon: <Skull />, cooldown: 0, passiveCooldown: 0, range: 35, force: 150.0, stun: 120, reqPoints: 999999 
  },

  // --- DEV ONLY (ADMIN) ---
  ADMIN_BLOCKY: { type: 'PASSIVE', name: '[ADM] BLOCKY', desc: 'Lego Turbo.', color: '#ef4444', icon: <Box />, cooldown: 0, passiveCooldown: 5, range: 0, force: 0, stun: 0, reqPoints: 999999 },
  ADMIN_FLASH: { type: 'ACTIVE', name: '[ADM] F.L.A.S.H', desc: 'Flash infinito.', color: '#ec4899', icon: <Zap />, cooldown: 10, range: 400, force: 0, stun: 0, reqPoints: 999999 },
  ADMIN_GOD: { type: 'PASSIVE', name: '[ADM] GOD', desc: 'Invencível + Speed.', color: '#fbbf24', icon: <Crown />, cooldown: 0, passiveCooldown: 0, range: 0, force: 0, stun: 0, reqPoints: 999999 },
  ADMIN_BLACKHOLE: { type: 'ACTIVE', name: '[ADM] VORTEX', desc: 'Puxa todos.', color: '#4c1d95', icon: <Infinity />, cooldown: 60, range: 1000, force: -5.0, stun: 0, reqPoints: 999999 },
  ADMIN_NUKE: { type: 'ACTIVE', name: '[ADM] NUKE', desc: 'Explode o mapa.', color: '#b91c1c', icon: <Bomb />, cooldown: 120, range: 2000, force: 200.0, stun: 300, reqPoints: 999999 },
};

const BOT_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Omega"];

const PushBattles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<'LOBBY' | 'PLAYING' | 'GAMEOVER'>('LOBBY');
  const [gameMode, setGameMode] = useState<'BOTS' | 'ONLINE'>('BOTS');
  const [selectedAbility, setSelectedAbility] = useState<string>('IMPACT');
  const [highScore, setHighScore] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [careerPushes, setCareerPushes] = useState(0); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false); 
  const [notification, setNotification] = useState<string | null>(null);
  
  // Admin UI State
  const [targetVipId, setTargetVipId] = useState('');

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [proAim, setProAim] = useState(false);

  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const myNameRef = useRef<string>("Player");

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

            const { data, error } = await supabase.from('profiles').select('total_pushes, is_vip').eq('id', session.user.id).single();
            if (data) {
                setCareerPushes(data.total_pushes || 0);
                setIsVip(isUserAdmin || data.is_vip || false); // Admin is automatically VIP
            }
            else if (error && error.code === 'PGRST116') {
                await supabase.from('profiles').insert({ id: session.user.id, full_name: displayName, total_pushes: 0, is_vip: isUserAdmin });
                setIsVip(isUserAdmin);
            }
        }
        setLoadingProfile(false);
    };
    loadUser();

    const savedHigh = localStorage.getItem('pushBattlesHigh');
    if (savedHigh) setHighScore(parseInt(savedHigh));

    const savedProAim = localStorage.getItem('pushBattlesProAim');
    if (savedProAim === 'true') setProAim(true);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const saveProgress = async (sessionPushes: number) => {
      if (!user) return;
      const newTotal = careerPushes + sessionPushes;
      setCareerPushes(newTotal);
      await supabase.from('profiles').upsert({ id: user.id, total_pushes: newTotal, updated_at: new Date() });
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  // ADMIN ACTIONS
  const handleAdminScoreChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isAdmin || !user) return;
      const val = parseInt(e.target.value) || 0;
      setCareerPushes(val);
      await supabase.from('profiles').update({ total_pushes: val }).eq('id', user.id);
  };

  const handleGrantVip = async () => {
      if (!isAdmin || !targetVipId) return;
      try {
          const { error } = await supabase.from('profiles').update({ is_vip: true }).eq('id', targetVipId);
          if (error) throw error;
          showNotification('VIP Concedido com sucesso!');
          setTargetVipId('');
      } catch (err) {
          showNotification('Erro ao dar VIP. Verifique o ID.');
      }
  };

  const handleBuyVip = () => {
      // Placeholder for future Mercado Pago integration
      // window.open('LINK_DO_MERCADO_PAGO', '_blank');
      showNotification('Sistema de Pagamento em Breve!');
  };

  const handleProAimToggle = () => {
      const newVal = !proAim;
      setProAim(newVal);
      localStorage.setItem('pushBattlesProAim', String(newVal));
  };

  const gameRef = useRef({
    entities: [] as Entity[],
    traps: [] as Trap[],
    particles: [] as any[],
    camera: { x: 0, y: 0 },
    keys: { up: false, down: false, left: false, right: false, attack: false, skill: false },
    mouse: { x: 0, y: 0 },
    settings: { proAim: false },
    animationId: 0,
    width: 0,
    height: 0,
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    currentScore: 0,
    lastBroadcast: 0
  });

  useEffect(() => {
      gameRef.current.settings.proAim = proAim;
  }, [proAim]);

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

  const spawnTrap = (x: number, y: number, type: 'LEGO' | 'MINE' | 'BLACKHOLE', ownerId: string, color: string) => {
      gameRef.current.traps.push({
          id: Math.random().toString(36),
          x, y, 
          radius: type === 'LEGO' ? 15 : (type === 'BLACKHOLE' ? 40 : 20),
          type,
          ownerId,
          color,
          active: true
      });
  };

  const initGame = async () => {
    const ents: Entity[] = [];
    const abilityConfig = ABILITIES[selectedAbility];
    
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
      isVip: isVip, 
      ability: selectedAbility,
      moveSpeed: selectedAbility === 'ADMIN_GOD' ? 0.6 : (abilityConfig.name === 'Colosso' ? 0.22 : 0.30), 
      mass: selectedAbility === 'ADMIN_GOD' ? 100 : (abilityConfig.name === 'Colosso' ? 2.5 : 1.0),
      invisible: false,
      invulnerable: selectedAbility === 'ADMIN_GOD',
      isAttacking: false,
      attackTimer: 0,
      hitList: [],
      lastAttackerId: null,
      attackCooldown: 0,
      skillCooldown: 0,
      maxSkillCooldown: abilityConfig.cooldown || 0,
      maxAttackCooldown: selectedAbility === 'OVERKILL' ? 99999 : 40, // Disable manual attack for Overkill
      passiveTimer: abilityConfig.passiveCooldown || 0,
      maxPassiveTimer: abilityConfig.passiveCooldown || 0,
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
    gameRef.current.traps = [];
    gameRef.current.particles = [];
    gameRef.current.currentScore = 0;
    setGameState('PLAYING');
  };

  const connectToRoom = async () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const channel = supabase.channel('push_battles_global', {
        config: { broadcast: { self: false }, presence: { key: myIdRef.current } },
      });

      channel
        .on('broadcast', { event: 'player_update' }, ({ payload }) => handleRemoteUpdate(payload))
        .on('broadcast', { event: 'player_attack' }, ({ payload }) => handleRemoteAttack(payload))
        .on('broadcast', { event: 'ability_trigger' }, ({ payload }) => {
            if (payload.type === 'LEGO') spawnTrap(payload.x, payload.y, 'LEGO', payload.id, payload.color);
        })
        .on('broadcast', { event: 'player_hit' }, ({ payload }) => handleRemoteHit(payload))
        .on('broadcast', { event: 'player_teleport' }, ({ payload }) => handleRemoteTeleport(payload))
        .on('broadcast', { event: 'player_killed' }, ({ payload }) => {
            if (payload.killedBy === myIdRef.current) {
                gameRef.current.currentScore += 5;
                showNotification(`VOCÊ DERRUBOU ${payload.victimName}! +5 PTS`);
                spawnParticles(gameRef.current.width/2, gameRef.current.height/2, '#fbbf24', 50);
            }
        })
        .on('presence', { event: 'sync' }, () => {
           const state = channel.presenceState();
           const presenceIds = Object.keys(state);
           setOnlineCount(presenceIds.length);
           gameRef.current.entities = gameRef.current.entities.filter(e => {
               if (e.isPlayer) return true;
               if (!e.isRemote) return true;
               const stillOnline = presenceIds.includes(e.id);
               if (!stillOnline) spawnParticles(e.x, e.y, e.color, 10);
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
          const dist = Math.sqrt((data.x - existing.x)**2 + (data.y - existing.y)**2);
          if (dist > 150) {
              existing.x = data.x;
              existing.y = data.y;
          } else {
              existing.x += (data.x - existing.x) * 0.25;
              existing.y += (data.y - existing.y) * 0.25;
          }
          existing.vx = data.vx || 0;
          existing.vy = data.vy || 0;
          existing.facing = data.facing;
          existing.ability = data.ability;
          existing.invisible = data.invisible || false;
          existing.invulnerable = data.invulnerable || false;
          existing.hookTarget = data.hookTarget;
          existing.isVip = data.isVip;
          
          if (data.stunned) existing.stunTimer = Math.max(existing.stunTimer, 5);
          if (data.dead && !existing.dead) spawnParticles(existing.x, existing.y, existing.color, 20);
          existing.dead = data.dead;
      } else if (!data.dead) {
          const config = ABILITIES[data.ability] || ABILITIES.IMPACT;
          ref.entities.push({
              id: data.id, name: data.name || "Unknown", x: data.x, y: data.y, vx: 0, vy: 0,
              radius: PLAYER_RADIUS, color: config.color, isPlayer: false, isAdmin: data.isAdmin, isVip: data.isVip,
              isRemote: true, ability: data.ability, moveSpeed: 0, mass: 1, invisible: false,
              invulnerable: false, isAttacking: false, attackTimer: 0, hitList: [], lastAttackerId: null,
              attackCooldown: 0, skillCooldown: 0, maxSkillCooldown: 0, maxAttackCooldown: 40,
              passiveTimer: 0, maxPassiveTimer: 0, dead: false, facing: data.facing, stunTimer: 0, skillAnim: 0
          });
      }
  };

  const handleRemoteTeleport = (payload: any) => {
      const ent = gameRef.current.entities.find(e => e.id === payload.id);
      if (ent) {
          spawnParticles(ent.x, ent.y, ent.color, 15);
          ent.x = payload.x;
          ent.y = payload.y;
          spawnParticles(ent.x, ent.y, ent.color, 15);
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
              const config = ABILITIES[ent.ability] || ABILITIES.IMPACT;
              if (ent.ability === 'FLASH' || ent.ability === 'ADMIN_FLASH') spawnParticles(ent.x, ent.y, config.color, 15);
              else spawnShockwave(ent.x, ent.y, config.range || 100, config.color, 10);
          }
      }
  };

  const handleRemoteHit = (payload: any) => {
      const me = getPlayer();
      if (me && me.id === payload.targetId && !me.dead) {
          if (me.invulnerable) return;

          const resistance = me.mass || 1.0;
          const finalForce = payload.force / resistance;
          
          me.vx += Math.cos(payload.angle) * finalForce;
          me.vy += Math.sin(payload.angle) * finalForce;
          me.stunTimer = payload.stun;
          me.lastAttackerId = payload.attackerId; 
          
          if (me.invisible) me.invisible = false;
          spawnParticles(me.x, me.y, me.color, 10);
      }
  };

  const createBot = (index: number): Entity => {
     const angle = (Math.PI * 2 / 4) * index;
     const dist = 300;
     const botAbilities = ['IMPACT', 'DASH', 'LEGO', 'HOOK', 'SWAP', 'REPULSOR'];
     const randomAbility = botAbilities[Math.floor(Math.random() * botAbilities.length)];
     const config = ABILITIES[randomAbility];

     return {
         id: `bot-${Math.random()}`, name: BOT_NAMES[index] || `Bot ${index}`, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
         vx: 0, vy: 0, radius: PLAYER_RADIUS, color: config.color, isPlayer: false, isAdmin: false, isVip: false,
         ability: randomAbility, moveSpeed: randomAbility === 'MASS' ? 0.22 : 0.25, mass: randomAbility === 'MASS' ? 2.5 : 1.0,
         invisible: false, invulnerable: false, isAttacking: false, attackTimer: 0, hitList: [], lastAttackerId: null,
         attackCooldown: 0, skillCooldown: 0, maxSkillCooldown: config.cooldown, maxAttackCooldown: 40,
         passiveTimer: config.passiveCooldown || 0, maxPassiveTimer: config.passiveCooldown || 0, dead: false,
         facing: angle + Math.PI, stunTimer: 0, skillAnim: 0
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

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        gameRef.current.mouse.x = e.clientX - rect.left;
        gameRef.current.mouse.y = e.clientY - rect.top;
    };

    const getTouchPos = (touch: React.Touch | Touch) => {
        const rect = canvas.getBoundingClientRect();
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
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
               if (pos.y < h - 150 && pos.x > w - 150) gameRef.current.keys.skill = true;
               else gameRef.current.keys.attack = true;
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
                 const clampedDist = Math.min(dist, 50);
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
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // --- GAME LOGIC ---
    
    const applyForce = (target: Entity, sourceId: string, angle: number, force: number, stun: number) => {
        if (target.id === sourceId || target.dead || target.invisible || target.invulnerable) return;
        
        const resistance = target.mass || 1.0;
        const finalForce = force / resistance;

        if (!target.isRemote) {
            target.vx += Math.cos(angle) * finalForce;
            target.vy += Math.sin(angle) * finalForce;
            target.stunTimer = stun;
            target.lastAttackerId = sourceId;
            if (target.invisible) target.invisible = false;
        } else if (gameMode === 'ONLINE' && channelRef.current) {
             channelRef.current.send({
                 type: 'broadcast',
                 event: 'player_hit',
                 payload: { targetId: target.id, attackerId: sourceId, force: force, angle: angle, stun: stun }
             });
        }
        spawnParticles(target.x, target.y, target.color, 5);
    };

    const applyAreaEffect = (source: Entity, range: number, force: number, stun: number, directional: boolean = false) => {
        gameRef.current.entities.forEach(target => {
            if (target.id === source.id) return;
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
                applyForce(target, source.id, angle, force, stun);
            }
        });
    };

    const startBasicAttack = (ent: Entity) => {
        if (ent.ability === 'OVERKILL') return; // Cannot attack manually
        ent.isAttacking = true;
        ent.attackTimer = ATTACK_DURATION;
        ent.hitList = [];
        ent.attackCooldown = ent.maxAttackCooldown;
        ent.invisible = false; 
    };

    const useActiveSkill = (ent: Entity) => {
        const config = ABILITIES[ent.ability];
        if (config.type !== 'ACTIVE') return;

        ent.skillCooldown = ent.maxSkillCooldown;
        ent.skillAnim = 15;
        ent.invisible = false;

        // --- SKILL IMPLEMENTATIONS ---
        
        if (ent.ability === 'DASH') {
            const f = config.force * 0.5;
            ent.vx += Math.cos(ent.facing) * f;
            ent.vy += Math.sin(ent.facing) * f;
            spawnParticles(ent.x, ent.y, config.color, 10);
            applyAreaEffect(ent, 80, 20, 30, false);
        }
        else if (ent.ability === 'FLASH' || ent.ability === 'ADMIN_FLASH') {
            ent.x += Math.cos(ent.facing) * config.range;
            ent.y += Math.sin(ent.facing) * config.range;
            spawnParticles(ent.x, ent.y, config.color, 20);
        }
        else if (ent.ability === 'GHOST') {
            ent.invisible = true;
            spawnParticles(ent.x, ent.y, '#ffffff', 15);
        }
        else if (ent.ability === 'REPULSOR') {
            ent.invulnerable = true;
            spawnShockwave(ent.x, ent.y, 60, config.color, 12);
        }
        else if (ent.ability === 'IMPACT' || ent.ability === 'DEV_NOVA' || ent.ability === 'ADMIN_NUKE') {
            spawnShockwave(ent.x, ent.y, config.range, config.color, 15);
            applyAreaEffect(ent, config.range, config.force, config.stun, false);
        }
        else if (ent.ability === 'ADMIN_BLACKHOLE') {
             gameRef.current.entities.forEach(target => {
                 if (target.id === ent.id || target.dead) return;
                 const angle = Math.atan2(ent.y - target.y, ent.x - target.x);
                 applyForce(target, ent.id, angle, 10.0, 5); // Constant suck
             });
             spawnShockwave(ent.x, ent.y, 100, '#4c1d95', 5);
        }
        else if (ent.ability === 'HOOK') {
             // Find nearest target in cone
             let target = null;
             let minDist = config.range;
             gameRef.current.entities.forEach(other => {
                 if (other.id === ent.id || other.dead || other.invisible) return;
                 const dx = other.x - ent.x;
                 const dy = other.y - ent.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < minDist) {
                     const angle = Math.atan2(dy, dx);
                     let diff = angle - ent.facing;
                     while (diff > Math.PI) diff -= Math.PI * 2;
                     while (diff < -Math.PI) diff += Math.PI * 2;
                     if (Math.abs(diff) < 0.5) { // Cone check
                         minDist = dist;
                         target = other;
                     }
                 }
             });

             if (target) {
                 ent.hookTarget = { x: target.x, y: target.y };
                 // NERF: Gentle pull, don't pass
                 const pullAngle = Math.atan2(ent.y - target.y, ent.x - target.x);
                 // Reduced force significantly so they don't overshoot
                 applyForce(target, ent.id, pullAngle, 12, 30); 
             } else {
                 ent.hookTarget = { x: ent.x + Math.cos(ent.facing)*config.range, y: ent.y + Math.sin(ent.facing)*config.range };
             }
        }
        else if (ent.ability === 'SWAP') {
            // Find nearest enemy
            let target = null;
            let minDist = config.range;
            gameRef.current.entities.forEach(other => {
                 if (other.id === ent.id || other.dead) return;
                 const dist = Math.sqrt((other.x - ent.x)**2 + (other.y - ent.y)**2);
                 if (dist < minDist) { minDist = dist; target = other; }
            });

            if (target) {
                // Swap coords
                const tempX = ent.x; const tempY = ent.y;
                ent.x = target.x; ent.y = target.y;
                
                if (!target.isRemote) {
                    target.x = tempX; target.y = tempY;
                    target.stunTimer = 30; // Confused
                } else if (gameMode === 'ONLINE' && channelRef.current) {
                    channelRef.current.send({
                         type: 'broadcast',
                         event: 'player_teleport',
                         payload: { id: target.id, x: tempX, y: tempY }
                    });
                }
                
                spawnParticles(ent.x, ent.y, config.color, 20);
                spawnParticles(tempX, tempY, config.color, 20);
            }
        }
    };

    const triggerPassive = (ent: Entity) => {
        const config = ABILITIES[ent.ability];
        if (ent.ability === 'LEGO' || ent.ability === 'ADMIN_BLOCKY') {
            spawnTrap(ent.x, ent.y, 'LEGO', ent.id, config.color);
            if (gameMode === 'ONLINE' && channelRef.current && ent.isPlayer) {
                 channelRef.current.send({ type: 'broadcast', event: 'ability_trigger', payload: { type: 'LEGO', x: ent.x, y: ent.y, id: ent.id, color: config.color } });
            }
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
        
        // ONLINE SYNC
        if (gameMode === 'ONLINE' && player && channelRef.current) {
            const now = Date.now();
            if (now - ref.lastBroadcast > 30) { 
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'player_update',
                    payload: {
                        id: player.id, name: player.name, isAdmin: player.isAdmin, x: player.x, y: player.y,
                        vx: player.vx, vy: player.vy, facing: player.facing, ability: player.ability,
                        dead: player.dead, stunned: player.stunTimer > 0, invisible: player.invisible,
                        invulnerable: player.invulnerable, hookTarget: player.hookTarget, isVip: player.isVip
                    }
                });
                ref.lastBroadcast = now;
            }
        }

        ref.entities.forEach(e => {
            if (e.dead) return;

            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.skillCooldown > 0) e.skillCooldown--;
            if (e.skillAnim > 0) e.skillAnim--;
            else e.hookTarget = undefined; // Clear visual hook

            // Special statuses expiration
            if (e.invisible && e.skillCooldown <= e.maxSkillCooldown - 120) e.invisible = false;
            if (e.invulnerable && e.skillCooldown <= e.maxSkillCooldown - 120 && e.ability !== 'ADMIN_GOD') e.invulnerable = false;

            if (!e.isRemote && e.maxPassiveTimer > 0) {
                e.passiveTimer--;
                if (e.passiveTimer <= 0) {
                    triggerPassive(e);
                    e.passiveTimer = e.maxPassiveTimer;
                }
            }
            
            if (!e.isRemote && e.ability === 'SPIKES' && !e.invisible) applyAreaEffect(e, 40, 15, 10, false);
            
            // VIP Overkill Logic (Passive Aura)
            if (!e.isRemote && e.ability === 'OVERKILL') {
                 ref.entities.forEach(target => {
                      if (target.id === e.id || target.dead) return;
                      const dx = target.x - e.x; const dy = target.y - e.y;
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      // Reduced range, HUGE force
                      if (dist < ABILITIES.OVERKILL.range + target.radius) {
                          const angle = Math.atan2(dy, dx);
                          applyForce(target, e.id, angle, ABILITIES.OVERKILL.force, ABILITIES.OVERKILL.stun);
                          spawnParticles(target.x, target.y, '#000000', 10);
                      }
                 });
            }

            if (e.isAttacking) {
                e.attackTimer--;
                if (e.attackTimer <= 0) e.isAttacking = false;
            }
            if (e.stunTimer > 0) e.stunTimer--;

            if (e.isRemote) {
                if (Math.abs(e.vx) > 0.01) e.x += e.vx;
                if (Math.abs(e.vy) > 0.01) e.y += e.vy;
                e.vx *= FRICTION; e.vy *= FRICTION;
            } else {
                ref.traps.forEach((trap, tIdx) => {
                     if (!trap.active || trap.ownerId === e.id) return;
                     const dx = e.x - trap.x; const dy = e.y - trap.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     if (dist < e.radius + trap.radius) {
                         trap.active = false;
                         spawnParticles(trap.x, trap.y, trap.color, 10);
                         if (trap.type === 'LEGO') {
                             e.stunTimer = 180;
                             applyForce(e, trap.ownerId, Math.atan2(dy, dx), 10, 180);
                         }
                     }
                });

                if (e.isAttacking) {
                    ref.entities.forEach(target => {
                        if (target.id === e.id || target.dead || e.hitList.includes(target.id)) return;
                        const dx = target.x - e.x; const dy = target.y - e.y;
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if (dist < ATTACK_RADIUS + target.radius) {
                            e.hitList.push(target.id);
                            applyForce(target, e.id, Math.atan2(dy, dx), PUSH_FORCE, 45);
                        }
                    });
                }

                if (e.stunTimer <= 0) {
                    // Orientation Logic
                    if (e.isPlayer && ref.settings.proAim) {
                        // Pro Aim (Mouse)
                        const mx = ref.mouse.x - ref.width/2 + ref.camera.x;
                        const my = ref.mouse.y - ref.height/2 + ref.camera.y;
                        e.facing = Math.atan2(my - e.y, mx - e.x);
                    } else if (Math.abs(e.vx) > 0.05 || Math.abs(e.vy) > 0.05) {
                        // Movement Direction
                        if (e.isPlayer) e.facing = Math.atan2(e.vy, e.vx);
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
                        let target = null; let minDist = 9999;
                        ref.entities.forEach(other => {
                            if (other.id !== e.id && !other.dead && !other.invisible) {
                                const d = Math.sqrt((other.x - e.x)**2 + (other.y - e.y)**2);
                                if (d < minDist) { minDist = d; target = other; }
                            }
                        });

                        if (target) {
                            const targetAngle = Math.atan2(target.y - e.y, target.x - e.x);
                            let angleDiff = targetAngle - e.facing;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                            if (Math.abs(angleDiff) > 0.1) e.facing += Math.sign(angleDiff) * 0.1;
                            else e.facing = targetAngle;
                            e.vx += Math.cos(e.facing) * e.moveSpeed;
                            e.vy += Math.sin(e.facing) * e.moveSpeed;
                            if (minDist < 80 && e.attackCooldown <= 0 && !e.isAttacking && Math.random() < 0.05) startBasicAttack(e);
                            if (minDist < (ABILITIES[e.ability]?.range || 100) && e.skillCooldown <= 0 && Math.random() < 0.01) useActiveSkill(e);
                        }
                        
                        const distFromCenter = Math.sqrt(e.x*e.x + e.y*e.y);
                        if (distFromCenter > ARENA_RADIUS * 0.9) {
                            const angle = Math.atan2(0 - e.y, 0 - e.x);
                            e.vx += Math.cos(angle) * 0.5; e.vy += Math.sin(angle) * 0.5;
                        }
                    }
                }
                e.x += e.vx; e.y += e.vy; e.vx *= FRICTION; e.vy *= FRICTION;
            }
        });
        
        ref.traps = ref.traps.filter(t => t.active);

        if (player && !player.dead && player.stunTimer <= 0) {
            // Manual attack disabled for Overkill
            if (ref.keys.attack && player.attackCooldown <= 0 && !player.isAttacking && player.ability !== 'OVERKILL') {
                startBasicAttack(player);
                if (gameMode === 'ONLINE' && channelRef.current) {
                    channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'BASIC' } });
                }
            }
            if (ref.keys.skill && player.skillCooldown <= 0) {
                useActiveSkill(player);
                if (gameMode === 'ONLINE' && channelRef.current) {
                    channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'SKILL' } });
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
                    if (gameMode === 'ONLINE' && channelRef.current && e.lastAttackerId) {
                         channelRef.current.send({ type: 'broadcast', event: 'player_killed', payload: { killedBy: e.lastAttackerId, victimName: e.name } });
                    }
                    saveProgress(ref.currentScore);
                    setTimeout(() => setGameState('GAMEOVER'), 1000);
                } else if (!e.isRemote) {
                    if (e.lastAttackerId === myIdRef.current) {
                        ref.currentScore += 1;
                        if (ref.currentScore > highScore) {
                            setHighScore(ref.currentScore);
                            localStorage.setItem('pushBattlesHigh', ref.currentScore.toString());
                        }
                    }
                    setTimeout(() => {
                         const newBot = createBot(Math.floor(Math.random()*4));
                         const idx = ref.entities.findIndex(ent => ent.id === e.id);
                         if (idx !== -1) ref.entities[idx] = newBot;
                    }, 1500);
                }
            }
        });

        ref.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
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

        ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
        ctx.save(); ctx.clip(); ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 2;
        for(let i = -ARENA_RADIUS; i < ARENA_RADIUS; i+=80) {
            ctx.beginPath(); ctx.moveTo(i, -ARENA_RADIUS); ctx.lineTo(i, ARENA_RADIUS); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-ARENA_RADIUS, i); ctx.lineTo(ARENA_RADIUS, i); ctx.stroke();
        }
        ctx.restore();

        ref.traps.forEach(t => {
            ctx.fillStyle = t.color;
            if (t.type === 'LEGO') {
                ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(t.x - 8, t.y - 8, 4, 4); ctx.fillRect(t.x + 4, t.y - 8, 4, 4); ctx.fillRect(t.x - 8, t.y + 4, 4, 4); ctx.fillRect(t.x + 4, t.y + 4, 4, 4);
            }
        });

        ref.entities.forEach(e => {
            if (e.dead) return;
            
            // Draw Hook Visual
            if (e.hookTarget) {
                ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.hookTarget.x, e.hookTarget.y);
                ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4; ctx.stroke();
                ctx.beginPath(); ctx.arc(e.hookTarget.x, e.hookTarget.y, 5, 0, Math.PI*2); ctx.fillStyle = '#d97706'; ctx.fill();
            }

            ctx.save(); ctx.translate(e.x, e.y);
            
            if (e.invisible) {
                if (e.isPlayer) ctx.globalAlpha = 0.5; else { ctx.restore(); return; }
            }

            if (e.isAttacking) {
                ctx.beginPath(); ctx.arc(0, 0, ATTACK_RADIUS + 5, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.fill();
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; ctx.lineWidth = 1; ctx.stroke();
            }

            if (e.invulnerable) {
                ctx.beginPath(); ctx.arc(0, 0, e.radius + 10, 0, Math.PI*2);
                ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.stroke();
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; ctx.fill();
            }
            
            // VIP Crown and Golden Name
            if (e.isVip) {
                 ctx.save();
                 ctx.translate(0, -e.radius - 25);
                 // Simple Crown
                 ctx.beginPath();
                 ctx.fillStyle = '#fbbf24'; // Gold
                 ctx.moveTo(-8, 0); ctx.lineTo(-12, -8); ctx.lineTo(-4, -4); ctx.lineTo(0, -10); ctx.lineTo(4, -4); ctx.lineTo(12, -8); ctx.lineTo(8, 0);
                 ctx.fill();
                 ctx.restore();
            }

            // Name Color Logic
            ctx.save(); 
            if (e.isAdmin) ctx.fillStyle = '#ef4444'; // Red for Admin
            else if (e.isVip) ctx.fillStyle = '#fbbf24'; // Yellow for VIP
            else ctx.fillStyle = '#64748b'; // Slate for others

            ctx.font = (e.isAdmin || e.isVip) ? 'bold 12px monospace' : 'bold 11px monospace'; 
            ctx.textAlign = 'center'; 
            ctx.fillText(e.name.toUpperCase(), 0, -e.radius - 12); 
            ctx.restore();

            ctx.fillStyle = e.stunTimer > 0 ? '#94a3b8' : e.color; 
            if (e.ability === 'SPIKES') {
                for(let i=0; i<8; i++) {
                    const a = (Math.PI*2/8)*i;
                    ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.radius, Math.sin(a)*e.radius);
                    ctx.lineTo(Math.cos(a)*(e.radius+8), Math.sin(a)*(e.radius+8));
                    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke();
                }
            }
            if (e.ability === 'MASS') { ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); }
            if (e.ability === 'OVERKILL') { ctx.lineWidth = 3; ctx.strokeStyle = '#ff0000'; ctx.stroke(); }

            ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
            
            if (!e.isPlayer) {
                ctx.rotate(e.facing); ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
                ctx.beginPath(); ctx.moveTo(e.radius + 5, 0); ctx.lineTo(e.radius + 15, -5); ctx.lineTo(e.radius + 15, 5); ctx.fill();
                ctx.rotate(-e.facing);
            }
            
            if (e.stunTimer > 0) {
                 const time = Date.now() / 100; ctx.fillStyle = '#fbbf24';
                 for(let i=0; i<3; i++) {
                      const starA = time + (Math.PI*2/3)*i;
                      ctx.beginPath(); ctx.arc(Math.cos(starA) * (e.radius + 5), Math.sin(starA) * 5 - e.radius - 5, 3, 0, Math.PI*2); ctx.fill();
                 }
                 ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ef4444'; ctx.fillText("STUNNED", -20, 0);
            }

            const lookAngle = e.facing;
            const eyeOffX = Math.cos(lookAngle) * 8; const eyeOffY = Math.sin(lookAngle) * 8;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(eyeOffX, eyeOffY, 6, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        ref.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
        ctx.globalAlpha = 1.0; ctx.restore();

        const player = getPlayer();
        if (player && !player.dead) {
             const barW = 100; const barH = 8; const centerX = width / 2; const bottomY = height - 40;
             const atkPct = Math.max(0, 1 - (player.attackCooldown / player.maxAttackCooldown));
             ctx.fillStyle = '#1e293b'; ctx.fillRect(centerX - barW - 10, bottomY, barW, barH);
             ctx.fillStyle = atkPct === 1 ? '#ef4444' : '#64748b'; ctx.fillRect(centerX - barW - 10, bottomY, barW * atkPct, barH);
             ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right'; ctx.fillText(player.ability === 'OVERKILL' ? 'AUTO-ATK' : 'EMPURRÃO (SPC)', centerX - 15, bottomY - 5);

             const config = ABILITIES[player.ability];
             if (config.type === 'ACTIVE') {
                 const skillPct = Math.max(0, 1 - (player.skillCooldown / player.maxSkillCooldown));
                 ctx.fillStyle = '#1e293b'; ctx.fillRect(centerX + 10, bottomY, barW, barH);
                 ctx.fillStyle = skillPct === 1 ? player.color : '#64748b'; ctx.fillRect(centerX + 10, bottomY, barW * skillPct, barH);
                 ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillText('HABILIDADE (E)', centerX + 15, bottomY - 5);
             } else {
                 ctx.fillStyle = '#64748b'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillText('PASSIVA: ATIVA', centerX + 15, bottomY);
             }
        }
        
        ctx.fillStyle = '#0f172a'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'left'; ctx.fillText(`PONTOS: ${ref.currentScore}`, 20, 40);
        ctx.fillStyle = '#64748b'; ctx.font = 'bold 16px monospace'; ctx.fillText(`RECORD: ${highScore}`, 20, 65);
        if (gameMode === 'ONLINE') {
            ctx.fillStyle = isConnected ? '#22c55e' : '#ef4444'; ctx.fillText(isConnected ? `ONLINE: ${onlineCount}` : 'CONECTANDO...', 20, 90);
        }
        if (notification) {
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center'; ctx.fillText(notification, width/2, 100); ctx.fillStyle = '#000'; ctx.strokeText(notification, width/2, 100);
        }
        if (ref.joystick.active) {
            ctx.beginPath(); ctx.arc(ref.joystick.x, ref.joystick.y, 50, 0, Math.PI*2); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 4; ctx.stroke();
            ctx.beginPath(); ctx.arc(ref.joystick.x + ref.joystick.dx, ref.joystick.y + ref.joystick.dy, 25, 0, Math.PI*2); ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.fill();
        }
    };

    const drawLobby = (ctx: CanvasRenderingContext2D) => {
         const { width, height } = gameRef.current;
         ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, width, height);
    };

    loop();

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState, selectedAbility, gameMode, isConnected, onlineCount, user, careerPushes, isAdmin, notification, proAim, isVip]);

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
                    <div className="flex flex-col items-center gap-2">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 font-bold text-sm">
                            {loadingProfile ? <Loader2 className="animate-spin" size={14} /> : (
                                <> <Target size={14} className="text-red-500" /> <span>TOTAL DE EMPURRÕES: {careerPushes}</span> </>
                            )}
                        </div>
                        {isVip && (
                            <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-bold border border-yellow-200">
                                <Crown size={12} fill="currentColor" /> VIP MEMBER
                            </div>
                        )}
                        {!isVip && !loadingProfile && (
                            <button onClick={handleBuyVip} className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-full text-xs font-bold shadow-lg shadow-yellow-500/30 transition-all active:scale-95 animate-pulse">
                                <CreditCard size={14} /> SEJA VIP - R$ 6,80/mês
                            </button>
                        )}
                    </div>
                  </div>
                  {isAdmin && (
                      <div className="mb-6 p-4 bg-slate-800 rounded-xl border-l-4 border-yellow-500 shadow-xl">
                          <div className="flex items-center gap-2 mb-3 text-yellow-400 font-bold text-xs uppercase tracking-widest"><ShieldAlert size={14} /> Admin Control</div>
                          <div className="flex items-center gap-4 mb-4">
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400 block mb-1">Set Career Pushes</label>
                                  <input type="number" value={careerPushes} onChange={handleAdminScoreChange} className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono" />
                              </div>
                          </div>
                          <div className="flex items-center gap-4">
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400 block mb-1">Conceder VIP (User ID)</label>
                                  <div className="flex gap-2">
                                      <input type="text" value={targetVipId} onChange={(e) => setTargetVipId(e.target.value)} placeholder="UUID..." className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg font-mono text-xs" />
                                      <button onClick={handleGrantVip} className="px-3 bg-yellow-500 text-black font-bold rounded-lg text-xs hover:bg-yellow-400">DAR VIP</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="flex justify-center gap-4 mb-6">
                      <button onClick={() => setGameMode('BOTS')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${gameMode === 'BOTS' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>
                         <Users size={18} /> TREINO (BOTS)
                      </button>
                      <button onClick={() => setGameMode('ONLINE')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${gameMode === 'ONLINE' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 text-slate-500'}`}>
                         <Globe size={18} /> ONLINE
                      </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8 max-h-[300px] overflow-y-auto p-2">
                      {(Object.entries(ABILITIES) as [string, any][]).map(([key, data]) => {
                          const isDev = key.startsWith('DEV_') || key.startsWith('ADMIN_');
                          if (isDev && !isAdmin) return null;
                          
                          // VIP UNLOCK: If isVip, unlock everything except DEV/ADMIN skills (unless admin)
                          let isLocked = !isVip && careerPushes < data.reqPoints;
                          
                          // Overkill is VIP only
                          if (key === 'OVERKILL') isLocked = !isVip && !isAdmin;
                          // Admin skills
                          if (isDev) isLocked = !isAdmin;

                          const isSelected = selectedAbility === key;
                          return (
                            <button key={key} onClick={() => !isLocked && setSelectedAbility(key)} disabled={isLocked} className={`relative p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${isSelected ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white hover:border-slate-300'} ${isLocked ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'} ${isDev ? 'border-yellow-400 bg-slate-900' : ''}`}>
                                {isLocked && (
                                    <div className="absolute inset-0 bg-slate-100/50 flex flex-col items-center justify-center rounded-2xl z-10 backdrop-blur-[1px]">
                                        <Lock className="text-slate-400 mb-1" size={24} />
                                        <div className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm">{data.reqPoints}</div>
                                    </div>
                                )}
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform" style={{ backgroundColor: isLocked ? '#94a3b8' : data.color }}>{data.icon}</div>
                                <div className="text-center w-full"><div className={`font-bold text-xs ${isDev ? 'text-yellow-400' : 'text-slate-800'}`}>{data.name}</div></div>
                            </button>
                          );
                      })}
                  </div>
                  <button onClick={initGame} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-500/20 transition-transform active:scale-95">{gameMode === 'ONLINE' ? 'CONECTAR E JOGAR' : 'ENTRAR NA ARENA'}</button>
              </div>
          </div>
      )}

      {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-2xl shadow-xl w-80 animate-in fade-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={18} /> Configurações</h3><button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                   
                   <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500 mb-4">
                       <h4 className="font-bold text-slate-700 mb-2">Controles</h4>
                       <p>WASD ou Setas para mover. Espaço para atacar. E para habilidade.</p>
                   </div>
                   
                   <div className="mb-6">
                       <button onClick={handleProAimToggle} className={`w-full p-3 rounded-lg flex items-center justify-between border ${proAim ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                           <div className="flex items-center gap-2 font-bold text-sm">
                               <MousePointer2 size={16} /> Pro Aim (PC)
                           </div>
                           <div className={`w-10 h-5 rounded-full relative transition-colors ${proAim ? 'bg-red-500' : 'bg-slate-300'}`}>
                               <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${proAim ? 'left-6' : 'left-1'}`}></div>
                           </div>
                       </button>
                       <p className="text-[10px] text-slate-400 mt-1 pl-1">A mira segue o cursor do mouse.</p>
                   </div>

                   <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">Fechar</button>
               </div>
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                  <h2 className="text-3xl font-black text-slate-800 mb-2">VOCÊ CAIU!</h2>
                  <p className="text-slate-500 mb-6">Pontos nesta partida: <span className="font-bold text-red-500">{gameRef.current.currentScore}</span></p>
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold text-slate-400 uppercase">Total Carreira</div><div className="text-2xl font-black text-slate-800">{careerPushes}</div></div>
                  <button onClick={() => setGameState('LOBBY')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl w-full">VOLTAR AO LOBBY</button>
              </div>
          </div>
      )}

      {gameState === 'PLAYING' && (
          <>
            <div className="absolute bottom-12 left-12 w-32 h-32 rounded-full border-4 border-slate-300/30 flex items-center justify-center pointer-events-none"><div className="text-slate-300/50 font-black text-sm">MOVE</div></div>
            <div className="absolute bottom-12 right-12 w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/50 flex items-center justify-center pointer-events-none"><div className="text-red-500/50 font-black text-sm">ATK</div></div>
            <div className="absolute bottom-48 right-12 w-20 h-20 rounded-full bg-blue-500/20 border-4 border-blue-500/50 flex items-center justify-center pointer-events-none"><div className="text-blue-500/50 font-black text-xs text-center leading-tight">SKILL<br/>(E)</div></div>
          </>
      )}
    </div>
  );
};

export default PushBattles;