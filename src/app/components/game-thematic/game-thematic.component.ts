import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question, QuestionOption } from '../../models/question';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-game-thematic',
  templateUrl: './game-thematic.component.html',
  styleUrls: ['./game-thematic.component.css']
})
export class GameThematicComponent implements OnInit, OnDestroy {
  currentQuestion?: Question;
  score: number = 0;
  private unsubscribe$ = new Subject<void>();
  gameFinished: boolean = false;

  constructor(private gameService: GameService, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.gameService.resetGame();
    this.getNextQuestion();
    this.gameService.getScore().subscribe(score => this.score = score);
    this.gameService.isGameFinished().subscribe(finished => this.gameFinished = finished);
    this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const thematic = params['type'];
      if (thematic && thematic !== 'mix') {
        this.gameService.loadQuestionsFromFirestoreByThematic(thematic);
      } else {
        this.gameService.loadAllApprovedQuestions();
      }
      this.restartGame();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  onOptionSelected(option: QuestionOption): void {
    if (this.currentQuestion) {
      this.gameService.answerQuestion(this.currentQuestion.id!, option.isCorrect);
      this.getNextQuestion();
    }
  }

  private getNextQuestion(): void {
    if (!this.gameFinished) {
      this.gameService.getRandomUnansweredQuestion().subscribe(question => {
        if (question) {
          question.options = this.shuffleOptions([...question.options]);
          this.currentQuestion = question;
        } else {
          // Si no hay más preguntas, se marca el juego como terminado.
          this.gameFinished = true;
        }
      });
    }
  }

  private shuffleOptions(options: QuestionOption[]): QuestionOption[] {
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  restartGame(): void {
    this.gameService.resetGame();
    this.getNextQuestion(); // Comienza con una nueva pregunta
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

