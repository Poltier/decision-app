import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentSnapshot } from '@angular/fire/compat/firestore';
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

  async createRoom(roomData: any): Promise<string> {
    const newRoomData = {
      ...roomData,
      hostId: this.getCurrentUserIdOrGuest(),
      participants: [{userId: this.getCurrentUserIdOrGuest(), username: roomData.username}],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      gameStarted: false
    };

    const docRef = await this.firestore.collection('rooms').add(newRoomData);
    sessionStorage.setItem('currentRoomId', docRef.id);
    return docRef.id;
  }

  async closeRoom(roomId: string): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).delete();
    this.cleanUpSessionStorage();
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();

    // Check if the roomDoc is defined and exists
    if (!roomDoc || !roomDoc.exists) {
      console.error("Room not found or already closed:", roomId);
      this.cleanUpSessionStorage();
      return true;
    }

    const room = roomDoc.data() as Room;
    if (room.hostId === userId) {
      await this.closeRoom(roomId);
      return true;
    }

    const participantIndex = room.participants.findIndex(p => p.userId === userId);
    if (participantIndex > -1) {
      room.participants.splice(participantIndex, 1);
      await roomRef.update({ participants: room.participants });
      this.cleanUpSessionStorage();
      return false;
    }

    throw new Error("Participant not found");
  }

  async startGame(roomId: string): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).update({ gameStarted: true });
  }

  async restartGame(roomId: string, userId: string): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const doc = await roomRef.get().toPromise();

    if (!doc || !doc.exists) {
      throw new Error("Room not found");
    }

    const room = doc.data() as Room;
    if (room.hostId !== userId) {
      throw new Error("Only the host can restart the game");
    }

    await roomRef.update({
      gameStarted: false,
      participants: [],
      currentRound: 0,
      scores: {}
    });
  }

  async setGameStarted(roomId: string, gameStarted: boolean): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).update({ gameStarted });
  }  

  getRoomById(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).valueChanges().pipe(
      map(room => room ? {...room, isHost: room.hostId === this.getCurrentUserIdOrGuest()} : null)
    );
  }

  getRoomByIdentifier(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).get().pipe(
      map(doc =>{
        let room = { id: doc.id, ...doc.data() as Room };
         return room ? {...room, isHost: room.hostId === this.getCurrentUserIdOrGuest()} : null
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

  private cleanUpSessionStorage(): void {
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('currentRoomId');
  }

  async addParticipant(roomId: string, participant: Participant): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    await roomRef.update({
      participants: firebase.firestore.FieldValue.arrayUnion(participant)
    });
  }

  async removeParticipant(roomId: string, participant: Participant): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    await roomRef.update({
      participants: firebase.firestore.FieldValue.arrayRemove(participant)
    });
  }
}








