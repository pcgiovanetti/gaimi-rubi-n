import React from 'react'; // Ensure React is imported for JSX
import { Game, Platform, Achievement } from './types';
import { Zap, Timer } from 'lucide-react'; // Import icons used in achievements

export const CREATOR_NAME = "pcgiovanetti";

export const TRANSLATIONS = {
  en: {
    heroSubtitle: "Minimalist game portfolio.",
    searchPlaceholder: "Search for a game...",
    notFound: "No games found.",
    login: "Login",
    vipButton: "BECOME VIP",
    games: "Games",
    about: "About",
    footer: "by pcgiovanetti",
    profile: "Profile",
    achievements: "Achievements",
    vipModalTitle: "GAIMI RUBI VIP",
    vipModalSubtitle: "Support the creator and unlock exclusive perks.",
    perks: [
        { title: "No Ads", desc: "Enjoy an uninterrupted experience (Coming Soon)." },
        { title: "Exclusive Content", desc: "Unlock special abilities and skins in games." },
        { title: "Golden Name", desc: "Stand out in leaderboards and chat." },
        { title: "Support Development", desc: "Help keep the servers running." }
    ],
    price: "R$ 6,80 / month",
    subscribe: "SUBSCRIBE NOW"
  },
  pt: {
    heroSubtitle: "Portfólio de jogos minimalista.",
    searchPlaceholder: "Busque por um jogo...",
    notFound: "Nenhum jogo encontrado.",
    login: "Entrar",
    vipButton: "SEJA VIP",
    games: "Jogos",
    about: "Sobre",
    footer: "por pcgiovanetti",
    profile: "Perfil",
    achievements: "Conquistas",
    vipModalTitle: "VIP GAIMI RUBI",
    vipModalSubtitle: "Apoie o criador e desbloqueie vantagens exclusivas.",
    perks: [
        { title: "Sem Anúncios", desc: "Experiência sem interrupções (Em Breve)." },
        { title: "Conteúdo Exclusivo", desc: "Habilidades e skins especiais nos jogos." },
        { title: "Nome Dourado", desc: "Destaque-se nos rankings e chat." },
        { title: "Apoie o Desenvolvimento", desc: "Ajude a manter os servidores online." }
    ],
    price: "R$ 6,80 / mês",
    subscribe: "ASSINAR AGORA"
  }
};

export const GAMES: Game[] = [
  {
    id: 'push-battles',
    title: 'Push Battles',
    description: 'Arena battle IO style. Choose your ability, push enemies off the island and be the last survivor!',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Arena / Action IO',
    thumbnailUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'stick-run',
    title: 'Stick Run',
    description: 'Run, jump holes, crouch under missiles and shoot enemies. Manage your ammo in this fast-paced runner.',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Action Runner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'pocket-versus',
    title: 'Pocket Versus',
    description: 'Challenge a friend on the same phone! 10 fast mini-games of reflex, logic and speed.',
    creator: CREATOR_NAME,
    platforms: [Platform.MOBILE],
    theme: 'Multiplayer Local / Party',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'retro-arcade',
    title: 'Retro Arcade',
    description: 'A collection of 5 timeless classics recreated with minimalist design. Includes Snake, Pong, Breakout and more.',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Collection / Retro',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  }
];

// Achievements Definition
// Note: We use React.createElement for icons to avoid issues in some environments if not fully TSX
export const ACHIEVEMENTS_LIST: Achievement[] = [
    {
        id: 'pb_speedrunner',
        title: 'Speedrunner',
        description: 'Push Battles: Survive 2 minutes in Bot Mode.',
        icon: '⚡', // Using simple string or you can import lucide icons
        reward: 'SPEEDRUNNER'
    }
];