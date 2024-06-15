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
  private questions$ = new BehaviorSubject<Question[]>([]);
  private answeredQuestions$ = new BehaviorSubject<string[]>([]);
  private gameFinished = new BehaviorSubject<boolean>(false);
  private currentQuestionIndex = new BehaviorSubject<number>(0);

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

  loadQuestionsFromFirestoreByThematic(thematic: string): Promise<Question[]> {
    if (!thematic) throw new Error('Thematic is undefined');
  
    return new Promise((resolve, reject) => {
      let query = this.firestore.collection<Question>('questions', ref => {
        let queryRef = ref.where('approved', '==', true);
        if (thematic !== 'Mix') {
          queryRef = queryRef.where('thematic', '==', thematic);
        }
        return queryRef;
      });
  
      query.valueChanges({ idField: 'id' })
        .pipe(
          tap(questions => {
            const shuffledQuestions = this.shuffleArray(questions).slice(0, 5);
            this.questions$.next(shuffledQuestions);
            resolve(shuffledQuestions);
          }),
          catchError(error => {
            reject(`Error loading thematic questions: ${error}`);
            return throwError(() => new Error(`Error loading thematic questions: ${error}`));
          })
        ).subscribe();
    });
  }

  private shuffleArray(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getQuestionByIndex(roomIdOrIndex: string | number, index?: number): Observable<Question | undefined> {
    if (typeof roomIdOrIndex === 'string' && index !== undefined) {
      return this.roomService.getRoomByIdentifier(roomIdOrIndex).pipe(
        map(room => {
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

 
  getScore(): Observable<number> {
    return this.score.asObservable();
  }

  resetGame(): void {
    this.score.next(0);
    this.answeredQuestions$.next([]);
    this.gameFinished.next(false);
    this.currentQuestionIndex.next(0);
  }
}







