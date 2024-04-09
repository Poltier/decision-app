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
  gameFinished: boolean = false;
  countdown: number = 10;
  allowAnswer: boolean = true;
  private countdownInterval?: any;
  private unsubscribe$ = new Subject<void>();
  progressValue = 100;
 
  constructor(private gameService: GameService, private router: Router, private route: ActivatedRoute) {}

  //Se ejecuta cuando se crea el componente. Prepara el juego para comenzar marcando el juego como no terminado e invocando la carga de preguntas basada en la ruta.
  ngOnInit(): void {
    this.gameFinished = false;
    this.loadQuestionsBasedOnRoute();
  }

  //Determina si cargar todas las preguntas aprobadas o solo aquellas de una temática específica basada en la ruta. Luego inicia el juego.
  private loadQuestionsBasedOnRoute(): void {
    this.route.params.pipe(takeUntil(this.unsubscribe$)).subscribe(params => {
      const thematic = params['type'];
      const questionsLoader = thematic && thematic !== 'mix'
        ? this.gameService.loadQuestionsFromFirestoreByThematic(thematic)
        : this.gameService.loadAllApprovedQuestions();
  
      questionsLoader.then(() => this.startNewGame())
        .catch(error => console.error('Error loading questions:', error));
    });
  }
  
  //Resetea el puntaje a 0, marca el juego como no terminado y carga la primera pregunta.
  private startNewGame(): void {
    console.log("Iniciando nuevo juego");
    this.score = 0;
    this.gameFinished = false;
    this.getNextQuestion();
  }
  
  // Limpia recursos al destruir el componente, como detener el contador.
  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
    this.stopCountdown();
  }

  //Maneja la lógica cuando se selecciona una opción de respuesta. Detiene el contador, actualiza el puntaje si la respuesta es correcta, y prepara la próxima pregunta después de un retraso.
  onOptionSelected(option: QuestionOption): void {
    if (!this.currentQuestion || !this.allowAnswer) return;
  
    this.allowAnswer = false;
    this.stopCountdown();
    this.countdown = 0;
  
    option.selected = true;
    if (option.isCorrect) {
      this.score++;
    }
    this.markCorrectAnswer();
    this.gameService.answerQuestion(this.currentQuestion.id!, option.isCorrect);
  
    setTimeout(() => this.prepareForNextQuestion(), 6000);
  }

  //Carga la siguiente pregunta si el juego no ha terminado; de lo contrario, finaliza el juego.
  private prepareForNextQuestion(): void {
    if (this.gameFinished) {
      console.log("El juego ya ha terminado. No cargar más preguntas.");
      return;
    }
    this.getNextQuestion();
  }
  
  //Resetea el estado de la pregunta actual, eliminando las marcas de selección y corrección de las opciones.
  private resetQuestionState(): void {
    if (this.currentQuestion) {
      this.currentQuestion.options.forEach(option => {
        delete option.selected;
        delete option.correct;
      });
    }
  }

  //Carga la siguiente pregunta del juego. Si no hay más preguntas, espera el final del juego.
  private getNextQuestion(): void {
    console.log("Obteniendo la siguiente pregunta");
    this.resetQuestionState();
    this.gameService.getRandomUnansweredQuestion().subscribe(question => {
      console.log("Pregunta cargada: ", question);
      if (question) {
        this.currentQuestion = question;
        this.resetAndStartCountdown();
      } else {
        console.log("No hay más preguntas, preparando para terminar el juego");
        this.waitForEndGame();
      }
    });
  }

  //Marca el juego como terminado después de un retraso.
  private waitForEndGame(): void {
    this.markGameAsFinished();
  }
  
  //Marca el juego como terminado y detiene el contador. Muestra el resultado final.
  private markGameAsFinished(): void {
    this.gameFinished = true;
    this.stopCountdown();
    console.log("El juego ha terminado. Mostrando pantalla de resultados.");
  }

  //Restablece y comienza el contador para la nueva pregunta.
  private resetAndStartCountdown(): void {
    this.stopCountdown();
    this.countdown = 10;
    this.allowAnswer = true;
    this.startCountdown();
  }

  //Mezcla las opciones de respuesta de la pregunta actual.
  private shuffleOptions(options: QuestionOption[]): QuestionOption[] {
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return options;
  }

  //Reinicia el juego, restableciendo el estado inicial y cargando la primera pregunta.
  restartGame(): void {
    this.gameFinished = false;
    this.allowAnswer = true;
    this.score = 0;
    this.gameService.resetGame();
    this.getNextQuestion();
  }

  // Inicia el contador para la respuesta, deteniéndolo y marcando la respuesta correcta cuando se acaba el tiempo.
  private startCountdown(): void {
    console.log("Iniciando el contador.");
    const countdownDuration = this.countdown;
    this.progressValue = 100;
    this.countdownInterval = setInterval(() => {
      console.log(`Contador: ${this.countdown}`);
    if (this.countdown > 0) {
      this.countdown--;
      this.progressValue = (this.countdown / countdownDuration) * 100;
      console.log(`Contador: ${this.countdown}, Progreso: ${this.progressValue}`);
    } else {
      console.log("Tiempo agotado, marcando respuesta correcta.");
      this.stopCountdown();
      this.allowAnswer = false;
      this.markCorrectAnswer(true);
    }
    }, 1000);
  }

  //Detiene el contador activo.
  private stopCountdown(): void {
  if (this.countdownInterval) {
    clearInterval(this.countdownInterval);
    console.log("Deteniendo el contador.");
    this.progressValue = 0;
  }
  }

  //Marca la respuesta correcta de la pregunta actual y, si se especifica, avanza automáticamente después de un retraso.
  private markCorrectAnswer(autoAdvance: boolean = false): void {
  if (this.currentQuestion) {
      this.currentQuestion.options.forEach(option => {
          if (option.isCorrect) {
              option.correct = true;
          }
      });

      this.allowAnswer = false;

      if (autoAdvance) {
          this.gameService.answerQuestion(this.currentQuestion.id!, false, true);
          setTimeout(() => {
              if (!this.gameFinished) {
                  this.getNextQuestion();
              } else {
                  this.markGameAsFinished();
              }
          }, 6000);
      }
  }
  }
  
  //Navega de regreso al dashboard del juego.
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

}

