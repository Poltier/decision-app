import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Question } from '../models/question';

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
  currentQuestionIndex = new BehaviorSubject<number>(0);

  constructor(private firestore: AngularFirestore) {
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

  loadQuestionsFromFirestoreByThematic(thematic: string): Promise<void> {
    if (!thematic) throw new Error('Thematic is undefined');
  
    return new Promise((resolve, reject) => {
      let query = this.firestore.collection<Question>('questions', ref => 
        ref.where('approved', '==', true).where('thematic', thematic !== 'Mix' ? '==' : '!=', thematic));
  
      query.valueChanges({ idField: 'id' })
        .pipe(
          tap(questions => {
            this.questions$.next(questions);
            resolve(); // Resolve the promise when questions are successfully loaded
          }),
          catchError(error => {
            reject(`Error loading thematic questions: ${error}`);
            return throwError(() => new Error(`Error loading thematic questions: ${error}`));
          })
        ).subscribe();
    });
  }
  
  
  getRandomUnansweredQuestion(): Observable<Question | undefined> {
    return this.questions$.pipe(
      map(questions => {
        const unansweredQuestions = questions.filter(question => {
          const questionId = question.id;  // Ensure id is defined
          return questionId && !this.answeredQuestions$.getValue().includes(questionId);
        });
        return unansweredQuestions.length === 0 ? undefined :
          unansweredQuestions[Math.floor(Math.random() * unansweredQuestions.length)];
      })
    );
  }

  answerQuestion(questionId: string, isCorrect: boolean, timedOut: boolean = false): void {
    this.answeredQuestions$.next([...this.answeredQuestions$.getValue(), questionId]);
    if (isCorrect) {
      this.score.next(this.score.getValue() + 1);
    }
    if (this.answeredQuestions$.getValue().length >= this.maxQuestions || timedOut) {
      this.gameFinished.next(true);
    }
  }
  
  getScore(): Observable<number> {
    return this.score.asObservable();
  }

  resetGame(): void {
    this.score.next(0);
    this.answeredQuestions$.next([]);
    this.gameFinished.next(false);
    this.resetScores();
  }

  resetScores(): void {
    this.scores.next({});
  }
}

