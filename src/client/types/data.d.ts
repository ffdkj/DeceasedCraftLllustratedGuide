export {};

export interface SeedMonster {
  id: string;
  name: string;
  en?: string;
  category?: string;
  threat?: number;
  hp?: string;
  attack?: string;
  armor?: string;
  attackType?: string;
  spawn?: string;
  behavior?: string;
  strategy?: string;
  drops?: string;
  source?: string;
  image?: string;
  imageNote?: string;
  [key: string]: unknown;
}

export interface SeedMachine {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface SeedData {
  monsters: SeedMonster[];
  machines: SeedMachine[];
}

declare global {
  interface Window {
    WZ_DATA: any;
    WZ_SEED: SeedData;
    WZ_GUIDES: any;
    WZ_GUNSMITH: any;
    WZ_RECIPES: any;
    WZ_RECIPES_UI: any;
    WZ_TIERS: any;
    WZ_TIERS_UI: any;
    WZ_CHANGELOG: any;
    WZ_TEXTURES: any;
    WZ_BUILDING_THUMBS: Record<string, string>;
    WZ_BUILDING_THUMBS_SMALL: Record<string, string>;
    WZ_APP_UI: any;
    WZ_GUNSMITH_UI: any;
    WZMusic: any;
  }
}
