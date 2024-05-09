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
  gameStarted: boolean; // Ensure this is always initialized
  selectedThemeName?: string;

  constructor(
    name: string,
    status: 'waiting' | 'active' | 'finished' = 'waiting', // default value if not provided
    participants: Participant[] = [], // default empty array
    maxPlayers: number = 8, // default number of players
    settings: any = {},
    createdAt: Date = new Date(), // default to current date/time
    gameStarted: boolean = false, // default value
    id?: string,
    isHost: boolean = false  // default to false
  ) {
    this.name = name;
    this.status = status;
    this.participants = participants;
    this.maxPlayers = maxPlayers;
    this.settings = settings;
    this.createdAt = createdAt;
    this.id = id;
    this.isHost = isHost;
    this.gameStarted = gameStarted;
  }
}
