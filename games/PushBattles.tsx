import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Zap, Target, Globe, Users, Lock, Wind, Loader2, ShieldAlert, Trophy, Box, Ghost, Anchor, RefreshCw, Link, MousePointer2, Gem, Skull, Bomb, Infinity, TestTube, Flag, MessageSquareWarning, Palette, Check, Triangle, Crown, LogIn, Flame, Bug, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../types';

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
    life: number; 
}

interface Projectile {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    ownerId: string;
    color: string;
    life: number;
    speed: number;
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
  isVip: boolean; 
  isRemote?: boolean; 
  ability: string;
  moveSpeed: number; 
  mass: number; 
  invisible: boolean; 
  invulnerable: boolean; 
  isAttacking: boolean;
  attackTimer: number; 
  hitList: string[];
  lastAttackerId: string | null; 
  hookTarget?: { x: number, y: number }; 
  attackCooldown: number; 
  skillCooldown: number;  
  maxSkillCooldown: number;
  maxAttackCooldown: number;
  passiveTimer: number;
  maxPassiveTimer: number;
  dead: boolean;
  facing: number; 
  stunTimer: number; 
  skillAnim: number;
  respawnTimer?: number;
  burstCount?: number;
  burstTimer?: number;
}

const ARENA_RADIUS = 1000; 
const PLAYER_RADIUS = 20;
const FRICTION = 0.85; 
const ATTACK_DURATION = 12; 
const ATTACK_RADIUS = 45;
const PUSH_FORCE = 60.0;

const PB_TEXTS = {
    en: {
        totalPushes: "TOTAL PUSHES",
        vipMember: "VIP MEMBER",
        trainBots: "TRAIN (BOTS)",
        online: "ONLINE",
        testMode: "TEST ARENA",
        connectPlay: "CONNECT & PLAY",
        enterArena: "ENTER ARENA",
        settings: "Settings",
        controls: "Controls: WASD to move. Space to Attack. E for Ability.",
        proAim: "Pro Aim (PC)",
        proAimDesc: "Aim follows mouse cursor.",
        close: "Close",
        gameOver: "YOU FELL!",
        pointsRound: "Points this round:",
        careerTotal: "Career Total",
        backLobby: "BACK TO MENU",
        skill: "SKILL (E)",
        push: "PUSH (SPC)",
        passive: "PASSIVE",
        active: "ACTIVE",
        points: "POINTS",
        record: "RECORD",
        connecting: "CONNECTING...",
        onlinePlayers: "ONLINE",
        move: "MOVE",
        atk: "ATK",
        theme: "Theme",
        themeDefault: "Default (.io)",
        themeClassic: "Classic (VIP)",
        report: "Report",
        reportTitle: "Report Issue",
        bug: "Bug",
        player: "Player",
        desc: "Description",
        submit: "Submit",
        selectMode: "SELECT MODE",
        selectAbility: "CHOOSE YOUR ABILITY",
        tabPushes: "PUSHES",
        tabBadges: "BADGES",
        locked: "LOCKED",
        cost: "Cost",
        play: "PLAY",
        guest: "GUEST",
        loginReq: "Login Required",
        reqPushes: "Need:",
        reqBadge: "Need Badge:",
        timeStop: "TIME STOPPED!",
        youKilled: "YOU KNOCKED OUT",
        onlyVip: "VIP/Admin Only!",
        reportSent: "Report sent successfully!"
    },
    pt: {
        totalPushes: "TOTAL DE EMPURRÕES",
        vipMember: "MEMBRO VIP",
        trainBots: "TREINO (BOTS)",
        online: "ONLINE",
        testMode: "ARENA DE TESTE",
        connectPlay: "CONECTAR E JOGAR",
        enterArena: "ENTRAR NA ARENA",
        settings: "Configurações",
        controls: "Controles: WASD mover. Espaço atacar. E habilidade.",
        proAim: "Pro Aim (PC)",
        proAimDesc: "A mira segue o cursor do mouse.",
        close: "Fechar",
        gameOver: "VOCÊ CAIU!",
        pointsRound: "Pontos nesta partida:",
        careerTotal: "Total Carreira",
        backLobby: "VOLTAR AO MENU",
        skill: "HABILIDADE (E)",
        push: "EMPURRÃO (SPC)",
        passive: "PASSIVA",
        active: "ATIVÁVEL",
        points: "PONTOS",
        record: "RECORD",
        connecting: "CONECTANDO...",
        onlinePlayers: "ONLINE",
        move: "MOVER",
        atk: "ATK",
        theme: "Tema",
        themeDefault: "Padrão (.io)",
        themeClassic: "Clássico (VIP)",
        report: "Reportar",
        reportTitle: "Reportar Problema",
        bug: "Bug",
        player: "Jogador",
        desc: "Descrição",
        submit: "Enviar",
        selectMode: "SELECIONE O MODO",
        selectAbility: "ESCOLHA SUA HABILIDADE",
        tabPushes: "EMPURRÕES",
        tabBadges: "CONQUISTAS",
        locked: "BLOQUEADO",
        cost: "Custo",
        play: "JOGAR",
        guest: "CONVIDADO",
        loginReq: "Login Necessário",
        reqPushes: "Precisa:",
        reqBadge: "Badge:",
        timeStop: "TEMPO PARADO!",
        youKilled: "VOCÊ DERRUBOU",
        onlyVip: "Apenas VIP/Admin!",
        reportSent: "Report enviado com sucesso!"
    }
};

