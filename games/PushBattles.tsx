import React, { useEffect, useRef, useState } from 'react';
import { Settings, X, Zap, Target, Globe, Users, Lock, Wind, Loader2, ShieldAlert, Trophy, Box, Ghost, Anchor, RefreshCw, Link, MousePointer2, Gem, Skull, Bomb, Infinity, TestTube, Flag, MessageSquareWarning, Palette, Check, Triangle, Crown } from 'lucide-react';
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
}

const ARENA_RADIUS = 1000; 
const PLAYER_RADIUS = 20;
const FRICTION = 0.92;
const ATTACK_DURATION = 12; // Reduced to ~0.2s at 60fps
const ATTACK_RADIUS = 45;
const PUSH_FORCE = 22.0;

// --- TRANSLATIONS ---
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
        play: "PLAY"
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
        play: "JOGAR"
    }
};

// --- ABILITIES CONFIGURATION ---
const ABILITIES: Record<string, any> = {
  // STARTER
  IMPACT: { type: 'ACTIVE', name: 'Impacto', desc: 'Empurrão leve em área.', color: '#3b82f6', icon: <Target />, cooldown: 180, range: 140, force: 18.0, stun: 45, reqPoints: 0, category: 'PUSH' },
  // TIER 1
  LEGO: { type: 'PASSIVE', name: 'Lego', desc: 'Solta blocos no chão.', color: '#ef4444', icon: <Box />, cooldown: 0, passiveCooldown: 240, range: 0, reqPoints: 50, category: 'PUSH' },
  DASH: { type: 'ACTIVE', name: 'Dash', desc: 'Aceleração explosiva.', color: '#f59e0b', icon: <Wind />, cooldown: 120, range: 0, force: 20.0, stun: 30, reqPoints: 100, category: 'PUSH' },
  // TIER 2
  SPIKES: { type: 'PASSIVE', name: 'Espinhos', desc: 'Dano ao contato.', color: '#64748b', icon: <Triangle />, cooldown: 0, passiveCooldown: 60, range: 40, force: 15.0, stun: 10, reqPoints: 200, category: 'PUSH' },
  FLASH: { type: 'ACTIVE', name: 'Flash', desc: 'Teleporte instantâneo.', color: '#ec4899', icon: <Zap />, cooldown: 200, range: 250, force: 0, stun: 0, reqPoints: 300, category: 'PUSH' },
  // TIER 3
  HOOK: { type: 'ACTIVE', name: 'Gancho', desc: 'Puxa inimigo (Nerfado).', color: '#d97706', icon: <Link />, cooldown: 300, range: 350, force: -12.0, stun: 30, reqPoints: 500, category: 'PUSH' },
  GHOST: { type: 'ACTIVE', name: 'Fantasma', desc: 'Invisível e intangível.', color: '#cbd5e1', icon: <Ghost />, cooldown: 450, range: 0, force: 0, stun: 0, reqPoints: 750, category: 'PUSH' },
  // TIER 4
  SWAP: { type: 'ACTIVE', name: 'Troca', desc: 'Troca de lugar com inimigo.', color: '#8b5cf6', icon: <RefreshCw />, cooldown: 600, range: 500, force: 0, stun: 20, reqPoints: 1000, category: 'PUSH' },
  REPULSOR: { type: 'ACTIVE', name: 'Repulsor', desc: 'Reflete ataques por 2s.', color: '#10b981', icon: <ShieldAlert />, cooldown: 400, range: 0, force: 0, stun: 0, reqPoints: 1500, category: 'PUSH' },
  MASS: { type: 'PASSIVE', name: 'Colosso', desc: 'Imune a empurrões leves.', color: '#1e293b', icon: <Anchor />, cooldown: 0, reqPoints: 2000, category: 'PUSH' },
  // VIP
  OVERKILL: { type: 'PASSIVE', name: 'OVERKILL', desc: 'HK. Alcance curto. Auto-atk.', color: '#000000', icon: <Skull />, cooldown: 0, range: 35, force: 150.0, stun: 120, reqPoints: 999999, category: 'PUSH' },
  // BADGE
  SPEEDRUNNER: { type: 'PASSIVE', name: 'Speedrunner', desc: 'Muito rápido, empurrão fraco.', color: '#0ea5e9', icon: <Zap />, cooldown: 0, reqPoints: 999999, category: 'BADGE', moveSpeed: 0.5, pushForceMult: 0.5 },
  // ADMIN
  ADMIN_GOD: { type: 'PASSIVE', name: '[ADM] GOD', desc: 'Invencível + Speed.', color: '#fbbf24', icon: <Crown />, cooldown: 0, reqPoints: 999999, category: 'PUSH' },
  ADMIN_NUKE: { type: 'ACTIVE', name: '[ADM] NUKE', desc: 'Explode o mapa.', color: '#b91c1c', icon: <Bomb />, cooldown: 120, range: 2000, force: 200.0, stun: 300, reqPoints: 999999, category: 'PUSH' },
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
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<'BUG' | 'PLAYER'>('BUG');
  const [reportDesc, setReportDesc] = useState('');
  const [proAim, setProAim] = useState(false);

  const channelRef = useRef<any>(null);
  const myIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const myNameRef = useRef<string>("Player");

  // Load Data
  useEffect(() => {
    const loadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            setUser(session.user);
            myIdRef.current = session.user.id; 
            const email = session.user.email || "";
            const isUserAdmin = email === ADMIN_EMAIL;
            setIsAdmin(isUserAdmin);
            myNameRef.current = session.user.user_metadata.full_name || email.split('@')[0];

            const { data, error } = await supabase.from('profiles').select('total_pushes, is_vip, achievements').eq('id', session.user.id).single();
            if (data) {
                setCareerPushes(data.total_pushes || 0);
                setIsVip(isUserAdmin || data.is_vip || false); 
                setUnlockedAchievements(data.achievements || []);
            }
            else if (error && error.code === 'PGRST116') {
                await supabase.from('profiles').insert({ id: session.user.id, full_name: myNameRef.current, total_pushes: 0, is_vip: isUserAdmin });
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
    const savedTheme = localStorage.getItem('pushBattlesTheme');
    if (savedTheme) setCurrentTheme(savedTheme as Theme);

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
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

  const handleProAimToggle = () => {
      const newVal = !proAim;
      setProAim(newVal);
      localStorage.setItem('pushBattlesProAim', String(newVal));
  };

  const handleThemeChange = (t: Theme) => {
      if (t === 'CLASSIC' && !isVip && !isAdmin) return;
      setCurrentTheme(t);
      localStorage.setItem('pushBattlesTheme', t);
  };

  const submitReport = () => {
      showNotification("Report enviado com sucesso!");
      setShowReport(false);
      setReportDesc("");
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
    width: 800, // Default safe size
    height: 600,
    joystick: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    currentScore: 0,
    lastBroadcast: 0,
    survivalTime: 0
  });

  useEffect(() => { gameRef.current.settings.proAim = proAim; }, [proAim]);

  // --- ENGINE HELPERS ---
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

  const spawnTrap = (x: number, y: number, type: 'LEGO' | 'MINE' | 'BLACKHOLE', ownerId: string, color: string) => {
      gameRef.current.traps.push({
          id: Math.random().toString(36),
          x, y, 
          radius: type === 'LEGO' ? 15 : (type === 'BLACKHOLE' ? 40 : 20),
          type, ownerId, color, active: true
      });
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

  // --- INITIALIZATION ---
  const prepareBackground = async (mode: 'BOTS' | 'ONLINE' | 'TEST') => {
      gameRef.current.entities = [];
      gameRef.current.traps = [];
      gameRef.current.particles = [];
      
      // Stop any existing subscriptions when changing modes
      if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsConnected(false);
          setOnlineCount(0);
      }

      if (mode === 'BOTS') { 
          for (let i = 0; i < 4; i++) {
              gameRef.current.entities.push(createBot(i));
          }
      } else if (mode === 'ONLINE') {
          await connectToRoom();
      } else if (mode === 'TEST') {
          gameRef.current.entities.push({
            id: 'dummy', name: 'Dummy', x: 200, y: 0,
            vx: 0, vy: 0, radius: PLAYER_RADIUS, color: '#94a3b8', isPlayer: false, isAdmin: false, isVip: false,
            ability: 'IMPACT', moveSpeed: 0, mass: 10, invisible: false, invulnerable: false,
            isAttacking: false, attackTimer: 0, hitList: [], lastAttackerId: null,
            attackCooldown: 99999, skillCooldown: 99999, maxSkillCooldown: 0, maxAttackCooldown: 0,
            passiveTimer: 0, maxPassiveTimer: 0, dead: false, facing: Math.PI, stunTimer: 0, skillAnim: 0
        });
      }
  };

  const spawnPlayer = () => {
      const abilityConfig = ABILITIES[selectedAbility] || ABILITIES.IMPACT;
      let moveSpeed = 0.30;
      if (selectedAbility === 'ADMIN_GOD') moveSpeed = 0.6;
      else if (abilityConfig.name === 'Colosso') moveSpeed = 0.22;
      else if (abilityConfig.moveSpeed) moveSpeed = abilityConfig.moveSpeed;

      const playerEnt: Entity = {
          id: myIdRef.current,
          name: myNameRef.current,
          x: 0, // Ensure starting at center to be visible
          y: 0,
          vx: 0, vy: 0,
          radius: PLAYER_RADIUS,
          color: abilityConfig.color,
          isPlayer: true,
          isAdmin: isAdmin,
          isVip: isVip, 
          ability: selectedAbility,
          moveSpeed: moveSpeed, 
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
          maxAttackCooldown: selectedAbility === 'OVERKILL' ? 99999 : 40,
          passiveTimer: abilityConfig.passiveCooldown || 0,
          maxPassiveTimer: abilityConfig.passiveCooldown || 0,
          dead: false,
          facing: 0,
          stunTimer: 0,
          skillAnim: 0
      };
      
      // Remove any existing player entity to prevent dupes (e.g. from previous games)
      gameRef.current.entities = gameRef.current.entities.filter(e => !e.isPlayer);
      gameRef.current.entities.push(playerEnt);
      gameRef.current.currentScore = 0;
      gameRef.current.survivalTime = 0;
      setGameState('PLAYING');
  };

  const connectToRoom = async () => {
      // Safety cleanup
      if (channelRef.current) await supabase.removeChannel(channelRef.current);

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
           // Keep local player and existing remotes if they are still present
           gameRef.current.entities = gameRef.current.entities.filter(e => {
               if (e.isPlayer) return true;
               if (!e.isRemote) return true; // Keep bots if any
               return presenceIds.includes(e.id);
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

  // --- GAME LOOP & LOGIC ---
  const handleRemoteUpdate = (data: any) => { /* Same as before, omitted for brevity */ 
      const ref = gameRef.current;
      const existing = ref.entities.find(e => e.id === data.id);
      if (existing) {
          const dist = Math.sqrt((data.x - existing.x)**2 + (data.y - existing.y)**2);
          if (dist > 150) { existing.x = data.x; existing.y = data.y; } 
          else { existing.x += (data.x - existing.x) * 0.25; existing.y += (data.y - existing.y) * 0.25; }
          existing.vx = data.vx || 0; existing.vy = data.vy || 0;
          existing.facing = data.facing; existing.ability = data.ability;
          existing.invisible = data.invisible || false; existing.invulnerable = data.invulnerable || false;
          existing.hookTarget = data.hookTarget; existing.isVip = data.isVip;
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
  const handleRemoteTeleport = (payload: any) => { /*...*/ };
  const handleRemoteAttack = (data: any) => { /*...*/ 
      const ent = gameRef.current.entities.find(e => e.id === data.id);
      if (ent) {
          if (data.type === 'BASIC') { ent.isAttacking = true; ent.attackTimer = ATTACK_DURATION; } 
          else if (data.type === 'SKILL') {
              ent.skillAnim = 15;
              const config = ABILITIES[ent.ability] || ABILITIES.IMPACT;
              if (ent.ability === 'FLASH' || ent.ability === 'ADMIN_FLASH') spawnParticles(ent.x, ent.y, config.color, 15);
              else {
                  const range = config.range || 100;
                  for(let i=0; i<8; i++) {
                       const angle = (Math.PI * 2 / 8) * i;
                       gameRef.current.particles.push({
                           x: ent.x + Math.cos(angle) * 10, y: ent.y + Math.sin(angle) * 10,
                           vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, life: 0.5, color: config.color
                       });
                   }
              }
          }
      }
  };
  const handleRemoteHit = (payload: any) => { /*...*/ 
      const me = gameRef.current.entities.find(e => e.isPlayer);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- RESIZE OBSERVER FIX ---
    // Instead of window.resize, we observe the container size to prevent cutoff
    const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
            if (entry.target === containerRef.current) {
                const { width, height } = entry.contentRect;
                if (width && height) {
                    canvas.width = width;
                    canvas.height = height;
                    gameRef.current.width = width;
                    gameRef.current.height = height;
                }
            }
        }
    });
    
    if (containerRef.current) {
        observer.observe(containerRef.current);
    }

    // Controls logic same as before...
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    // CRITICAL FIX: DO NOT call prepareBackground here unconditionaly.
    // It wipes the state set by spawnPlayer or mode selection.

    // --- LOOP ---
    const loop = () => {
        update();
        draw(ctx);
        gameRef.current.animationId = requestAnimationFrame(loop);
    };

    // UPDATE LOGIC
    const update = () => {
        const ref = gameRef.current;
        // Fix for "cut off": if size is invalid, skip update logic to avoid NaN
        if (ref.width === 0 || ref.height === 0) return;

        const player = ref.entities.find(e => e.isPlayer);
        
        // Only broadcast if Playing
        if (gameState === 'PLAYING' && gameMode === 'ONLINE' && player && channelRef.current) {
            const now = Date.now();
            if (now - ref.lastBroadcast > 30) { 
                channelRef.current.send({
                    type: 'broadcast', event: 'player_update',
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

        // Achievement Check
        if (gameState === 'PLAYING' && player && !player.dead && gameMode === 'BOTS') {
            ref.survivalTime++;
            if (ref.survivalTime > 120 * 60) {
                 if (onUnlockAchievement) onUnlockAchievement('pb_speedrunner');
            }
        }

        // Bots Respawn (Run this logic in BACKGROUND too if BOTS mode)
        if (gameState === 'PLAYING' || (gameState === 'MENU_ABILITY' && gameMode === 'BOTS')) {
            ref.entities.forEach(e => {
                if (e.dead && !e.isPlayer && !e.isRemote && e.respawnTimer) {
                    e.respawnTimer--;
                    if (e.respawnTimer <= 0) {
                         const newBot = createBot(Math.floor(Math.random()*4));
                         const idx = ref.entities.indexOf(e);
                         if (idx !== -1) ref.entities[idx] = newBot;
                    }
                }
            });
        }

        // Entity Physics
        ref.entities.forEach(e => {
            if (e.dead) return;

            // Timer reductions
            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.skillCooldown > 0) e.skillCooldown--;
            if (e.skillAnim > 0) e.skillAnim--; else e.hookTarget = undefined;
            if (e.invisible && e.skillCooldown <= e.maxSkillCooldown - 120) e.invisible = false;
            if (e.invulnerable && e.skillCooldown <= e.maxSkillCooldown - 120 && e.ability !== 'ADMIN_GOD') e.invulnerable = false;
            
            // Passives
            if (!e.isRemote && e.maxPassiveTimer > 0) {
                e.passiveTimer--;
                if (e.passiveTimer <= 0) {
                    // Trigger Passive (Lego/Blocky)
                    const config = ABILITIES[e.ability];
                    if (e.ability === 'LEGO' || e.ability === 'ADMIN_BLOCKY') {
                        spawnTrap(e.x, e.y, 'LEGO', e.id, config.color);
                        if (gameMode === 'ONLINE' && channelRef.current && e.isPlayer) {
                             channelRef.current.send({ type: 'broadcast', event: 'ability_trigger', payload: { type: 'LEGO', x: e.x, y: e.y, id: e.id, color: config.color } });
                        }
                    }
                    e.passiveTimer = e.maxPassiveTimer;
                }
            }
            if (!e.isRemote && e.ability === 'SPIKES' && !e.invisible) {
                 // Area effect spikes
                 ref.entities.forEach(target => {
                    if (target.id === e.id) return;
                    const dx = target.x - e.x; const dy = target.y - e.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < 40 + target.radius) {
                        if (target.id === e.id || target.dead || target.invisible || target.invulnerable) return;
                        const res = target.mass || 1.0; const f = 15 / res;
                        const a = Math.atan2(dy, dx);
                        if (!target.isRemote) { target.vx += Math.cos(a)*f; target.vy += Math.sin(a)*f; target.stunTimer = 10; target.lastAttackerId = e.id; }
                        spawnParticles(target.x, target.y, target.color, 5);
                    }
                });
            }
            if (!e.isRemote && e.ability === 'OVERKILL') {
                 // Overkill passive aura
                 ref.entities.forEach(target => {
                      if (target.id === e.id || target.dead) return;
                      const dx = target.x - e.x; const dy = target.y - e.y;
                      const dist = Math.sqrt(dx*dx + dy*dy);
                      if (dist < ABILITIES.OVERKILL.range + target.radius) {
                          const angle = Math.atan2(dy, dx);
                          if (!target.isRemote && !target.invulnerable) {
                              target.vx += Math.cos(angle) * (ABILITIES.OVERKILL.force/target.mass);
                              target.vy += Math.sin(angle) * (ABILITIES.OVERKILL.force/target.mass);
                              target.stunTimer = ABILITIES.OVERKILL.stun;
                              target.lastAttackerId = e.id;
                          }
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
                if (Math.abs(e.vx) > 0.01) e.x += e.vx; if (Math.abs(e.vy) > 0.01) e.y += e.vy;
                e.vx *= FRICTION; e.vy *= FRICTION;
            } else {
                // Trap collision
                ref.traps.forEach((trap) => {
                     if (!trap.active || trap.ownerId === e.id) return;
                     const dx = e.x - trap.x; const dy = e.y - trap.y;
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     if (dist < e.radius + trap.radius) {
                         trap.active = false;
                         spawnParticles(trap.x, trap.y, trap.color, 10);
                         if (trap.type === 'LEGO') {
                             e.stunTimer = 180;
                             e.vx += Math.cos(Math.atan2(dy, dx)) * 10; e.vy += Math.sin(Math.atan2(dy, dx)) * 10;
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
                            let force = PUSH_FORCE;
                            if (e.ability === 'SPEEDRUNNER') force = PUSH_FORCE * 0.5;
                            // Push Logic
                            if (target.id === e.id || target.dead || target.invisible || target.invulnerable) return;
                            if (e.id === myIdRef.current && !target.dead) ref.currentScore += 1;
                            const f = force / (target.mass || 1.0);
                            const a = Math.atan2(dy, dx);
                            if (!target.isRemote) {
                                target.vx += Math.cos(a)*f; target.vy += Math.sin(a)*f;
                                target.stunTimer = 45; target.lastAttackerId = e.id;
                                if (target.invisible) target.invisible = false;
                            } else if (gameMode === 'ONLINE' && channelRef.current) {
                                channelRef.current.send({ type: 'broadcast', event: 'player_hit', payload: { targetId: target.id, attackerId: e.id, force, angle: a, stun: 45 } });
                            }
                            spawnParticles(target.x, target.y, target.color, 5);
                        }
                    });
                }

                if (e.stunTimer <= 0) {
                    if (e.isPlayer && ref.settings.proAim) {
                        const mx = ref.mouse.x - ref.width/2 + ref.camera.x; const my = ref.mouse.y - ref.height/2 + ref.camera.y;
                        e.facing = Math.atan2(my - e.y, mx - e.x);
                    } else if (Math.abs(e.vx) > 0.05 || Math.abs(e.vy) > 0.05) {
                        if (e.isPlayer) e.facing = Math.atan2(e.vy, e.vx);
                    }

                    // Movement
                    if (e.isPlayer && gameState === 'PLAYING') {
                        const speed = e.moveSpeed;
                        if (ref.keys.up) e.vy -= speed; if (ref.keys.down) e.vy += speed;
                        if (ref.keys.left) e.vx -= speed; if (ref.keys.right) e.vx += speed;
                        if (ref.joystick.active) { e.vx += (ref.joystick.dx / 50) * speed; e.vy += (ref.joystick.dy / 50) * speed; }
                    } else if (!e.isPlayer) {
                        // BOT AI
                        // Run Bot AI if playing OR if we are in Ability Menu (Background Mode) for BOTS
                        const shouldRunAI = gameState === 'PLAYING' || (gameState === 'MENU_ABILITY' && gameMode === 'BOTS');
                        
                        if (shouldRunAI) {
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
                                if (Math.abs(angleDiff) > 0.1) e.facing += Math.sign(angleDiff) * 0.1; else e.facing = targetAngle;
                                e.vx += Math.cos(e.facing) * e.moveSpeed; e.vy += Math.sin(e.facing) * e.moveSpeed;
                                if (minDist < 80 && e.attackCooldown <= 0 && !e.isAttacking && Math.random() < 0.05) {
                                    // Bot Attack
                                    if (e.ability !== 'OVERKILL') { e.isAttacking = true; e.attackTimer = ATTACK_DURATION; e.hitList = []; e.attackCooldown = e.maxAttackCooldown; }
                                }
                            }
                            const distFromCenter = Math.sqrt(e.x*e.x + e.y*e.y);
                            if (distFromCenter > ARENA_RADIUS * 0.9) {
                                const angle = Math.atan2(0 - e.y, 0 - e.x);
                                e.vx += Math.cos(angle) * 0.5; e.vy += Math.sin(angle) * 0.5;
                            }
                        }
                    }
                }
                e.x += e.vx; e.y += e.vy; e.vx *= FRICTION; e.vy *= FRICTION;
            }
        });
        
        ref.traps = ref.traps.filter(t => t.active);

        // Player Input (Attack/Skill)
        if (player && !player.dead && player.stunTimer <= 0 && gameState === 'PLAYING') {
            if (ref.keys.attack && player.attackCooldown <= 0 && !player.isAttacking && player.ability !== 'OVERKILL') {
                player.isAttacking = true; player.attackTimer = ATTACK_DURATION; player.hitList = []; player.attackCooldown = player.maxAttackCooldown; player.invisible = false;
                if (gameMode === 'ONLINE' && channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'BASIC' } });
            }
            if (ref.keys.skill && player.skillCooldown <= 0) {
                // Skill Logic
                const config = ABILITIES[player.ability];
                if (config.type === 'ACTIVE') {
                    player.skillCooldown = player.maxSkillCooldown; player.skillAnim = 15; player.invisible = false;
                    // ... (Skill effects identical to before, kept concise here)
                    if (player.ability === 'DASH') { player.vx += Math.cos(player.facing)*10; player.vy += Math.sin(player.facing)*10; }
                    else if (player.ability === 'FLASH') { player.x += Math.cos(player.facing)*250; player.y += Math.sin(player.facing)*250; spawnParticles(player.x, player.y, config.color, 20); }
                    else if (player.ability === 'GHOST') { player.invisible = true; }
                    else if (player.ability === 'REPULSOR') { player.invulnerable = true; }
                    // ... (Broadcast skill)
                    if (gameMode === 'ONLINE' && channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'player_attack', payload: { id: player.id, type: 'SKILL' } });
                }
            }
        }

        // Death & Boundary
        ref.entities.forEach(e => {
            if (e.dead) return;
            const dist = Math.sqrt(e.x*e.x + e.y*e.y);
            if (dist > ARENA_RADIUS + e.radius) {
                e.dead = true;
                spawnParticles(e.x, e.y, e.color, 20);
                if (e.isPlayer) {
                    if (gameMode === 'ONLINE' && channelRef.current && e.lastAttackerId) channelRef.current.send({ type: 'broadcast', event: 'player_killed', payload: { killedBy: e.lastAttackerId, victimName: e.name } });
                    saveProgress(ref.currentScore);
                    setTimeout(() => setGameState('GAMEOVER'), 1000);
                } else if (!e.isRemote) {
                    if (e.lastAttackerId === myIdRef.current) {
                        ref.currentScore += 5;
                        if (ref.currentScore > highScore) { setHighScore(ref.currentScore); localStorage.setItem('pushBattlesHigh', ref.currentScore.toString()); }
                    }
                    if (gameMode === 'BOTS') e.respawnTimer = 600 + Math.floor(Math.random() * 1200);
                    else if (gameMode === 'TEST') e.respawnTimer = 60;
                }
            }
        });

        ref.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; });
        ref.particles = ref.particles.filter(p => p.life > 0);

        if (player && !player.dead) { ref.camera.x += (player.x - ref.camera.x) * 0.1; ref.camera.y += (player.y - ref.camera.y) * 0.1; }
        // Spectator cam logic for menu background
        else if (gameState !== 'PLAYING') {
             // Slowly drift or follow a bot to make background alive
             const activeBot = ref.entities.find(e => !e.dead);
             if (activeBot) { 
                 ref.camera.x += (activeBot.x - ref.camera.x) * 0.05; 
                 ref.camera.y += (activeBot.y - ref.camera.y) * 0.05; 
             } else {
                 // Drift to center if everyone dead
                 ref.camera.x += (0 - ref.camera.x) * 0.05;
                 ref.camera.y += (0 - ref.camera.y) * 0.05;
             }
        }
    };

    // DRAW LOGIC
    const draw = (ctx: CanvasRenderingContext2D) => {
        const ref = gameRef.current;
        const { width, height, camera } = ref;
        
        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

        // --- THEME ---
        let floorColor = '#ffffff';
        let gridColor = '#e2e8f0';
        let voidColor = '#f8fafc'; // For "outside" illusion handled by clearRect usually, but we draw rect over it
        
        if (currentTheme === 'CLASSIC') {
            floorColor = '#4ade80'; // Green
            gridColor = '#86efac'; 
            voidColor = '#60a5fa'; // Blue
        }

        // Void (Background)
        ctx.save();
        ctx.resetTransform();
        ctx.fillStyle = voidColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

        // Arena Floor
        ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2); 
        ctx.fillStyle = floorColor; ctx.fill(); 
        ctx.lineWidth = 5; ctx.strokeStyle = gridColor; ctx.stroke();
        
        // Grid
        ctx.save(); ctx.clip(); ctx.strokeStyle = gridColor; ctx.lineWidth = 2;
        for(let i = -ARENA_RADIUS; i < ARENA_RADIUS; i+=80) {
            ctx.beginPath(); ctx.moveTo(i, -ARENA_RADIUS); ctx.lineTo(i, ARENA_RADIUS); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-ARENA_RADIUS, i); ctx.lineTo(ARENA_RADIUS, i); ctx.stroke();
        }
        ctx.restore();

        // Entities & Particles (Same as before)
        ref.traps.forEach(t => {
            ctx.fillStyle = t.color;
            if (t.type === 'LEGO') { ctx.fillRect(t.x-8, t.y-8, 16, 16); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(t.x-8, t.y-8, 4, 4); }
        });

        ref.entities.forEach(e => {
            if (e.dead) return;
            if (e.hookTarget) { ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.hookTarget.x, e.hookTarget.y); ctx.strokeStyle = '#d97706'; ctx.lineWidth = 4; ctx.stroke(); }
            
            ctx.save(); ctx.translate(e.x, e.y);
            if (e.invisible) { if (e.isPlayer) ctx.globalAlpha = 0.5; else { ctx.restore(); return; } }
            
            // Attack Range Indicator
            if (e.isAttacking) {
                ctx.beginPath(); ctx.arc(0, 0, ATTACK_RADIUS + 5, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; ctx.fill();
            }
            if (e.invulnerable) {
                ctx.beginPath(); ctx.arc(0, 0, e.radius + 10, 0, Math.PI*2);
                ctx.strokeStyle = '#10b981'; ctx.lineWidth = 2; ctx.stroke();
            }
            if (e.isVip || e.isAdmin) {
                 ctx.save(); ctx.translate(0, -e.radius - 25);
                 ctx.beginPath(); ctx.fillStyle = e.isAdmin ? '#ef4444' : '#fbbf24'; 
                 ctx.moveTo(-8, 0); ctx.lineTo(-12, -8); ctx.lineTo(-4, -4); ctx.lineTo(0, -10); ctx.lineTo(4, -4); ctx.lineTo(12, -8); ctx.lineTo(8, 0); ctx.fill();
                 ctx.restore();
            }
            
            // Name
            ctx.save(); 
            if (e.isAdmin) ctx.fillStyle = '#ef4444'; else if (e.isVip) ctx.fillStyle = '#fbbf24'; else ctx.fillStyle = '#64748b'; 
            ctx.font = (e.isAdmin || e.isVip) ? 'bold 12px monospace' : 'bold 11px monospace'; 
            ctx.textAlign = 'center'; ctx.fillText(e.name.toUpperCase(), 0, -e.radius - 12); 
            ctx.restore();

            ctx.fillStyle = e.stunTimer > 0 ? '#94a3b8' : e.color; 
            if (e.ability === 'SPIKES') { for(let i=0; i<8; i++) { const a = (Math.PI*2/8)*i; ctx.beginPath(); ctx.moveTo(Math.cos(a)*e.radius, Math.sin(a)*e.radius); ctx.lineTo(Math.cos(a)*(e.radius+8), Math.sin(a)*(e.radius+8)); ctx.strokeStyle = '#64748b'; ctx.lineWidth = 3; ctx.stroke(); } }
            if (e.ability === 'MASS') { ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.stroke(); }
            if (e.ability === 'OVERKILL') { ctx.lineWidth = 3; ctx.strokeStyle = '#ff0000'; ctx.stroke(); }

            ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
            if (!e.isPlayer) { ctx.rotate(e.facing); ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.beginPath(); ctx.moveTo(e.radius + 5, 0); ctx.lineTo(e.radius + 15, -5); ctx.lineTo(e.radius + 15, 5); ctx.fill(); ctx.rotate(-e.facing); }
            
            const lookAngle = e.facing; const eyeOffX = Math.cos(lookAngle) * 8; const eyeOffY = Math.sin(lookAngle) * 8;
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(eyeOffX, eyeOffY, 6, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        ref.particles.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill(); });
        ctx.globalAlpha = 1.0; ctx.restore();

        // HUD IN GAME
        if (gameState === 'PLAYING') {
            const player = ref.entities.find(e => e.isPlayer);
            if (player && !player.dead) {
                 const barW = 100; const barH = 8; const centerX = width / 2; const bottomY = height - 40;
                 const atkPct = Math.max(0, 1 - (player.attackCooldown / player.maxAttackCooldown));
                 ctx.fillStyle = '#1e293b'; ctx.fillRect(centerX - barW - 10, bottomY, barW, barH);
                 ctx.fillStyle = atkPct === 1 ? '#ef4444' : '#64748b'; ctx.fillRect(centerX - barW - 10, bottomY, barW * atkPct, barH);
                 ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'right'; ctx.fillText(t.push, centerX - 15, bottomY - 5);

                 const config = ABILITIES[player.ability];
                 if (config.type === 'ACTIVE') {
                     const skillPct = Math.max(0, 1 - (player.skillCooldown / player.maxSkillCooldown));
                     ctx.fillStyle = '#1e293b'; ctx.fillRect(centerX + 10, bottomY, barW, barH);
                     ctx.fillStyle = skillPct === 1 ? player.color : '#64748b'; ctx.fillRect(centerX + 10, bottomY, barW * skillPct, barH);
                     ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left'; ctx.fillText(t.skill, centerX + 15, bottomY - 5);
                 }
                 
                 if (gameMode === 'BOTS') {
                     ctx.fillStyle = '#64748b'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; ctx.fillText(`${Math.floor(ref.survivalTime / 60)}s`, centerX, bottomY + 20);
                 }
            }
            
            ctx.fillStyle = '#0f172a'; ctx.font = 'bold 24px monospace'; ctx.textAlign = 'left'; ctx.fillText(`${t.points}: ${ref.currentScore}`, 20, 40);
            ctx.fillStyle = '#64748b'; ctx.font = 'bold 16px monospace'; ctx.fillText(`${t.record}: ${highScore}`, 20, 65);
            if (gameMode === 'ONLINE') { ctx.fillStyle = isConnected ? '#22c55e' : '#ef4444'; ctx.fillText(isConnected ? `${t.onlinePlayers}: ${onlineCount}` : t.connecting, 20, 90); }
        }
        
        if (ref.joystick.active) { ctx.beginPath(); ctx.arc(ref.joystick.x, ref.joystick.y, 50, 0, Math.PI*2); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 4; ctx.stroke(); ctx.beginPath(); ctx.arc(ref.joystick.x + ref.joystick.dx, ref.joystick.y + ref.joystick.dy, 25, 0, Math.PI*2); ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; ctx.fill(); }
    };

    loop();

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
        // Important cleanup for observer
        observer.disconnect();
        cancelAnimationFrame(gameRef.current.animationId);
    };
  }, [gameState, selectedAbility, gameMode, isConnected, onlineCount, user, careerPushes, isAdmin, notification, proAim, isVip, lang, currentTheme]);

  // --- RENDERING MENUS ---

  return (
    <div ref={containerRef} className="w-full h-full relative font-mono select-none overflow-hidden bg-slate-50">
      {/* Force canvas to take full container size via CSS, ResizeObserver handles resolution */}
      <canvas ref={canvasRef} className="block w-full h-full touch-none" style={{ width: '100%', height: '100%' }} />
      
      {/* 1. MAIN MENU (SELECT MODE) */}
      {gameState === 'MENU_HOME' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px] z-20 p-6">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full animate-in zoom-in-95 relative">
                  <div className="flex justify-between items-start mb-8">
                      <div>
                          <h2 className="text-3xl font-black text-slate-800">PUSH BATTLES</h2>
                          <p className="text-slate-400 text-xs font-bold tracking-widest">{t.selectMode}</p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setShowReport(true)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><Flag size={18} /></button>
                          <button onClick={() => setShowSettings(true)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"><Settings size={18} /></button>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <button onClick={() => { setGameMode('BOTS'); prepareBackground('BOTS'); setGameState('MENU_ABILITY'); }} className="p-6 bg-slate-50 border-2 border-slate-100 hover:border-slate-300 rounded-2xl flex flex-col items-center gap-3 transition-all group">
                          <Users size={32} className="text-slate-400 group-hover:text-slate-800" />
                          <span className="font-bold text-slate-700">{t.trainBots}</span>
                      </button>
                      <button onClick={() => { setGameMode('ONLINE'); prepareBackground('ONLINE'); setGameState('MENU_ABILITY'); }} className="p-6 bg-slate-50 border-2 border-slate-100 hover:border-green-300 rounded-2xl flex flex-col items-center gap-3 transition-all group">
                          <Globe size={32} className="text-slate-400 group-hover:text-green-500" />
                          <span className="font-bold text-slate-700">{t.online}</span>
                      </button>
                  </div>
                  {isVip && (
                      <button onClick={() => { setGameMode('TEST'); prepareBackground('TEST'); setGameState('MENU_ABILITY'); }} className="w-full py-3 mb-6 bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-100">
                          <TestTube size={18} /> {t.testMode}
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* 2. ABILITY SELECT (BACKGROUND ACTIVE) */}
      {gameState === 'MENU_ABILITY' && (
          <div className="absolute inset-0 flex items-end justify-center z-20 pointer-events-none">
              {/* Improved Visibility: Transparent container so game logic (Bots/Online) is visible behind */}
              <div className="bg-white/90 backdrop-blur-xl w-full max-w-4xl p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-slate-100 pointer-events-auto animate-in slide-in-from-bottom-10">
                  <div className="flex justify-between items-center mb-6">
                      <button onClick={() => { setGameState('MENU_HOME'); prepareBackground('MENU_HOME' as any); }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18} /></button>
                      <h3 className="text-xl font-black text-slate-800">{t.selectAbility}</h3>
                      <div className="w-8"></div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit mx-auto">
                      <button onClick={() => setAbilityTab('PUSH')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-colors ${abilityTab === 'PUSH' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t.tabPushes}</button>
                      <button onClick={() => setAbilityTab('BADGE')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-colors ${abilityTab === 'BADGE' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t.tabBadges}</button>
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6 max-h-[200px] overflow-y-auto p-2">
                      {Object.entries(ABILITIES).map(([key, data]) => {
                          const isDev = key.startsWith('DEV_') || key.startsWith('ADMIN_');
                          if (isDev && !isAdmin) return null;
                          if ((data.category || 'PUSH') !== abilityTab) return null;

                          let isLocked = !isVip && careerPushes < data.reqPoints;
                          if (key === 'SPEEDRUNNER') isLocked = !unlockedAchievements.includes('pb_speedrunner');
                          if (key === 'OVERKILL') isLocked = !isVip && !isAdmin;
                          
                          const isSelected = selectedAbility === key;

                          return (
                              <button key={key} onClick={() => !isLocked && setSelectedAbility(key)} className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300'}`}>
                                  {isLocked && <div className="absolute inset-0 bg-slate-100/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-10"><Lock size={16} className="text-slate-400" /></div>}
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: data.color }}>{data.icon}</div>
                                  <div className="text-[10px] font-bold text-slate-700 truncate w-full text-center px-1">{data.name}</div>
                              </button>
                          );
                      })}
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: ABILITIES[selectedAbility].color }}>
                              {ABILITIES[selectedAbility].icon}
                          </div>
                          <div>
                              <div className="font-bold text-slate-800 text-lg">{ABILITIES[selectedAbility].name}</div>
                              <div className="text-xs text-slate-400">{ABILITIES[selectedAbility].desc}</div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{ABILITIES[selectedAbility].type === 'ACTIVE' ? t.active : t.passive}</div>
                          <div className="text-xs font-bold text-slate-600">{t.cost}: {ABILITIES[selectedAbility].reqPoints}</div>
                      </div>
                  </div>

                  <button onClick={spawnPlayer} className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-red-500/20 transition-transform active:scale-95">
                      {t.play}
                  </button>
              </div>
          </div>
      )}

      {/* OVERLAYS */}
      {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-2xl shadow-xl w-80 animate-in fade-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={18} /> {t.settings}</h3><button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                   <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500 mb-4"><h4 className="font-bold text-slate-700 mb-2">Controls</h4><p>{t.controls}</p></div>
                   
                   <div className="space-y-3 mb-6">
                       <button onClick={handleProAimToggle} className={`w-full p-3 rounded-lg flex items-center justify-between border ${proAim ? 'bg-red-50 border-red-500 text-red-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                           <div className="flex items-center gap-2 font-bold text-sm"><MousePointer2 size={16} /> {t.proAim}</div>
                           <div className={`w-10 h-5 rounded-full relative transition-colors ${proAim ? 'bg-red-500' : 'bg-slate-300'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${proAim ? 'left-6' : 'left-1'}`}></div></div>
                       </button>
                       <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                           <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2"><Palette size={14} /> {t.theme}</div>
                           <div className="flex gap-2">
                               <button onClick={() => handleThemeChange('DEFAULT')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${currentTheme === 'DEFAULT' ? 'bg-white shadow border border-slate-300' : 'text-slate-400'}`}>{t.themeDefault}</button>
                               <button onClick={() => handleThemeChange('CLASSIC')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all flex items-center justify-center gap-1 ${currentTheme === 'CLASSIC' ? 'bg-green-100 text-green-700 border border-green-200' : 'text-slate-400'} ${(!isVip && !isAdmin) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                   {(!isVip && !isAdmin) && <Lock size={10} />} {t.themeClassic}
                               </button>
                           </div>
                       </div>
                   </div>
                   <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">{t.close}</button>
               </div>
          </div>
      )}

      {showReport && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-2xl shadow-xl w-80 animate-in fade-in zoom-in-95">
                   <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageSquareWarning size={18} /> {t.reportTitle}</h3><button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div>
                   <div className="flex gap-2 mb-4">
                       <button onClick={() => setReportType('BUG')} className={`flex-1 py-2 rounded-lg font-bold text-xs ${reportType === 'BUG' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-slate-500'}`}>{t.bug}</button>
                       <button onClick={() => setReportType('PLAYER')} className={`flex-1 py-2 rounded-lg font-bold text-xs ${reportType === 'PLAYER' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-50 text-slate-500'}`}>{t.player}</button>
                   </div>
                   <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder={t.desc} className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4 text-sm outline-none focus:ring-2 focus:ring-red-100 resize-none"></textarea>
                   <button onClick={submitReport} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">{t.submit}</button>
               </div>
          </div>
      )}

      {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
                  <h2 className="text-3xl font-black text-slate-800 mb-2">{t.gameOver}</h2>
                  <p className="text-slate-500 mb-6">{t.pointsRound} <span className="font-bold text-red-500">{gameRef.current.currentScore}</span></p>
                  <div className="mb-6 p-4 bg-slate-50 rounded-xl"><div className="text-xs font-bold text-slate-400 uppercase">{t.careerTotal}</div><div className="text-2xl font-black text-slate-800">{careerPushes}</div></div>
                  <button onClick={() => setGameState('MENU_HOME')} className="px-8 py-3 bg-slate-800 text-white font-bold rounded-xl w-full">{t.backLobby}</button>
              </div>
          </div>
      )}

      {/* GAMEPLAY HUD */}
      {gameState === 'PLAYING' && (
          <>
            <div className="absolute bottom-12 left-12 w-32 h-32 rounded-full border-4 border-slate-300/30 flex items-center justify-center pointer-events-none"><div className="text-slate-300/50 font-black text-sm">{t.move}</div></div>
            <div className="absolute bottom-12 right-12 w-32 h-32 rounded-full bg-red-500/20 border-4 border-red-500/50 flex items-center justify-center pointer-events-none"><div className="text-red-500/50 font-black text-sm">{t.atk}</div></div>
            <div className="absolute bottom-48 right-12 w-20 h-20 rounded-full bg-blue-500/20 border-4 border-blue-500/50 flex items-center justify-center pointer-events-none"><div className="text-blue-500/50 font-black text-xs text-center leading-tight">SKILL<br/>(E)</div></div>
          </>
      )}
    </div>
  );
};

export default PushBattles;