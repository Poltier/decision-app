import { Question } from './question';

export interface Participant {
  username: string;
  userId: string;
  score?: number;
}

export class Room {
  id?: string;
  name: string;
  status: 'waiting' | 'active' | 'finished';
  participants: Participant[];
  maxPlayers: number;
  settings: any;
  createdAt: Date;
  hostId?: string;
  isHost: boolean;
  gameStarted: boolean;
  selectedThemeName?: string;
  questions?: Question[];

  constructor(
    name: string,
    status: 'waiting' | 'active' | 'finished' = 'waiting',
    participants: Participant[] = [],
    maxPlayers: number = 8,
    settings: any = {},
    createdAt: Date = new Date(),
    hostId: string = '',
    gameStarted: boolean = false,
    id?: string,
    isHost: boolean = false,
    questions?: Question[]
  ) {
    this.name = name;
    this.status = status;
    this.participants = participants;
    this.maxPlayers = maxPlayers;
    this.settings = settings;
    this.createdAt = createdAt;
    this.hostId = hostId;
    this.id = id;
    this.isHost = isHost;
    this.gameStarted = gameStarted;
    this.questions = questions;
  }
}