const ABILITIES: Record<string, any> = {
  IMPACT: { type: 'ACTIVE', name: { en: 'Impact', pt: 'Impacto' }, desc: { en: 'Light area push.', pt: 'Empurrão leve em área.' }, color: '#3b82f6', icon: <Target />, cooldown: 180, range: 140, force: 45.0, stun: 45, reqPoints: 0, category: 'PUSH' },
  LEGO: { type: 'ACTIVE', name: { en: 'Lego', pt: 'Lego' }, desc: { en: 'Place a trap for 20s.', pt: 'Cria uma armadilha por 20s.' }, color: '#ef4444', icon: <Box />, cooldown: 120, range: 0, reqPoints: 50, category: 'PUSH' },
  DASH: { type: 'ACTIVE', name: { en: 'Dash', pt: 'Dash' }, desc: { en: 'Explosive acceleration.', pt: 'Aceleração explosiva.' }, color: '#f59e0b', icon: <Wind />, cooldown: 120, range: 0, force: 50.0, stun: 30, reqPoints: 100, category: 'PUSH' },
  SPIKES: { type: 'PASSIVE', name: { en: 'Spikes', pt: 'Espinhos' }, desc: { en: 'Damage on contact.', pt: 'Dano ao contato.' }, color: '#64748b', icon: <Triangle />, cooldown: 0, passiveCooldown: 60, range: 40, force: 35.0, stun: 10, reqPoints: 200, category: 'PUSH' },
  FLASH: { type: 'ACTIVE', name: { en: 'Flash', pt: 'Flash' }, desc: { en: 'Instant teleport.', pt: 'Teleporte instantâneo.' }, color: '#ec4899', icon: <Zap />, cooldown: 200, range: 250, force: 0, stun: 0, reqPoints: 300, category: 'PUSH' },
  HOOK: { type: 'ACTIVE', name: { en: 'Hook', pt: 'Gancho' }, desc: { en: 'Pull enemy.', pt: 'Puxa inimigo.' }, color: '#d97706', icon: <Link />, cooldown: 300, range: 350, force: -30.0, stun: 30, reqPoints: 500, category: 'PUSH' },
  GHOST: { type: 'ACTIVE', name: { en: 'Ghost', pt: 'Fantasma' }, desc: { en: 'Invisible and intangible.', pt: 'Invisível e intangível.' }, color: '#cbd5e1', icon: <Ghost />, cooldown: 450, range: 0, force: 0, stun: 0, reqPoints: 750, category: 'PUSH' },
  SWAP: { type: 'ACTIVE', name: { en: 'Swap', pt: 'Troca' }, desc: { en: 'Swap places with enemy.', pt: 'Troca de lugar com inimigo.' }, color: '#8b5cf6', icon: <RefreshCw />, cooldown: 600, range: 500, force: 0, stun: 20, reqPoints: 1000, category: 'PUSH' },
  REPULSOR: { type: 'ACTIVE', name: { en: 'Repulsor', pt: 'Repulsor' }, desc: { en: 'Reflect attacks for 2s.', pt: 'Reflete ataques por 2s.' }, color: '#10b981', icon: <ShieldAlert />, cooldown: 400, range: 0, force: 0, stun: 0, reqPoints: 1500, category: 'PUSH' },
  MASS: { type: 'PASSIVE', name: { en: 'Colossus', pt: 'Colosso' }, desc: { en: 'Immune to light pushes.', pt: 'Imune a empurrões leves.' }, color: '#1e293b', icon: <Anchor />, cooldown: 0, reqPoints: 2000, category: 'PUSH' },
  BOSS: { type: 'ACTIVE', name: { en: 'Boss', pt: 'Chefe' }, desc: { en: 'Launch 6 fireballs.', pt: 'Lança 6 bolas de fogo.' }, color: '#b91c1c', icon: <Flame />, cooldown: 480, range: 0, reqPoints: 10000, category: 'PUSH' },
  ERROR: { type: 'PASSIVE', name: { en: 'Error', pt: 'Error' }, desc: { en: 'One Hit Kill on push.', pt: 'HIT KILL no empurrão.' }, color: '#000000', icon: <Bug />, cooldown: 0, reqPoints: 15000, category: 'PUSH' },
  GOD: { type: 'ACTIVE', name: { en: 'God', pt: 'God' }, desc: { en: 'Hit Kill + Time Stop (5s).', pt: 'Hit Kill + Para o Tempo (5s).' }, color: '#fbbf24', icon: <Clock />, cooldown: 1800, range: 0, reqPoints: 20000, category: 'PUSH' },
  OVERKILL: { type: 'PASSIVE', name: { en: 'OVERKILL', pt: 'OVERKILL' }, desc: { en: 'HK. Short range. Auto-atk.', pt: 'HK. Alcance curto. Auto-atk.' }, color: '#000000', icon: <Skull />, cooldown: 0, range: 35, force: 250.0, stun: 120, reqPoints: 999999, category: 'PUSH' },
  SPEEDRUNNER: { type: 'PASSIVE', name: { en: 'Speedrunner', pt: 'Speedrunner' }, desc: { en: 'Very fast, weak push.', pt: 'Muito rápido, empurrão fraco.' }, color: '#0ea5e9', icon: <Zap />, cooldown: 0, reqPoints: 0, category: 'BADGE', moveSpeed: 0.8, pushForceMult: 0.5 },
  ADMIN_GOD: { type: 'PASSIVE', name: { en: '[ADM] GOD', pt: '[ADM] GOD' }, desc: { en: 'Invincible + Speed.', pt: 'Invencível + Speed.' }, color: '#fbbf24', icon: <Crown />, cooldown: 0, reqPoints: 999999, category: 'PUSH' },
  ADMIN_NUKE: { type: 'ACTIVE', name: { en: '[ADM] NUKE', pt: '[ADM] NUKE' }, desc: { en: 'Explode the map.', pt: 'Explode o mapa.' }, color: '#b91c1c', icon: <Bomb />, cooldown: 120, range: 2000, force: 300.0, stun: 300, reqPoints: 999999, category: 'PUSH' },
};

