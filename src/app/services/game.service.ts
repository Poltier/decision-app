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

  constructor(private firestore: AngularFirestore) {
    this.loadQuestionsFromFirestore();
  }

  private loadQuestionsFromFirestore() {
    this.firestore.collection<Question>('questions').valueChanges({ idField: 'id' })
      .subscribe(questions => this.questions$.next(questions));
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
    this.score.next(this.score.getValue() + (isCorrect ? 1 : -1));
  }

  getScore(): Observable<number> {
    return this.score.asObservable();
  }

  resetGame() {
    this.score.next(0);
    this.answeredQuestions$.next([]);
  }
}

