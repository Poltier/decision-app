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
  
    // Verifica si la sala existe o ya está cerrada.
    if (!roomDoc?.exists) {
      console.error("Room not found or already closed:", roomId);
      this.cleanUpSessionStorage();  // Limpia los datos de sesión si la sala no existe.
      return true;  // Indica que la sala ya no existe, adecuado para la redirección.
    }
  
    const room = roomDoc.data() as Room;
    // Si el usuario es el host, cierra la sala.
    if (room.hostId === userId) {
      await this.closeRoom(roomId);
      this.cleanUpSessionStorage();
      return true;  // Retorna true para indicar que la sala fue cerrada por el host.
    }
  
    // Encuentra al participante y remuévelo.
    const participantIndex = room.participants.findIndex(p => p.userId === userId);
    if (participantIndex > -1) {
      room.participants.splice(participantIndex, 1);
      await roomRef.update({
        participants: room.participants
      });
      console.log(`Participant ${userId} left the room ${roomId}.`);
      this.cleanUpSessionStorage();
      return false;  // Retorna false indicando que el usuario dejó la sala, pero no la cerró.
    }
  
    console.error("Participant not found in room:", userId);
    throw new Error("Participant not found");  // Mantiene el lanzamiento de una excepción si el participante no se encuentra.
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

  async restartGame(roomId: string, userId: string): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const doc = await roomRef.get().toPromise();
  
    if (!doc || !doc.exists) {  // Asegúrate de que 'doc' no sea undefined y de que el documento exista
      throw new Error("Room not found");
    }
  
    const room = doc.data() as Room;
    if (room.hostId !== userId) {
      throw new Error("Only the host can restart the game");
    }
  
    // Restablece participantes y otros estados del juego
    await roomRef.update({
      gameStarted: false,
      participants: [],  // Considera cómo manejar los participantes durante el reinicio
      currentRound: 0,
      scores: {}
    });
  }
  

  // Fetches room data and determines if the current user is the host
  // RoomService
  getRoomById(id: string): Observable<Room | null> {
  return this.firestore.collection<Room>('rooms').doc(id).valueChanges().pipe(
    map(room => {
      if (room) {
        console.log(`Room data retrieved for ID: ${id}`, room);
        room.isHost = room.hostId === this.getCurrentUserIdOrGuest(); // Determinar si el usuario actual es el host
        return room;
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


