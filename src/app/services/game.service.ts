import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Question } from '../models/question';
import { RoomService } from './room.service';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private score = new BehaviorSubject<number>(0);
  private scores = new BehaviorSubject<{[key: string]: number}>({});
  private questions$ = new BehaviorSubject<Question[]>([]);
  private answeredQuestions$ = new BehaviorSubject<string[]>([]);
  private maxQuestions = 10; // Limit of questions
  private gameFinished = new BehaviorSubject<boolean>(false);
  private currentQuestionIndex = new BehaviorSubject<number>(0); // Initialize currentQuestionIndex

  constructor(private firestore: AngularFirestore, private roomService: RoomService) {
    this.loadAllApprovedQuestions();
  }

  loadAllApprovedQuestions(): void {
    this.firestore.collection<Question>('questions', ref => ref.where('approved', '==', true))
        .valueChanges({ idField: 'id' })
        .pipe(
          tap(questions => this.questions$.next(questions)),
          catchError(error => throwError(() => new Error(`Error loading questions: ${error}`)))
        ).subscribe();
  }

  setScoreForUser(userId: string, score: number) {
    const currentScores = this.scores.getValue();
    currentScores[userId] = score;
    this.scores.next(currentScores);
  }

  startNewGame(): void {
    this.resetGame();
    this.resetScores();
  }

  loadQuestionsFromFirestoreByThematic(thematic: string): Promise<Question[]> {
    if (!thematic) throw new Error('Thematic is undefined');
  
    return new Promise((resolve, reject) => {
      let query = this.firestore.collection<Question>('questions', ref => 
        ref.where('approved', '==', true).where('thematic', thematic !== 'Mix' ? '==' : '!=', thematic));
  
      query.valueChanges({ idField: 'id' })
        .pipe(
          tap(questions => {
            this.questions$.next(questions);
            resolve(questions); // Resolve the promise with questions
          }),
          catchError(error => {
            reject(`Error loading thematic questions: ${error}`);
            return throwError(() => new Error(`Error loading thematic questions: ${error}`));
          })
        ).subscribe();
    });
  }

  setQuestions(questions: Question[]): void {
    this.questions$.next(questions);
  }

  getCurrentQuestionIndex(): Observable<number> {
    return this.currentQuestionIndex.asObservable();
  }

  getQuestionByIndex(roomIdOrIndex: string | number, index?: number): Observable<Question | undefined> {
    if (typeof roomIdOrIndex === 'string' && index !== undefined) {
      console.log("getQuestionByIndex - roomId:", roomIdOrIndex, "index:", index);
      return this.roomService.getRoomByIdentifier(roomIdOrIndex).pipe(
        map(room => {
          console.log("getQuestionByIndex - room:", room);
          return room?.questions?.find(q => q.index === index);
        })
      );
    } else {
      const questionIndex = typeof roomIdOrIndex === 'number' ? roomIdOrIndex : index;
      if (questionIndex === undefined) {
        return new BehaviorSubject<Question | undefined>(undefined).asObservable();
      }
      return this.questions$.pipe(
        map(questions => questions[questionIndex])
      );
    }
  }

  answerQuestion(roomId: string, questionId: string, userId: string, isCorrect: boolean, timedOut: boolean = false): Promise<void> {
    return this.roomService.answerQuestion(roomId, userId, isCorrect).then(() => {
      this.answeredQuestions$.next([...this.answeredQuestions$.getValue(), questionId]);
      if (isCorrect) {
        this.score.next(this.score.getValue() + 1);
      }
      return this.checkAllAnswered(roomId, timedOut);
    });
  }

  private checkAllAnswered(roomId: string, timedOut: boolean): Promise<void> {
    return this.roomService.getRoomById(roomId).toPromise().then(room => {
      if (!room) {
        throw new Error("Room not found");
      }
      const allAnswered = Object.values(room.answersReceived).every(answered => answered);
      if (allAnswered || timedOut) {
        this.resetAnswers(roomId).then(() => {
          if (this.answeredQuestions$.getValue().length >= this.maxQuestions) {
            this.gameFinished.next(true);
          } else {
            const nextIndex = this.currentQuestionIndex.getValue() + 1;
            this.roomService.updateTimerAndQuestionIndex(roomId, this.roomService.defaultTimer, nextIndex).then(() => {
              this.currentQuestionIndex.next(nextIndex);
            });
          }
        });
      }
    });
  }

  private resetAnswers(roomId: string): Promise<void> {
    return this.roomService.resetAnswers(roomId);
  }

  getScore(): Observable<number> {
    return this.score.asObservable();
  }

  resetGame(): void {
    this.score.next(0);
    this.answeredQuestions$.next([]);
    this.gameFinished.next(false);
    this.resetScores();
    this.currentQuestionIndex.next(0);
  }

  resetScores(): void {
    this.scores.next({});
  }
}







