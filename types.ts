import React from 'react';

export enum Platform {
  PC = 'PC',
  MOBILE = 'Mobile',
  BOTH = 'PC & Mobile'
}

export interface Game {
  id: string;
  title: string;
  description: string;
  creator: string;
  platforms: Platform[];
  theme: string;
  thumbnailUrl: string;
  year: number;
}

export interface SearchResponse {
  gameIds: string[];
  reasoning: string;
}

export type Language = 'en' | 'pt';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  reward?: string; // Unlockable Ability ID
}