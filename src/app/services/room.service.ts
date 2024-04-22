import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Room, Participant } from '../models/room';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  constructor(
    private firestore: AngularFirestore,
    private authService: FirebaseService
  ) {}

  // Method to create a new room and return the generated Room ID
  createRoom(roomData: any): Promise<string> {
    const newRoomData = {
      ...roomData,
      hostId: this.getCurrentUserIdOrGuest(),
      participants: [{userId: this.getCurrentUserIdOrGuest(), username: roomData.username}],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      gameStarted: false
    };
    return this.firestore.collection('rooms').add(newRoomData)
      .then(docRef => {
        console.log("Room created with ID:", docRef.id); // Log for debugging
        return docRef.id;
      })
      .catch(error => {
        console.error("Error creating room:", error);
        throw error;
      });
  }

  startGame(roomId: string): Promise<void> {
    console.log(`Attempting to start game for room ID: ${roomId}`);
    return this.firestore.collection('rooms').doc(roomId).update({
        gameStarted: true
    }).then(() => {
        console.log("Game started successfully for all players in room ID:", roomId);
    }).catch(err => {
        console.error("Error starting game:", err);
        throw err;
    });
  }

  // Fetches room data and determines if the current user is the host
  getRoomById(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).snapshotChanges().pipe(
        map(action => {
            const data = action.payload.data() as Room;
            if (data) {
              console.log(`Room data retrieved for ID: ${id}`, data);
              data.isHost = data.hostId === this.getCurrentUserIdOrGuest();
              return data;
            }
            return null;
        })
    );
  }

  watchGameStarted(roomId: string): Observable<boolean> {
    console.log(`Watching game start status for Room ID: ${roomId}`);
    return this.firestore.collection('rooms').doc<Room>(roomId).valueChanges().pipe(
        map(room => {
            console.log(`Current game start status for Room ID: ${roomId}:`, room?.gameStarted);
            return room ? room.gameStarted : false;
        })
    );
  }

  // Generates a unique ID for guests or returns the user ID if logged in
  getCurrentUserIdOrGuest(): string {
    const currentUser = this.authService.getAuthCurrentUser();
    if (currentUser) {
      return currentUser.uid;  // Use Firebase Auth UID if logged in
    } else {
      // Generate a guest user ID if not logged in
      let guestId = sessionStorage.getItem('userId');
      if (!guestId) {
        guestId = `guest_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        sessionStorage.setItem('userId', guestId);
      }
      return guestId;
    }
  }

  addParticipant(roomId: string, participant: Participant): Promise<void> {
    return this.firestore.collection('rooms').doc(roomId).update({
      participants: firebase.firestore.FieldValue.arrayUnion(participant)
    }).then(() => {
      console.log("Participant added:", participant, "to Room ID:", roomId);
    }).catch(err => {
      console.error("Failed to add participant:", err);
      throw err;
    });
  }

  removeParticipant(roomId: string, participant: Participant): Promise<void> {
    return this.firestore.collection('rooms').doc(roomId).update({
      participants: firebase.firestore.FieldValue.arrayRemove(participant)
    });
  }

  getParticipants(roomId: string): Observable<Participant[]> {
    return this.firestore.collection<Room>('rooms').doc(roomId).valueChanges().pipe(
      map(room => room && room.participants ? room.participants as Participant[] : [])
    );
  }
}


