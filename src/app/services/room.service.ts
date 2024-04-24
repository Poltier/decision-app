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
  async createRoom(roomData: any): Promise<string> {
    const newRoomData = {
      ...roomData,
      hostId: this.getCurrentUserIdOrGuest(),
      participants: [{userId: this.getCurrentUserIdOrGuest(), username: roomData.username}],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      gameStarted: false
    };

    const docRef = await this.firestore.collection('rooms').add(newRoomData);
    localStorage.setItem('currentRoomId', docRef.id);
    return docRef.id;
  }

  async closeRoom(roomId: string): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).delete();
    console.log(`Room ${roomId} closed and all participants should be redirected.`);
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();

    if (!roomDoc?.exists) {
      console.error("Room not found or already closed:", roomId);
      return true;  // Indicar que la sala ya no existe, adecuado para la redirección
    }

    if (!roomDoc.exists) {
      console.error("Room not found or already closed:", roomId);
      this.cleanUpSessionStorage();  // Limpieza cuando la sala no se encuentra o ya está cerrada
      return true;
    }

    const room = roomDoc.data() as Room;
    if (room.hostId === userId) {
      await this.closeRoom(roomId);
      this.cleanUpSessionStorage();  // Limpieza cuando el host abandona y cierra la sala
      return true;
    } else {
      const participantToRemove = room.participants.find(p => p.userId === userId);
      if (participantToRemove) {
          await roomRef.update({
              participants: firebase.firestore.FieldValue.arrayRemove(participantToRemove)
          });
          console.log(`Participant ${userId} left the room ${roomId}.`);
          this.cleanUpSessionStorage();  // Limpieza cuando un participante no anfitrión abandona
          return false;
      }
      console.error("Participant not found in room:", userId);
      throw new Error("Participant not found");
    }
  }

  private cleanUpSessionStorage() {
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('roomId');
  }
  
  async startGame(roomId: string): Promise<void> {
    try {
      await this.firestore.collection('rooms').doc(roomId).update({ gameStarted: true });
    } catch (err) {
      console.error("Error starting game:", err);
      throw err;
    }
  }  

  // Fetches room data and determines if the current user is the host
// RoomService
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
    return this.firestore.collection('rooms').doc<Room>(roomId).valueChanges().pipe(
      map(room => room ? room.gameStarted : false)
    );
  }

  setSelectedThemeForRoom(roomId: string, themeName: string): Promise<void> {
    return this.firestore.collection('rooms').doc(roomId).update({
      selectedThemeName: themeName
    });
  }

  getCurrentUserIdOrGuest(): string {
    let userId = sessionStorage.getItem('userId');
    const currentUser = this.authService.getAuthCurrentUser();
    if (currentUser) {
      userId = currentUser.uid;
      sessionStorage.setItem('userId', userId);
    } else if (!userId) {
      userId = `guest_${Math.random().toString(36).substring(2)}_${Date.now()}`;
      sessionStorage.setItem('userId', userId);
    }
    return userId;
  }

  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    try {
      const result = await this.firestore.collection('rooms').doc(roomId).update({
        participants: firebase.firestore.FieldValue.arrayUnion(participant)
      });
      console.log("Participant added:", participant, "to Room ID:", roomId, "Result:", result);
      // Deberías ver el resultado de esta operación para confirmar que se completa correctamente
    } catch (err) {
      console.error("Failed to add participant:", err);
      throw err;
    }
  }  
  
  async removeParticipant(roomId: string, participant: Participant): Promise<void> {
    try {
      const roomRef = this.firestore.collection('rooms').doc(roomId);
      await roomRef.update({
        participants: firebase.firestore.FieldValue.arrayRemove(participant)
      });
      console.log("Participant removed:", participant.username, "from Room ID:", roomId);
    } catch (err) {
      console.error("Error removing participant:", err);
      throw err;
    }
  }

}


