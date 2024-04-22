import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { Participant, Room } from '../../models/room';
import { MatSnackBar } from '@angular/material/snack-bar';

interface Thematic {
  name: string;
  imageUrl: string;
  selected?: boolean;
}

@Component({
  selector: 'app-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.css']
})
export class LobbyComponent implements OnInit {
  roomId: string = '';
  room: Room | null = null;
  participants: Participant[] = [];
  creatingRoom: boolean = false;
  joiningRoom: boolean = false;
  soloPlay: boolean = false;
  username: string = '';
  selectedTheme: Thematic | null = null;
  currentUserId: string = this.roomService.getCurrentUserIdOrGuest();

  thematics: Thematic[] = [
    { name: 'Science', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fscience-thematic.webp?alt=media&token=3d5179f4-b296-489d-b818-3b54641b2675' },
    { name: 'Geography', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fgeography-thematic.jpeg?alt=media&token=cce6a5f1-c137-427b-b249-9f24fbb48fb2' },
    { name: 'History', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fhistory-thematic.jpeg?alt=media&token=0f1d1b2b-9bb4-481a-9afb-e86cbd800d44' },
    { name: 'Sports', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fsports-thematic.jpeg?alt=media&token=4d8939c8-4362-493c-93c7-3b5299201012' },
    { name: 'Literature', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fliterature-thematic.webp?alt=media&token=5bac1ca6-49b2-4f63-a780-8fcc94eec597' },
    { name: 'Mix', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fmix-thematic.jpg?alt=media&token=d3dee275-210f-4fa4-a583-c555736dcff4' }
  ];

  constructor(
    private route: ActivatedRoute, 
    private router: Router, 
    private roomService: RoomService, 
    private snackBar: MatSnackBar,
    private ref: ChangeDetectorRef
  ) {}

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent) {
    event.returnValue = "Changes you made may not be saved."; //is set to maintain compatibility with current browsers, it is deprecated
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('theme');
  }

  ngOnInit(): void {
    this.initializeRoom();
  }

  initializeRoom() {
    this.route.params.subscribe(params => {
      console.log("Lobby parameters:", params);  // Debug
      this.username = params['username'] || 'Guest';
      this.handleRoomCreation(params);
    });
  }

  emptySlots(maxPlayers: number | null | undefined, currentCount: number): string[] {
    const count = Math.max((maxPlayers || 0) - currentCount, 0);
    return Array(count).fill('Empty');
  }

  handleRoomCreation(params: any) {
    console.log("Handling room creation/joining with params:", params);
    if (params['createNew'] && !this.roomId) {
        this.creatingRoom = true;
        this.createRoom(params['username']);
    } else if (params['id']) {
        this.roomId = params['id'];
        this.joiningRoom = true;
        this.fetchRoom();
        if (params['username']) {
            this.addParticipant({ userId: this.roomService.getCurrentUserIdOrGuest(), username: params['username'] });
        }
    } else {
        this.soloPlay = true;
    }
  }

  selectTheme(theme: Thematic): void {
    this.selectedTheme = theme;
    this.thematics.forEach(t => t.selected = false);
    theme.selected = true;
  }

  createRoom(username: string) {
    this.roomService.createRoom({
      name: "New Room", maxPlayers: 8, username: username
    }).then(roomId => {
      this.roomId = roomId;
      sessionStorage.setItem('roomId', roomId);
      this.router.navigate(['/lobby', { id: roomId, username: username }]);
      this.creatingRoom = false;
    }).catch(error => {
      console.error('Error creating room:', error);
      this.snackBar.open('Failed to create room. Please try again.', 'Close', { duration: 3000 });
    });
  }

  startSelectedGame() {
    if (!this.selectedTheme) {
        this.snackBar.open('Please select a thematic game to start.', 'Close', {duration: 3000});
        return;
    }

    if (this.soloPlay) {
        this.router.navigate(['/game-thematic', this.selectedTheme.name], {
            queryParams: {username: this.username, soloPlay: true}
        });
    } else if (this.room?.isHost) {
        this.roomService.startGame(this.roomId!).then(() => {
            console.log(`Using Room ID: ${this.roomId} for subscribing to game start.`);
            this.router.navigate(['/game-room', this.roomId, this.selectedTheme?.name], {
                queryParams: {username: this.username, isHost: this.room?.isHost}
            });
        }).catch(err => {
            console.error('Failed to start game:', err);
            this.snackBar.open('Failed to start game. Please try again.', 'Close', { duration: 3000 });
        });
    } else {
        this.snackBar.open('Only the room host can start the game.', 'Close', {duration: 3000});
    }
  }

  fetchRoom() {
    console.log("Fetching room for ID:", this.roomId);
    this.roomService.getRoomById(this.roomId).subscribe(room => {
        console.log("Room fetched:", room);
        if (room) {
            this.room = room;
            this.participants = room.participants || [];
            console.log(`Participants currently in room: ${this.participants.length}`);
            this.ref.detectChanges();
            this.checkAllPlayersReady();
        }
    }, error => {
        console.error("Error fetching room:", error);
    });
  }

  checkAllPlayersReady() {
    const requiredPlayers = this.room?.maxPlayers ?? 0; // Provide a default value of 0 if undefined
    if (this.participants.length < requiredPlayers) {
        console.log("Not all players have joined yet.");
        this.snackBar.open('Waiting for all players to join.', 'Close', { duration: 3000 });
    } else {
        console.log("All players have joined. Ready to start!");
    }
  }

  addParticipant(participant: Participant) {
    if (!this.roomId) return;
    console.log("Adding participant to room:", participant);  // Debug
    this.roomService.addParticipant(this.roomId, participant)
      .then(() => {
        this.participants.push(participant);
        this.ref.detectChanges();  // Update UI to show new participant
      })
      .catch(err => {
        console.error("Failed to add participant", err);
      });
  }

  copyRoomCodeToClipboard(): void {
    if (!this.roomId) return;
  
    navigator.clipboard.writeText(this.roomId)
      .then(() => {
        this.snackBar.open('Room code copied!', 'Close', { duration: 2000 });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  }
  
}

