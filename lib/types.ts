export type Player = {
  id: string;
  name: string;
};

export type Attack = {
  row: number;
  col: number;
  isHit: boolean;
  attackerId: string;
};

export type GamePhase = "lobby" | "waiting" | "setup" | "battle" | "finished";

export type Ship = {
  id: string;
  size: number;
  placed: boolean;
  position?: { row: number; col: number };
  orientation?: "horizontal" | "vertical";
  positions?: { row: number; col: number }[];
  hits?: boolean[];
};

export type Cell = {
  hasShip: boolean;
  shipId?: string;
  isHit: boolean;
  isMiss: boolean;
};
