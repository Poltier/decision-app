import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Room, Participant } from '../models/room';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { FirebaseService } from './firebase.service';
import { Question } from '../models/question';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  defaultTimer: number = 10;
  maxQuestions: number = 10;

  constructor(
    private firestore: AngularFirestore,
    private authService: FirebaseService
  ) {}

  private generateRoomCode(): string {
    return Math.floor(10000 + Math.random() * 90000).toString();
  }

  private async isRoomCodeUnique(roomCode: string): Promise<boolean> {
    const roomDoc = await this.firestore.collection('rooms').doc(roomCode).get().toPromise();
    return roomDoc?.exists === false;
  }
  
  private async generateUniqueRoomCode(): Promise<string> {
    let roomCode = this.generateRoomCode();
    while (!(await this.isRoomCodeUnique(roomCode))) {
      roomCode = this.generateRoomCode();
    }
    return roomCode;
  }

  async createRoom(roomData: any): Promise<string> {
    const roomCode = await this.generateUniqueRoomCode();
    const newRoomData = {
      ...roomData,
      hostId: this.getCurrentUserIdOrGuest(),
      participants: [{ userId: this.getCurrentUserIdOrGuest(), username: roomData.username }],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      gameStarted: false,
      currentQuestionIndex: 0,
      timer: 10
    };

    await this.firestore.collection('rooms').doc(roomCode).set(newRoomData);
    sessionStorage.setItem('currentRoomId', roomCode);
    return roomCode;
  }

  async leaveRoom(roomId: string, userId: string): Promise<boolean> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();

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

  async closeRoom(roomId: string): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).delete();
    this.cleanUpSessionStorage();
  }

  async startGame(roomId: string, questions: Question[]): Promise<void> {
    const questionsWithIndex = questions.map((q, index) => ({ ...q, index }));
    await this.firestore.collection('rooms').doc(roomId).update({ gameStarted: true, questions: questionsWithIndex });
    await this.startTimer(roomId);
  }

  private async startTimer(roomId: string) {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    roomRef.update({ timer: this.defaultTimer });

    let roomDoc = await roomRef.get().toPromise();
    let room = roomDoc?.data() as Room;

    if (room.hostId === this.getCurrentUserIdOrGuest()) {
      const interval = setInterval(async () => {
        roomDoc = await roomRef.get().toPromise();
        room = roomDoc?.data() as Room;
        if (room && room.timer !== undefined && room.timer > 0) {
          roomRef.update({ timer: room.timer - 1 });
        }
        if (!room || !room.gameStarted) {
          clearInterval(interval);
          this.markCorrectAnswerAndSimulateResponses(roomId);
        }
      }, 1000);
    }
  }

  private async markCorrectAnswerAndSimulateResponses(roomId: string) {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();
    const room = roomDoc?.data() as Room;
    if (room && room.questions && room.currentQuestionIndex !== undefined) {
      const currentQuestion = room.questions[room.currentQuestionIndex];
      if (currentQuestion) {
        currentQuestion.options.forEach(option => {
          if (option.isCorrect) {
            option.correct = true;
          }
        });

        await roomRef.update({ questions: room.questions });
      }
    }
  }

  async setGameStarted(roomId: string, gameStarted: boolean): Promise<void> {
    await this.firestore.collection('rooms').doc(roomId).update({ gameStarted });
  }

  async answerQuestion(roomId: string, userId: string, isCorrect: boolean): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();

    if (!roomDoc || !roomDoc.exists) {
      throw new Error("Room not found");
    }

    const room = roomDoc.data() as Room;

    if (isCorrect) {
      const participant = room.participants.find(p => p.userId === userId);
      if (participant) {
        participant.score = (participant.score || 0) + 1;
      }
    }

    await roomRef.update({ participants: room.participants });
  }

  getRoomById(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).valueChanges().pipe(
      map(room => {
        return room ? { ...room, isHost: room.hostId === this.getCurrentUserIdOrGuest() } : null;
      })
    );
  }

  getRoomByIdentifier(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).get().pipe(
      map(doc => {
        let room = { id: doc.id, ...doc.data() as Room };
        return room ? { ...room, isHost: room.hostId === this.getCurrentUserIdOrGuest() } : null;
      })
    );
  }

  watchGameStarted(roomId: string): Observable<boolean> {
    return this.firestore.doc(`rooms/${roomId}`).snapshotChanges().pipe(
      map(action => {
        const data = action.payload.data() as Room;
        return data ? data.gameStarted : false;
      })
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

  async updateTimerAndQuestionIndex(roomId: string, timer: number, questionIndex: number): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();
    const room = roomDoc?.data() as Room;

    if (room && room.questions && room.hostId === this.getCurrentUserIdOrGuest()) {
      await roomRef.update({
        timer: timer,
        currentQuestionIndex: questionIndex
      });
      console.log("Actualizando nuevo indice de pregunta: " + questionIndex);
    }
  }

  getGameState(roomId: string): Observable<{ timer: number, currentQuestionIndex: number, isFinished: boolean }> {
    const roomRef = this.firestore.collection<Room>('rooms').doc(roomId);
    // Obtener el estado del documento y combinarlo con los cambios en tiempo real
    return roomRef.snapshotChanges().pipe(
      map(action => {
        const data = action.payload.data() as Room;
        const currentRoom = data || {};
        return {
          timer: currentRoom.timer ?? this.defaultTimer,
          currentQuestionIndex: currentRoom.currentQuestionIndex ?? 0,
          isFinished: (currentRoom.questions && currentRoom.currentQuestionIndex != undefined && (currentRoom.currentQuestionIndex >= currentRoom.questions.length || currentRoom.currentQuestionIndex >= this.maxQuestions)) ?? false
        };
      })
    );
  }

  async resetRoom(roomId: string): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();

    if (!roomDoc || !roomDoc.exists) {
      throw new Error("Room not found");
    }

    const room = roomDoc.data() as Room;
    const updatedParticipants = room.participants.map(participant => ({
      ...participant,
      score: 0
    }));

    await roomRef.update({
      participants: updatedParticipants,
      currentQuestionIndex: 0,
      questions: []
    });
  }
}
