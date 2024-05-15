import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService } from '../../services/room.service';
import { Participant, Room } from '../../models/room';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

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
    this.subscribeToGameStarted(); 
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

  subscribeToGameStarted(): void {
    if (this.roomId) {
      this.subscription.add(
        this.roomService.watchGameStarted(this.roomId).subscribe(gameStarted => {
          if (!gameStarted) {
            this.router.navigate(['/lobby', { id: this.roomId, username: this.username }]);
          } else {
            this.router.navigate(['/game-room', this.roomId, this.selectedTheme?.name], {
              queryParams: { username: this.username, isHost: this.room?.isHost }
            });
          }
        })
      );
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
        if (params['username']) {
            const newParticipant = { userId: this.roomService.getCurrentUserIdOrGuest(), username: params['username'] };
            this.roomService.addParticipant(this.roomId, newParticipant)
                .then(() => {
                    console.log("Participant added successfully.");
                    this.participants.push(newParticipant);
                    this.ref.detectChanges();
                })
                .catch((error: any) => {
                    console.error("Failed to add participant:", error);
                    this.snackBar.open('Failed to add participant. Please try again.', 'Close', { duration: 3000 });
                });
        }
    } else {
        this.soloPlay = true;
    }
  }

  startGame(): void {
    if (!this.roomId || !this.selectedTheme?.name) {
      this.snackBar.open('Cannot start game. Room ID or Theme is not set.', 'Close', { duration: 3000 });
      return;
    }
  
    this.roomService.startGame(this.roomId).then(() => {
      // La navegación a la sala del juego se maneja ahora en subscribeToGameStart()
    }).catch(err => {
      console.error('Failed to start game:', err);
      this.snackBar.open('Failed to start game. Please try again.', 'Close', { duration: 3000 });
    });
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
        this.snackBar.open('Please select a thematic game to start.', 'Close', {duration: 3000});
        return;
    }

    if (this.soloPlay) {
        this.router.navigate(['/game-thematic', this.selectedTheme.name], {
            queryParams: {username: this.username, soloPlay: true}
        });
    } else if (this.room?.isHost) {
        this.roomService.startGame(this.roomId!).then(() => {
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

  fetchRoom(): void {
    if (!this.roomId) return;
    let wasParticipant = false; // Variable para rastrear si el usuario estaba en la sala.
  
    this.subscription = this.roomService.getRoomById(this.roomId).subscribe(room => {
      if (!room) {
        console.error("Room not found:", this.roomId);
        this.snackBar.open("Room not found. Please check the room code.", "Close", { duration: 3000 });
        this.router.navigate(['/dashboard']);
        return;
      }
      
      this.room = room;
      this.participants = room.participants || [];

      this.selectedTheme = this.thematics.find(t => t.name === room.selectedThemeName) ?? null;
      this.thematics.forEach(theme => theme.selected = (theme.name === room.selectedThemeName));
      this.ref.detectChanges();
      
      const isParticipant = this.participants.some(p => p.userId === this.currentUserId);
  
      // Comprobar si el usuario ha sido eliminado después de estar en la sala.
      if (wasParticipant && !isParticipant) {
        this.snackBar.open("You have been removed from the room.", "Close", {duration: 3000});
        // Retrasar la redirección para que el usuario pueda leer el mensaje
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 3200) // Retraso de 3200 milisegundos (3.2 segundos)
      }
  
      wasParticipant = isParticipant; // Actualiza el estado de la participación para la próxima comprobación.
      this.ref.detectChanges(); // Actualizar la interfaz de usuario con los datos más recientes
    }, error => {
      console.error("Failed to fetch room:", error);
      this.snackBar.open("Failed to fetch room details. Please try again.", "Close", { duration: 3000 });
    });
  }  

  // Método para añadir participante con manejo de errores y confirmación de adición
  addParticipant(participant: Participant) {
    if (!this.roomId) return;
  
    this.roomService.getRoomById(this.roomId).subscribe(room => {
      if (!room) {  // Verifica que 'room' no sea null antes de continuar
        console.error("Room not found");
        return;
      }
  
      const isAlreadyParticipant = room.participants.some(p => p.userId === participant.userId);
      if (!isAlreadyParticipant) {
        this.roomService.addParticipant(this.roomId, participant)
          .then(() => {
            this.snackBar.open('Participant added successfully!', 'Close', { duration: 3000 });
            this.fetchRoom(); // Actualiza la lista de participantes
          })
          .catch(err => {
            console.error("Failed to add participant", err);
            this.snackBar.open('Failed to add participant. Please try again.', 'Close', { duration: 3000 });
          });
      } else {
        console.log("Participant already exists, not adding again.");
        this.fetchRoom(); // Solo actualiza la lista para asegurarse de que está sincronizada
      }
    });
  }
  


  
  // Método para recargar los datos de la sala y luego navegar al lobby
  fetchRoomDataAndNavigate() {
    this.roomService.getRoomById(this.roomId).subscribe(room => {
      if (room) {
        this.room = room;
        this.participants = room.participants;
        this.ref.detectChanges();
        // Redirección al lobby
        this.router.navigate(['/lobby', {id: this.roomId, username: this.username}]);
      }
    }, error => {
      console.error("Failed to fetch room data:", error);
      this.snackBar.open("Failed to fetch room data. Please try again.", 'Close', { duration: 3000 });
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

  onExitRoom(): void {
    if (!this.roomId) return;
  
    this.roomService.leaveRoom(this.roomId, this.currentUserId)
      .then((closedByHost) => {
          this.snackBar.open(closedByHost ? "Host has left, room closed." : "You have left the room.", "Close", {duration: 3000});
          // Limpiar datos locales
          this.participants = [];  // Asegura que la lista local de participantes se limpie
          this.room = null;  // Opcional, dependiendo de si deseas resetear los datos de la sala
          this.ref.detectChanges();
          /*this.router.navigate(['/dashboard']).then(() => {
            //window.location.reload();  // Considera recargar la página si es necesario para restablecer completamente el estado de la app
          });*/
      })
      .catch(error => {
          console.error("Error when trying to leave or close the room:", error);
          this.snackBar.open("Failed to leave or close the room. Please try again.", "Close", {duration: 3000});
      });
  }

  ExitToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

}
