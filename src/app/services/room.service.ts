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
      gameStarted: false,
      answersReceived: {},
      currentQuestionIndex: 0,
      timer: 10
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

  async startGame(roomId: string, questions: Question[]): Promise<void> {
    const questionsWithIndex = questions.map((q, index) => ({ ...q, index }));
    await this.firestore.collection('rooms').doc(roomId).update({ gameStarted: true, questions: questionsWithIndex });
    this.startTimer(roomId);
  }

  private startTimer(roomId: string) {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    roomRef.update({ timer: this.defaultTimer });
    const interval = setInterval(async () => {
      const roomDoc = await roomRef.get().toPromise();
      const room = roomDoc?.data() as Room;
      if (room && room.timer !== undefined && room.timer > 0) {
        roomRef.update({ timer: room.timer - 1 });
      } else {
        clearInterval(interval);
        this.markCorrectAnswerAndSimulateResponses(roomId);
      }
    }, 1000);
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

        room.participants.forEach(participant => {
          if (!room.answersReceived[participant.userId]) {
            room.answersReceived[participant.userId] = true; // Marcar la respuesta como recibida
          }
        });

        await roomRef.update({ answersReceived: room.answersReceived, questions: room.questions });
        setTimeout(() => {
          const nextIndex = (room.currentQuestionIndex ?? 0) + 1;
          this.updateTimerAndQuestionIndex(roomId, this.defaultTimer, nextIndex);
        }, 6000);
      }
    }
  }

  async setQuestionsForRoom(roomId: string, questions: Question[]): Promise<void> {
    const questionsWithIndex = questions.map((q, index) => ({ ...q, index }));
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    await roomRef.update({ questions: questionsWithIndex });
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
      scores: {},
      answersReceived: {},
      currentQuestionIndex: 0,
      timer: 10
    });
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
    room.answersReceived = room.answersReceived || {};
    room.answersReceived[userId] = true;
  
    if (isCorrect) {
      const participant = room.participants.find(p => p.userId === userId);
      if (participant) {
        participant.score = (participant.score || 0) + 1;
      }
    }
  
    await roomRef.update({ answersReceived: room.answersReceived, participants: room.participants });
  }

  getAnswers(roomId: string): Observable<{ [key: string]: boolean }> {
    const roomRef = this.firestore.collection<Room>('rooms').doc(roomId);
    return roomRef.valueChanges().pipe(
      map((room: Room | undefined) => {
        console.log("getAnswers - room:", room);
        return room ? room.answersReceived : {};
      })
    );
  }

  async resetAnswers(roomId: string): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    await roomRef.update({ answersReceived: {} });
  }

  getRoomById(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).valueChanges().pipe(
      map(room => {
        console.log("getRoomById - room:", room);
        return room ? {...room, isHost: room.hostId === this.getCurrentUserIdOrGuest()} : null
      })
    );
  }

  getRoomByIdentifier(id: string): Observable<Room | null> {
    return this.firestore.collection<Room>('rooms').doc(id).get().pipe(
      map(doc => {
        let room = { id: doc.id, ...doc.data() as Room };
        console.log("getRoomByIdentifier - room:", room);
        return room ? {...room, isHost: room.hostId === this.getCurrentUserIdOrGuest()} : null
      })
    );
  }

  async updateAnswersReceived(roomId: string, userId: string, received: boolean): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();
  
    if (!roomDoc || !roomDoc.exists) {
      throw new Error("Room not found");
    }
  
    const room = roomDoc.data() as Room;
    room.answersReceived = room.answersReceived || {};
    room.answersReceived[userId] = received;
  
    await roomRef.update({ answersReceived: room.answersReceived });
  }

  watchGameStarted(roomId: string): Observable<boolean> {
    return this.firestore.collection('rooms').doc<Room>(roomId).valueChanges().pipe(
      map(room => {
        console.log("watchGameStarted - room:", room);
        return room ? room.gameStarted : false;
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

  async initializeGame(roomId: string): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    await roomRef.update({
      currentQuestionIndex: 0,
      timer: 10
    });
  }

  async updateTimerAndQuestionIndex(roomId: string, timer: number, questionIndex: number): Promise<void> {
    const roomRef = this.firestore.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get().toPromise();
    const room = roomDoc?.data() as Room;
  
    if (room && room.questions && questionIndex < room.questions.length) {
      await roomRef.update({
        timer: timer,
        currentQuestionIndex: questionIndex,
        answersReceived: {}
      });
      this.startTimer(roomId);
    } else {
      await roomRef.update({
        gameStarted: false,
        timer: this.defaultTimer
      });
    }
  }

  getGameState(roomId: string): Observable<{ timer: number, currentQuestionIndex: number }> {
    const roomRef = this.firestore.collection<Room>('rooms').doc(roomId);
    return roomRef.valueChanges().pipe(
      map(room => ({
        timer: room?.timer ?? this.defaultTimer,
        currentQuestionIndex: room?.currentQuestionIndex ?? 0
      }))
    );
  }
}