const BOT_NAMES = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta", "Bot Omega"];

type GameState = 'MENU_HOME' | 'MENU_ABILITY' | 'PLAYING' | 'GAMEOVER';
type Theme = 'DEFAULT' | 'CLASSIC';

interface PushBattlesProps {
    lang?: Language;
    onUnlockAchievement?: (id: string) => void;
}

const PushBattles: React.FC<PushBattlesProps> = ({ lang = 'en', onUnlockAchievement }) => {
  const t = PB_TEXTS[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [gameState, setGameState] = useState<GameState>('MENU_HOME');
  const [gameMode, setGameMode] = useState<'BOTS' | 'ONLINE' | 'TEST'>('BOTS');
  const [selectedAbility, setSelectedAbility] = useState<string>('IMPACT');
  const [abilityTab, setAbilityTab] = useState<'PUSH' | 'BADGE'>('PUSH');
  const [currentTheme, setCurrentTheme] = useState<Theme>('DEFAULT');
  const [highScore, setHighScore] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [careerPushes, setCareerPushes] = useState(0); 
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false); 
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'BUG' | 'PLAYER'>('BUG');
  const [reportDesc, setReportDesc] = useState('');
  const [proAim, setProAim] = useState(false);

  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const myNameRef = useRef<string>("Player");

  const gameRef = useRef({
    entities: [] as Entity[],
    traps: [] as Trap[],
    projectiles: [] as Projectile[],
    particles: [] as any[],
    camera: { x: 0, y: 0 },
    keys: { up: false, down: false, left: false, right: false, attack: false, skill: false },
    mouse: { x: 0, y: 0 },
    settings: { proAim: false },
    animationId: 0,
    width: 0,
    height: 0,
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0, touchId: null as number | null },
    currentScore: 0,
    survivalTime: 0,
    timeStopTimer: 0,
    timeStopOwnerId: null as string | null,
    lastBroadcast: 0
  });

  useEffect(() => {
    const loadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            myIdRef.current = session.user.id; 
            const isUserAdmin = session.user.email === ADMIN_EMAIL;
            setIsAdmin(isUserAdmin);
            myNameRef.current = session.user.user_metadata.full_name || session.user.email.split('@')[0];
            const { data } = await supabase.from('profiles').select('total_pushes, is_vip, achievements').eq('id', session.user.id).single();
            if (data) {
                setCareerPushes(data.total_pushes || 0);
                setIsVip(isUserAdmin || data.is_vip || false); 
                setUnlockedAchievements(data.achievements || []);
            }
        } else {
            setUser(null); setIsAdmin(false); setIsVip(false); setCareerPushes(0);
            myIdRef.current = `guest-${Math.random().toString(36).substr(2,9)}`;
            myNameRef.current = t.guest;
        }
        setLoadingProfile(false);
    };
    loadUser();
    const savedHigh = localStorage.getItem('pushBattlesHigh'); if (savedHigh) setHighScore(parseInt(savedHigh));
    const savedProAim = localStorage.getItem('pushBattlesProAim'); if (savedProAim === 'true') setProAim(true);
    const savedTheme = localStorage.getItem('pushBattlesTheme'); if (savedTheme) setCurrentTheme(savedTheme as Theme);
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [lang]);

  const saveProgress = async (sessionPushes: number) => {
      const newTotal = careerPushes + sessionPushes;
      setCareerPushes(newTotal);
      if (!user) return;
      await supabase.from('profiles').upsert({ id: user.id, total_pushes: newTotal, updated_at: new Date() });
  };

  const showNotification = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };
  useEffect(() => { gameRef.current.settings.proAim = proAim; }, [proAim]);

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for(let i=0; i<count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4;
        gameRef.current.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: 1.0 });
    }
  };

  const spawnTrap = (x: number, y: number, type: 'LEGO' | 'MINE' | 'BLACKHOLE', ownerId: string, color: string) => {
      gameRef.current.traps.push({ id: Math.random().toString(36), x, y, radius: type === 'LEGO' ? 15 : 20, type, ownerId, color, active: true, life: 1200 });
  };

  const createBot = (index: number): Entity => {
     const angle = (Math.PI * 2 / 4) * index;
     const botAbilities = ['IMPACT', 'DASH', 'LEGO', 'HOOK', 'SWAP'];
     const randomAbility = botAbilities[Math.floor(Math.random() * botAbilities.length)];
     const config = ABILITIES[randomAbility];
     return {
         id: `bot-${Math.random()}`, name: BOT_NAMES[index] || `Bot ${index}`, x: Math.cos(angle) * 300, y: Math.sin(angle) * 300,
         vx: 0, vy: 0, radius: PLAYER_RADIUS, color: config.color, isPlayer: false, isAdmin: false, isVip: false,
         ability: randomAbility, moveSpeed: 0.55, mass: 1.0, invisible: false, invulnerable: false, isAttacking: false, attackTimer: 0, hitList: [], lastAttackerId: null,
         attackCooldown: 0, skillCooldown: 0, maxSkillCooldown: config.cooldown, maxAttackCooldown: 40, passiveTimer: 0, maxPassiveTimer: 0, dead: false, facing: angle + Math.PI, stunTimer: 0, skillAnim: 0
     };
  };

  const prepareBackground = async (mode: 'BOTS' | 'ONLINE' | 'TEST') => {
      gameRef.current.entities = []; gameRef.current.traps = []; gameRef.current.projectiles = []; gameRef.current.particles = [];
      if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; setIsConnected(false); setOnlineCount(0); }
      if (mode === 'BOTS') { for (let i = 0; i < 4; i++) gameRef.current.entities.push(createBot(i)); }
      else if (mode === 'ONLINE') await connectToRoom();
      else if (mode === 'TEST') gameRef.current.entities.push(createBot(0));
  };

  const spawnPlayer = () => {
      const abilityConfig = ABILITIES[selectedAbility] || ABILITIES.IMPACT;
      const playerEnt: Entity = {
          id: myIdRef.current, name: myNameRef.current, x: 0, y: 0, vx: 0, vy: 0, radius: PLAYER_RADIUS, color: abilityConfig.color, isPlayer: true, isAdmin, isVip, ability: selectedAbility,
          moveSpeed: selectedAbility === 'SPEEDRUNNER' ? 0.95 : 0.65, mass: selectedAbility === 'MASS' ? 2.5 : 1.0, invisible: false, invulnerable: selectedAbility === 'ADMIN_GOD',
          isAttacking: false, attackTimer: 0, hitList: [], lastAttackerId: null, attackCooldown: 0, skillCooldown: 0, maxSkillCooldown: abilityConfig.cooldown || 0, maxAttackCooldown: 40,
          passiveTimer: 0, maxPassiveTimer: 0, dead: false, facing: 0, stunTimer: 0, skillAnim: 0
      };
      gameRef.current.entities = gameRef.current.entities.filter(e => !e.isPlayer);
      gameRef.current.entities.push(playerEnt);
      gameRef.current.currentScore = 0; gameRef.current.survivalTime = 0; gameRef.current.timeStopTimer = 0;
      setGameState('PLAYING');
  };

  const connectToRoom = async () => {
      if (!user) return;
      const channel = supabase.channel('push_battles_global');
      channel
        .on('broadcast', { event: 'player_update' }, ({ payload }) => handleRemoteUpdate(payload))
        .on('broadcast', { event: 'player_attack' }, ({ payload }) => handleRemoteAttack(payload))
        .on('broadcast', { event: 'player_hit' }, ({ payload }) => handleRemoteHit(payload))
        .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(channel.presenceState()).length))
        .subscribe((status) => { if (status === 'SUBSCRIBED') { setIsConnected(true); channel.track({ online_at: new Date().toISOString() }); } });
      channelRef.current = channel;
  };

  const handleRemoteUpdate = (data: any) => {
      const ref = gameRef.current;
      const existing = ref.entities.find(e => e.id === data.id);
      if (existing) {
          if (Math.sqrt((data.x - existing.x)**2 + (data.y - existing.y)**2) > 150) { existing.x = data.x; existing.y = data.y; }
          else { existing.x += (data.x - existing.x) * 0.25; existing.y += (data.y - existing.y) * 0.25; }
          existing.vx = data.vx; existing.vy = data.vy; existing.facing = data.facing; existing.ability = data.ability; existing.dead = data.dead;
      } else if (!data.dead) {
          ref.entities.push({ ...createBot(0), id: data.id, name: data.name, x: data.x, y: data.y, isRemote: true, ability: data.ability });
      }
  };
  const handleRemoteAttack = (data: any) => {
      const ent = gameRef.current.entities.find(e => e.id === data.id);
      if (ent) { if (data.type === 'BASIC') { ent.isAttacking = true; ent.attackTimer = ATTACK_DURATION; } else ent.skillAnim = 15; }
  };
  const handleRemoteHit = (payload: any) => {
      const me = gameRef.current.entities.find(e => e.isPlayer);
      if (me && me.id === payload.targetId && !me.dead && !me.invulnerable) {
          me.vx += Math.cos(payload.angle) * (payload.force / me.mass); me.vy += Math.sin(payload.angle) * (payload.force / me.mass);
          me.stunTimer = payload.stun; me.lastAttackerId = payload.attackerId; spawnParticles(me.x, me.y, me.color, 10);
      }
  };

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
            canvas.width = entry.contentRect.width; canvas.height = entry.contentRect.height;
            gameRef.current.width = canvas.width; gameRef.current.height = canvas.height;
        }
    });
    if (containerRef.current) observer.observe(containerRef.current);

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

    const handlePointerDown = (e: PointerEvent) => {
        if (gameState !== 'PLAYING') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        if (x < gameRef.current.width / 2 && !gameRef.current.joystick.active) {
            gameRef.current.joystick = { active: true, x, y, dx: 0, dy: 0, touchId: e.pointerId };
        }
    };
    const handlePointerMove = (e: PointerEvent) => {
        if (gameState !== 'PLAYING') return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        gameRef.current.mouse = { x, y };
        const joy = gameRef.current.joystick;
        if (joy.active && joy.touchId === e.pointerId) {
            const dx = x - joy.x; const dy = y - joy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const max = 50;
            if (dist > max) { joy.dx = (dx / dist) * max; joy.dy = (dy / dist) * max; }
            else { joy.dx = dx; joy.dy = dy; }
        }
    };
    const handlePointerUp = (e: PointerEvent) => {
        if (gameRef.current.joystick.touchId === e.pointerId) {
            gameRef.current.joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0, touchId: null };
        }
    };

    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('pointerdown', handlePointerDown); canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp); canvas.addEventListener('pointercancel', handlePointerUp);

    const update = () => {
        const ref = gameRef.current; if (ref.width === 0) return;
        if (ref.timeStopTimer > 0) ref.timeStopTimer--;
        const player = ref.entities.find(e => e.isPlayer);
        if (gameState === 'PLAYING' && gameMode === 'ONLINE' && player && channelRef.current) {
            const now = Date.now();
            if (now - ref.lastBroadcast > 30) {
                channelRef.current.send({ type: 'broadcast', event: 'player_update', payload: { id: player.id, name: player.name, x: player.x, y: player.y, vx: player.vx, vy: player.vy, facing: player.facing, ability: player.ability, dead: player.dead } });
                ref.lastBroadcast = now;
            }
        }
        ref.entities.forEach(e => {
            if (e.dead) return;
            if (ref.timeStopTimer > 0 && e.id !== ref.timeStopOwnerId) return;
            if (e.attackCooldown > 0) e.attackCooldown--; if (e.skillCooldown > 0) e.skillCooldown--;
            if (e.stunTimer > 0) e.stunTimer--; if (e.attackTimer > 0) e.attackTimer--; else e.isAttacking = false;
            if (e.isRemote) { e.x += e.vx; e.y += e.vy; e.vx *= FRICTION; e.vy *= FRICTION; }
            else {
                if (e.isAttacking) {
                    ref.entities.forEach(target => {
                        if (target.id === e.id || target.dead || e.hitList.includes(target.id) || target.invulnerable) return;
                        if (Math.sqrt((target.x - e.x)**2 + (target.y - e.y)**2) < ATTACK_RADIUS + target.radius) {
                            e.hitList.push(target.id); const force = PUSH_FORCE / target.mass; const a = Math.atan2(target.y-e.y, target.x-e.x);
                            target.vx += Math.cos(a)*force; target.vy += Math.sin(a)*force; target.stunTimer = 45; target.lastAttackerId = e.id;
                            if (e.isPlayer) ref.currentScore++;
                        }
                    });
                }
                if (e.stunTimer <= 0) {
                    if (e.isPlayer && ref.settings.proAim) e.facing = Math.atan2(ref.mouse.y-ref.height/2+ref.camera.y-e.y, ref.mouse.x-ref.width/2+ref.camera.x-e.x);
                    else if (Math.abs(e.vx) > 0.05 || Math.abs(e.vy) > 0.05) e.facing = Math.atan2(e.vy, e.vx);
                    if (e.isPlayer && gameState === 'PLAYING') {
                        let ix = 0; let iy = 0;
                        if (ref.keys.up) iy--; if (ref.keys.down) iy++; if (ref.keys.left) ix--; if (ref.keys.right) ix++;
                        if (ref.joystick.active) { ix = ref.joystick.dx / 50; iy = ref.joystick.dy / 50; }
                        e.vx += ix * e.moveSpeed; e.vy += iy * e.moveSpeed;
                    } else if (!e.isPlayer && (gameState === 'PLAYING' || gameMode === 'BOTS')) {
                        const target = ref.entities.find(other => other.id !== e.id && !other.dead);
                        if (target) {
                            const a = Math.atan2(target.y-e.y, target.x-e.x); e.facing = a; e.vx += Math.cos(a)*e.moveSpeed; e.vy += Math.sin(a)*e.moveSpeed;
                            if (Math.sqrt((target.x-e.x)**2 + (target.y-e.y)**2) < 80 && e.attackCooldown <= 0) {
                                e.isAttacking = true; e.attackTimer = ATTACK_DURATION; e.hitList = []; e.attackCooldown = 40;
                            }
                        }
                    }
                }
                e.x += e.vx; e.y += e.vy; e.vx *= FRICTION; e.vy *= FRICTION;
            }
            if (Math.sqrt(e.x*e.x + e.y*e.y) > ARENA_RADIUS + e.radius) {
                e.dead = true; if (e.isPlayer) { saveProgress(ref.currentScore); setTimeout(() => setGameState('GAMEOVER'), 1000); }
            }
        });
        if (player && !player.dead) { ref.camera.x += (player.x - ref.camera.x) * 0.1; ref.camera.y += (player.y - ref.camera.y) * 0.1; }
        ref.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; }); ref.particles = ref.particles.filter(p => p.life > 0);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const ref = gameRef.current; const { width, height, camera } = ref;
        ctx.fillStyle = currentTheme === 'CLASSIC' ? '#60a5fa' : '#f8fafc'; ctx.fillRect(0, 0, width, height);
        ctx.save(); ctx.translate(width / 2 - camera.x, height / 2 - camera.y);
        ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2); ctx.fillStyle = currentTheme === 'CLASSIC' ? '#4ade80' : '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5; ctx.stroke();
        ref.entities.forEach(e => {
            if (e.dead) return; ctx.save(); ctx.translate(e.x, e.y);
            if (e.isAttacking) { ctx.beginPath(); ctx.arc(0, 0, ATTACK_RADIUS, 0, Math.PI*2); ctx.fillStyle = 'rgba(239,68,68,0.2)'; ctx.fill(); }
            ctx.fillStyle = e.stunTimer > 0 ? '#94a3b8' : e.color; ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#64748b'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText(e.name.toUpperCase(), 0, -e.radius - 10);
            const ex = Math.cos(e.facing)*8; const ey = Math.sin(e.facing)*8; ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });
        ref.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
        ctx.restore();
        if (ref.joystick.active) {
            ctx.beginPath(); ctx.arc(ref.joystick.x, ref.joystick.y, 40, 0, Math.PI*2); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.stroke();
            ctx.beginPath(); ctx.arc(ref.joystick.x+ref.joystick.dx, ref.joystick.y+ref.joystick.dy, 20, 0, Math.PI*2); ctx.fillStyle = 'rgba(239,68,68,0.3)'; ctx.fill();
        }
    };

    const loop = () => { update(); draw(ctx); gameRef.current.animationId = requestAnimationFrame(loop); };
    loop();
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); observer.disconnect(); cancelAnimationFrame(gameRef.current.animationId); };
  }, [gameState, gameMode]);

  const handleMobileAttack = () => {
      const player = gameRef.current.entities.find(e => e.isPlayer);
      if (player && player.attackCooldown <= 0 && !player.dead) {
          player.isAttacking = true; player.attackTimer = ATTACK_DURATION; player.hitList = []; player.attackCooldown = 40;
          if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'BASIC' } });
      }
  };

  const handleMobileSkill = () => {
      const player = gameRef.current.entities.find(e => e.isPlayer);
      if (player && player.skillCooldown <= 0 && !player.dead) {
          player.skillCooldown = player.maxSkillCooldown; player.skillAnim = 15;
          if (player.ability === 'DASH') { player.vx += Math.cos(player.facing)*12; player.vy += Math.sin(player.facing)*12; }
          else if (player.ability === 'FLASH') { player.x += Math.cos(player.facing)*250; player.y += Math.sin(player.facing)*250; spawnParticles(player.x, player.y, player.color, 20); }
          else if (player.ability === 'GOD') { gameRef.current.timeStopTimer = 300; gameRef.current.timeStopOwnerId = player.id; showNotification(t.timeStop); }
          if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'SKILL' } });
      }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative font-mono select-none overflow-hidden bg-slate-50">
      <canvas ref={canvasRef} className="block w-full h-full touch-none" />
      
      {gameState === 'MENU_HOME' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] z-20 p-4">
              <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95">
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-6">PUSH BATTLES</h2>
                  <div className="grid grid-cols-1 gap-3">
                      <button onClick={() => { setGameMode('BOTS'); prepareBackground('BOTS'); setGameState('MENU_ABILITY'); }} className="p-3 md:p-4 bg-slate-50 border-2 border-slate-100 hover:border-slate-300 rounded-xl flex items-center gap-4 transition-all text-sm md:text-base">
                          <Users size={20} md:size={24} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{t.trainBots}</span>
                      </button>
                      <button onClick={() => { if (!user) return; setGameMode('ONLINE'); prepareBackground('ONLINE'); setGameState('MENU_ABILITY'); }} className={`p-3 md:p-4 bg-slate-50 border-2 rounded-xl flex items-center gap-4 transition-all text-sm md:text-base ${!user ? 'opacity-50' : 'hover:border-green-300'}`}>
                          <Globe size={20} md:size={24} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{t.online}</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {gameState === 'MENU_ABILITY' && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-4">
              <div className="bg-white/95 backdrop-blur-xl p-4 md:p-5 rounded-3xl shadow-2xl border border-slate-100 animate-in slide-in-from-bottom-10">
                  <h3 className="text-center font-black mb-3 md:mb-4 text-sm md:text-base">{t.selectAbility}</h3>
                  <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                      {Object.entries(ABILITIES).map(([key, data]) => {
                          if (key.startsWith('ADMIN_') && !isAdmin) return null;
                          if ((data.category || 'PUSH') !== abilityTab) return null;
                          const isSelected = selectedAbility === key;
                          return (
                              <button key={key} onClick={() => setSelectedAbility(key)} className={`flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white'}`}>
                                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white text-[10px] md:text-xs" style={{ backgroundColor: data.color }}>{data.icon}</div>
                                  <div className="text-[7px] md:text-[8px] font-bold text-slate-700 truncate w-full px-1">{data.name[lang]}</div>
                              </button>
                          );
                      })}
                  </div>
                  <button onClick={spawnPlayer} className="w-full py-3 md:py-4 bg-red-500 text-white font-bold rounded-xl shadow-lg text-sm md:text-base">{t.play}</button>
              </div>
          </div>
      )}

      {gameState === 'PLAYING' && (
          <>
            <div className="absolute top-3 md:top-4 left-3 md:left-4 text-[10px] md:text-sm font-bold opacity-50 pointer-events-none">{t.points}: {gameRef.current.currentScore}</div>
            <button onPointerDown={(e) => { e.stopPropagation(); handleMobileAttack(); }} className="absolute bottom-6 right-6 md:bottom-8 md:right-8 w-16 h-16 md:w-20 md:h-20 bg-red-500/80 rounded-full flex items-center justify-center text-white font-black shadow-xl active:scale-90 transition-transform select-none z-30 text-sm md:text-base">ATK</button>
            <button onPointerDown={(e) => { e.stopPropagation(); handleMobileSkill(); }} className="absolute bottom-24 right-6 md:bottom-32 md:right-8 w-12 h-12 md:w-16 md:h-16 bg-blue-500/80 rounded-full flex items-center justify-center text-white font-black shadow-lg active:scale-90 transition-transform select-none z-30 text-[10px] md:text-xs">SKILL</button>
          </>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20 p-4">
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl text-center w-full max-w-sm">
                  <h2 className="text-xl md:text-2xl font-black mb-4">{t.gameOver}</h2>
                  <button onClick={() => setGameState('MENU_HOME')} className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl w-full text-sm md:text-base">{t.backLobby}</button>
              </div>
          </div>
      )}
      
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold shadow-xl animate-in slide-in-from-top-5 z-[100] whitespace-nowrap">{notification}</div>
      )}
    </div>
  );
};

export default PushBattles;