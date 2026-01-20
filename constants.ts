import { Game, Platform } from './types';

export const CREATOR_NAME = "pcgiovanetti";

export const GAMES: Game[] = [
  {
    id: 'push-battles',
    title: 'Push Battles',
    description: 'Batalha de arena estilo IO. Escolha sua habilidade, empurre inimigos para fora da ilha e seja o último sobrevivente!',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Arena / Action IO',
    thumbnailUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'stick-run',
    title: 'Stick Run',
    description: 'Corra, pule buracos, agache de mísseis e atire nos inimigos. Gerencie sua munição neste runner de ação rápida.',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Action Runner',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'pocket-versus',
    title: 'Pocket Versus',
    description: 'Desafie um amigo no mesmo celular! 10 mini-games rápidos de reflexo, lógica e velocidade.',
    creator: CREATOR_NAME,
    platforms: [Platform.MOBILE],
    theme: 'Multiplayer Local / Party',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611996575749-79a3a250f948?auto=format&fit=crop&q=80&w=800',
    year: 2024
  },
  {
    id: 'retro-arcade',
    title: 'Retro Arcade',
    description: 'Uma coleção de 5 clássicos atemporais recriados com design minimalista. Inclui Snake, Pong, Breakout e mais.',
    creator: CREATOR_NAME,
    platforms: [Platform.PC, Platform.MOBILE],
    theme: 'Coletânea / Retro',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    year: 2024
  }
];