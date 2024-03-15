import { Component, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question, QuestionOption } from '../../models/question';
import { Router } from '@angular/router';

@Component({
  selector: 'app-game-thematic',
  templateUrl: './game-thematic.component.html',
  styleUrls: ['./game-thematic.component.css']
})
export class GameThematicComponent implements OnInit {
  currentQuestion?: Question;
  score: number = 0;
  gameFinished: boolean = false;

  constructor(private gameService: GameService, private router: Router) {}

  ngOnInit(): void {
    this.gameService.resetGame();
    this.getNextQuestion();
    this.gameService.getScore().subscribe(score => this.score = score);
    this.gameService.isGameFinished().subscribe(finished => this.gameFinished = finished);
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

