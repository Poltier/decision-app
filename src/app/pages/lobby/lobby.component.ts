import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { GameService } from '../../services/game.service';
import { Participant, Room } from '../../models/room';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { Question } from '../../models/question';

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
export class LobbyComponent implements OnInit, OnDestroy {
  roomId: string = '';
  room: Room | null = null;
  participants: Participant[] = [];
  creatingRoom: boolean = false;
  joiningRoom: boolean = false;
  soloPlay: boolean = false;
  username: string = '';
  selectedTheme: Thematic | null = null;
  currentUserId: string = this.roomService.getCurrentUserIdOrGuest();
  subscription: Subscription = new Subscription();
  watchOn:boolean = false;

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
    private gameService: GameService,
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

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  initializeRoom() {
    this.route.params.subscribe(params => {
      console.log("Lobby parameters:", params);
      this.username = params['username'] || 'Guest';
      this.handleRoomCreation(params);
    });
  }

  watchGameStarted(){
    if(this.room && !this.room.isHost && !this.watchOn){
      this.subscription.add(
        this.roomService.watchGameStarted(this.roomId).subscribe(gameStart =>{
          if(gameStart)
            {  this.router.navigate(['/game-room', this.selectedTheme?.name], {
              queryParams: { roomId:this.roomId,username: this.username, isHost: this.room?.isHost }
            });
          }
        })
      );
      this.watchOn = true;
    }
  }


  handleRoomCreation(params: any) {
    if (params['createNew'] && !this.roomId) {
      this.creatingRoom = true;
      this.createRoom(params['username']);
    } else if (params['id']) {
      this.roomId = params['id'];
      this.joiningRoom = true;
      this.fetchRoom();
      const newParticipant = { userId: this.roomService.getCurrentUserIdOrGuest(), username: params['username'] };

      this.roomService.getRoomByIdentifier(this.roomId).subscribe(room =>{

      if (params['username'] && room && !room.participants.find(x => x.username == newParticipant.username)){
        this.roomService.addParticipant(this.roomId, newParticipant)
        .then(() => {
          console.log("Participant added successfully.");
        })
        .catch((error: any) => {
          console.error("Failed to add participant:", error);
          this.snackBar.open('Failed to add participant. Please try again.', 'Close', { duration: 3000 });
        });
      }

      });

    } else if (params['soloPlay']) {
      this.soloPlay = true;
    }
  }
  
  emptySlots(maxPlayers: number | null | undefined, currentCount: number): string[] {
    const count = Math.max((maxPlayers || 0) - currentCount, 0);
    return Array(count).fill('Empty');
  }

  removeParticipant(participant: Participant): void {
    if (!this.roomId || !participant) {
      console.log("Attempt to remove participant without valid room or participant data.");
      return;
    }
  
    const removalConfirmationMessage = participant.userId === this.currentUserId ?
      `Are you sure you want to remove yourself from the room?` :
      `Are you sure you want to remove ${participant.username} from the room?`;
  
    if (confirm(removalConfirmationMessage)) {
      this.executeRemoval(participant, participant.userId === this.currentUserId);
    }
  }

  executeRemoval(participant: Participant, isCurrentUser: boolean) {
    this.roomService.removeParticipant(this.roomId, participant)
      .then(() => {
        this.snackBar.open(`${participant.username} has been removed from the room.`, 'Close', { duration: 3000 });
        // Update local participants list
        this.participants = this.participants.filter(p => p.userId !== participant.userId);
        this.ref.detectChanges(); // Force UI update
  
        // Redirect current user if they are the ones being removed
        if (isCurrentUser) {
          this.router.navigate(['/dashboard']);
        }
      })
      .catch(err => {
        console.error('Failed to remove participant:', err);
        this.snackBar.open('Failed to remove participant. Please try again.', 'Close', { duration: 3000 });
      });
  }
  
  selectTheme(theme: Thematic): void {
    this.selectedTheme = theme;
    this.thematics.forEach(t => t.selected = false);
    theme.selected = true;
    if (this.roomId) {
      this.roomService.setSelectedThemeForRoom(this.roomId, theme.name).catch(err => {
        console.error('Error setting theme for room:', err);
      });
    }
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
      this.snackBar.open('Please select a thematic game to start.', 'Close', { duration: 3000 });
      return;
    }
  
    if (this.soloPlay) {
      this.router.navigate(['/game-thematic', this.selectedTheme.name], {
        queryParams: { username: this.username, soloPlay: true }
      });
    } else if (this.room?.isHost) {
      this.gameService.loadQuestionsFromFirestoreByThematic(this.selectedTheme.name)
        .then((questions: Question[]) => {
          if (questions.length > 0) {
            this.roomService.startGame(this.roomId!, questions).then(() => {
              this.router.navigate(['/game-room', this.selectedTheme?.name], {
                queryParams: { roomId: this.roomId,username: this.username, isHost: this.room?.isHost }
              });
            }).catch(err => {
              console.error('Failed to start game:', err);
              this.snackBar.open('Failed to start game. Please try again.', 'Close', { duration: 3000 });
            });
          } else {
            this.snackBar.open('Not enough questions available for the selected theme.', 'Close', { duration: 3000 });
          }
        })
        .catch((err: any) => {
          console.error('Failed to load questions:', err);
          this.snackBar.open('Failed to load questions. Please try again.', 'Close', { duration: 3000 });
        });
    } else {
      this.snackBar.open('Only the room host can start the game.', 'Close', { duration: 3000 });
    }
  }
  
  fetchRoom(): void {
    if (!this.roomId) return;
    let wasParticipant = false;
  
    this.subscription.add(this.roomService.getRoomById(this.roomId).subscribe(room => {
      if (!room) {
        console.error("Room not found:", this.roomId);
        this.snackBar.open("Room not found. Please check the room code.", "Close", { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      this.room = room;
      this.watchGameStarted();
      this.participants = room.participants || [];

      this.selectedTheme = this.thematics.find(t => t.name === room.selectedThemeName) ?? null;
      this.thematics.forEach(theme => theme.selected = (theme.name === room.selectedThemeName));
      this.ref.detectChanges();
      
      const isParticipant = this.participants.some(p => p.userId === this.currentUserId);
  
      if (wasParticipant && !isParticipant) {
        this.snackBar.open("You have been removed from the room.", "Close", {duration: 3000});
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 3200)
      }
  
      wasParticipant = isParticipant;
      this.ref.detectChanges();
    }, error => {
      console.error("Failed to fetch room:", error);
      this.snackBar.open("Failed to fetch room details. Please try again.", "Close", { duration: 3000 });
    })
  );
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

  onExitLobby(): void {
    if (this.soloPlay) {
      this.router.navigate(['/dashboard']);
    }

    if (!this.roomId) return;
  
    this.roomService.leaveRoom(this.roomId, this.currentUserId)
      .then((closedByHost) => {
          this.snackBar.open(closedByHost ? "Host has left, room closed." : "You have left the room.", "Close", {duration: 3000});
          this.participants = [];
          this.room = null; 
          this.ref.detectChanges();
      })
      .catch(error => {
          console.error("Error when trying to leave or close the room:", error);
          this.snackBar.open("Failed to leave or close the room. Please try again.", "Close", {duration: 3000});
      });
  }
}
