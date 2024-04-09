import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Question } from '../models/question';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private score = new BehaviorSubject<number>(0);
  private questions$ = new BehaviorSubject<Question[]>([]);
  private answeredQuestions$ = new BehaviorSubject<string[]>([]);
  private maxQuestions = 10; // Límite de preguntas
  private gameFinished = new BehaviorSubject<boolean>(false); // Para controlar el fin del juego

  constructor(private firestore: AngularFirestore) {
    this.loadAllApprovedQuestions();
  }

  loadAllApprovedQuestions() {
    this.firestore.collection<Question>('questions', ref => ref.where('approved', '==', true))
      .valueChanges({ idField: 'id' })
      .subscribe(questions => this.questions$.next(questions));
  }  

  loadQuestionsFromFirestoreByThematic(thematic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!thematic) {
        reject('Thematic is undefined');
        return;
      }
      this.firestore.collection<Question>('questions', ref => ref
        .where('thematic', '==', thematic)
        .where('approved', '==', true))
        .valueChanges({ idField: 'id' })
        .subscribe(questions => {
          this.questions$.next(questions);
          resolve();
        }, error => reject(error));
    });
  }
  
  getQuestions(): Observable<Question[]> {
    return this.questions$.asObservable();
  }

  getRandomUnansweredQuestion(): Observable<Question | undefined> {
    return this.questions$.pipe(
      map(questions => {
        const unansweredQuestions = questions.filter(question => 
          !this.answeredQuestions$.getValue().includes(question.id!));
        if (unansweredQuestions.length === 0) return undefined;
        const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
        return unansweredQuestions[randomIndex];
      })
    );
  }

  answerQuestion(questionId: string, isCorrect: boolean) {
    this.answeredQuestions$.next([...this.answeredQuestions$.getValue(), questionId]);
    if (isCorrect) {
      this.score.next(this.score.getValue() + 1);
    }
    if (this.answeredQuestions$.getValue().length >= this.maxQuestions) {
      this.gameFinished.next(true);
    } else {
      this.getRandomUnansweredQuestion().subscribe(question => {
        if (!question) {
          this.gameFinished.next(true);
        }
      });
    }
  }

  getScore(): Observable<number> {
    return this.score.asObservable();
  }

  isGameFinished(): Observable<boolean> {
    return this.gameFinished.asObservable();
  }

  resetGame() {
    this.score.next(0);
    this.answeredQuestions$.next([]);
    this.gameFinished.next(false);
  }
}

