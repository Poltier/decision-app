import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { RoomService } from '../../services/room.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  roomCode: string = '';
  username: string = '';

  constructor(
    private router: Router, 
    private firebaseService: FirebaseService, 
    private roomService: RoomService,
    private snackBar: MatSnackBar
  ) {}

  isLoggedIn(): boolean {
    return this.firebaseService.isAuthenticated();
  }

  navigateToLobby(mode: string) {
    if (!this.username) {
      this.snackBar.open("Please enter a username.", "Close", {duration: 3000});
      return;
    }
  
    const baseParams = { username: this.username, soloPlay: mode === 'solo' };
  
    if (mode === 'join') {
      if (!this.roomCode.trim()) {
        this.snackBar.open("Please enter a room code to join.", "Close", {duration: 3000});
        return;
      }
      // Check if the username is available in the room before navigating
      this.roomService.isUsernameAvailable(this.roomCode, this.username).subscribe(isAvailable => {
        if (isAvailable) {
          this.router.navigate(['/lobby', {...baseParams, id: this.roomCode, isHost: false}]);
        } else {
          this.snackBar.open("This username is already taken in this room. Please choose another one.", "Close", {duration: 3000});
        }
      }, error => {
        console.error('Error checking username availability:', error);
        this.snackBar.open("Failed to check username availability. Please try again later.", "Close", {duration: 3000});
      });
    } else if (mode === 'create') {
      this.router.navigate(['/lobby', { ...baseParams, createNew: true }]);
    } else {
      this.router.navigate(['/lobby', { ...baseParams, soloPlay: true }]);
    }
  }
}
