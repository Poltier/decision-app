import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { RoomService } from '../../services/room.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Room, Participant } from '../../models/room';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router, 
    private firebaseService: FirebaseService, 
    private roomService: RoomService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(20)]],
      roomCode: ['', Validators.maxLength(20)]
    });
  }

  isLoggedIn(): boolean {
    return this.firebaseService.isAuthenticated();
  }

  navigateToLobby(mode: string) {
    if (this.validateForm(mode)) {
      const username = this.form.value.username.trim();
      const roomCode = this.form.value.roomCode.trim();
      this.processRoomEntry(mode, username, roomCode);
    }
  }

  private validateForm(mode: string): boolean {
    if (this.form.invalid) {
      this.openSnackBar("Please ensure all fields are correctly filled.", 3000);
      return false;
    }

    if (mode === 'join' && !this.form.value.roomCode.trim()) {
      this.openSnackBar("Please enter a room code to join.", 3000);
      return false;
    }

    return true;
  }

  private processRoomEntry(mode: string, username: string, roomCode: string) {
    if (mode === 'join') {
      this.joinRoom(username, roomCode);
    } else {
      this.router.navigate(['/lobby', mode === 'create' ? { username, createNew: true } : { username, soloPlay: true }]);
    }
  }

  private joinRoom(username: string, roomCode: string) {
    this.roomService.getRoomById(roomCode).subscribe((room: Room | null) => {
      if (!room || room.gameStarted || room.participants.length >= room.maxPlayers ||
          room.participants.some((p: Participant) => p.username.toLowerCase() === username.toLowerCase())) {
        this.handleRoomEntryErrors(room, username);
      } else {
        this.router.navigate(['/lobby', { id: roomCode, username, isHost: false }]);
      }
    }, error => {
      console.error("Failed to get room details:", error);
      this.openSnackBar("Failed to check room details. Please try again.", 3000);
    });
  }
  
  private handleRoomEntryErrors(room: Room | null, username: string) {
    if (!room) {
      this.openSnackBar("Room not found. Please check the room code.", 3000);
      return;
    }

    if (room.gameStarted) {
      this.openSnackBar("Game has already started. You cannot join this room.", 3000);
    } else if (room.participants.length >= room.maxPlayers) {
      this.openSnackBar("The room is full. Please try another room.", 3000);
    } else if (room.participants.some((p: Participant) => p.username.toLowerCase() === username.toLowerCase())) {
      this.openSnackBar("This username is already taken in this room. Please choose another one.", 3000);
    }
  }  

  private openSnackBar(message: string, duration: number) {
    this.snackBar.open(message, "Close", { duration });
  }
}

