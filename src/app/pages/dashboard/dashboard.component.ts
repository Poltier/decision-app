import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { RoomService } from '../../services/room.service';
import { MatSnackBar } from '@angular/material/snack-bar';

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
    if (this.form.invalid) {
        this.snackBar.open("Please ensure all fields are correctly filled.", "Close", {duration: 3000});
        return;
    }

    const username = this.form.value.username.trim();
    const roomCode = this.form.value.roomCode.trim();

    if (mode === 'join') {
        if (!roomCode) {
            this.snackBar.open("Please enter a room code to join.", "Close", {duration: 3000});
            return;
        }

        // First, check for the room's existence and status
        this.roomService.getRoomById(roomCode).subscribe(room => {
            if (!room) {
                this.snackBar.open("Room not found. Please check the room code.", "Close", {duration: 3000});
                return;
            }
            if (room.gameStarted) {
                this.snackBar.open("Game has already started. You cannot join this room.", "Close", {duration: 3000});
                return;
            }
            if (room.participants.length >= room.maxPlayers) {
                this.snackBar.open("The room is full. Please try another room.", "Close", {duration: 3000});
                return;
            }
            if (room.participants.some(p => p.username.toLowerCase() === username.toLowerCase())) {
                this.snackBar.open("This username is already taken in this room. Please choose another one.", "Close", {duration: 3000});
                return;
            }

            // Navigate only if username is available and the room is not full or started
            this.router.navigate(['/lobby', { id: roomCode, username, isHost: false }]);
        }, error => {
            console.error("Failed to get room details:", error);
            this.snackBar.open("Failed to check room details. Please try again.", "Close", {duration: 3000});
        });
    } else if (mode === 'create') {
        this.router.navigate(['/lobby', { username, createNew: true }]);
    } else {
        this.router.navigate(['/lobby', { username, soloPlay: true }]);
    }
}


}
