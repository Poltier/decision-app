import { Component, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question } from '../../models/question';

@Component({
  selector: 'app-game-thematic',
  templateUrl: './game-thematic.component.html',
  styleUrls: ['./game-thematic.component.css']
})
export class GameThematicComponent implements OnInit {
  currentQuestion?: Question;
  score: number = 0;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.getNextQuestion();
    this.gameService.getScore().subscribe(score => {
      this.score = score;
    });
  }

  onOptionSelected(optionIndex: number, isCorrect: boolean): void {
    this.gameService.answerQuestion(this.currentQuestion?.id!, isCorrect);
    this.getNextQuestion();
  }

  private getNextQuestion(): void {
    this.gameService.getRandomUnansweredQuestion().subscribe(question => {
      this.currentQuestion = question;
    });
  }

}
