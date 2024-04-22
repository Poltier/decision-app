import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question, QuestionOption } from '../../models/question';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoomService } from '../../services/room.service';
import { Room, Participant } from '../../models/room';

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
  private unsubscribe$ = new Subscription();
  private answersReceived = 0;
  progressValue = 100;
  allScores: {username: string, score: number}[] = [];
  soloPlay: boolean = false;
  isHost: boolean = false; 
  username: string = '';
  participants: Participant[] = [];
  roomId?: string;
  room?: Room;
  displayedColumns: string[] = ['username', 'score']; 

  constructor(private gameService: GameService, 
    private router: Router, 
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private roomService: RoomService
  ) {
    this.subscribeToParams();
  }

  ngOnInit(): void {
    this.roomId = localStorage.getItem('currentRoomId') || this.roomId;

    this.route.queryParams.subscribe(params => {
        this.roomId = params['id'] || this.roomId;  // Use param if available, otherwise use stored roomId
        localStorage.setItem('currentRoomId', this.roomId ?? 'defaultRoomId');  // Update localStorage with new roomId
        this.username = params['username'] || 'Guest';
        this.soloPlay = params['soloPlay'] === 'true';
        this.isHost = params['isHost'] === 'true';

        if (this.roomId) {
            this.subscribeToGameStart();
            this.loadQuestionsBasedOnRoute();
            this.fetchParticipants();
        } else {
            console.error('Room ID is undefined.');
        }

        this.subscribeToScore();
    });
  }


  subscribeToGameStart() {
    console.log(`Subscribing to game start for Room ID: ${this.roomId}`);
    const roomSubscription = this.roomService.watchGameStarted(this.roomId!)
        .subscribe(gameStarted => {
            console.log(`Received game start update: ${gameStarted} for Room ID: ${this.roomId}`);
            if (gameStarted) {
                console.log("Confirmed game start signal, initializing game start...");
                this.startGame();
            } else {
                console.log("Game start signal not received yet.");
            }
        }, error => {
            console.error('Error in receiving game start signal:', error);
        });
    this.unsubscribe$.add(roomSubscription);
  }

  
  fetchParticipants() {
    if (this.roomId) {
      this.roomService.getRoomById(this.roomId).subscribe(room => {
        if (room) {
          this.participants = room.participants;
          console.log("Participants fetched: ", this.participants);
        }
      });
    }
  }

  subscribeToParams() {
    this.route.queryParams.subscribe(params => {
      this.roomId = params['roomId'];
      this.username = params['username'] || 'Guest'; // Set username or default to 'Guest'
      this.soloPlay = params['soloPlay'] === 'true'; // Determine if it is a solo play
      this.isHost = params['isHost'] === 'true'; // Determine if the user is the host
      console.log(`Game initialized with username: ${this.username}, soloPlay: ${this.soloPlay}, isHost: ${this.isHost}`);

      if (!this.soloPlay && this.roomId) {
        this.waitForGameStart();
      } else {
        this.startGame();
      }
    });
  }

  waitForGameStart() {
    const roomSubscription = this.roomService.watchGameStarted(this.roomId!).subscribe(gameStarted => {
        console.log(`Game start status received: ${gameStarted}`);  // Log the received game start status
        if (gameStarted) {
            console.log("Game start signal received, starting game...");
            this.startGame();
        }
    }, error => {
        console.error('Error waiting for game to start:', error);
        this.snackBar.open('Error waiting for game to start. Please try again.', 'Close', { duration: 3000 });
    });
    this.unsubscribe$.add(roomSubscription);
  }
 
  startGame() {
    console.log("Starting game process now...");
    this.loadQuestionsBasedOnRoute();
  }

  subscribeToScore() {
    this.gameService.getScore().subscribe(score => {
      this.score = score;
      console.log(`Score updated: ${score}`);
    });
  }

  loadQuestionsBasedOnRoute(): void {
    const theme = this.route.snapshot.params['theme'];
    console.log(`Loading questions for theme: ${theme}`);
    this.gameService.loadQuestionsFromFirestoreByThematic(theme).then(() => {
      console.log("Questions loaded, starting new game...");
      this.resetGame();
      this.getNextQuestion();
    }).catch(error => {
      console.error("Error loading questions: ", error);
    });
  }

  startNewGame(): void {
    console.log("Starting new game");
    this.resetGame();
    this.getNextQuestion();
  }

  resetGame() {
    this.score = 0;
    this.gameFinished = false;
    this.allowAnswer = true;
    this.progressValue = 100;
    this.allScores = [];
    this.gameService.resetGame(); // Reset game logic in the service
    console.log("Game state has been reset.");
  }

  restartGame(): void {
    if (this.isHost || this.soloPlay) {
      console.log("Restarting game...");
      this.resetGame();
      this.getNextQuestion();
    } else {
      console.error("Attempt to restart game failed: Not host or solo player");
    }
  }

  ngOnDestroy(): void {
    console.log("Component being destroyed, cleaning up...");
    this.unsubscribe$.unsubscribe();  // Properly clean up all subscriptions
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);  // Clean up any existing intervals
    }
  }

  onOptionSelected(option: QuestionOption): void {
    if (!this.currentQuestion || !this.allowAnswer) return;

    this.answersReceived++; 
    this.allowAnswer = false;
    this.stopCountdown();
    this.countdown = 0;
    option.selected = true;

    if (option.isCorrect) {
      this.score++;
      this.gameService.setScoreForUser(this.username, this.score);  // Update score for user
    }
    this.markCorrectAnswer();
    if (this.answersReceived >= this.participants.length || this.countdown === 0) {
      this.gameService.answerQuestion(this.currentQuestion.id!, option.isCorrect);
      setTimeout(() => this.prepareForNextQuestion(), 3000);
    }
  }

  getNextQuestion(): void {
    console.log("Obteniendo la siguiente pregunta");
    this.resetQuestionState();
    this.gameService.getRandomUnansweredQuestion().subscribe(question => {
      if (question) {
        console.log("Question loaded: ", question);
        this.currentQuestion = question;
        this.currentQuestion.options = this.shuffleOptions(this.currentQuestion.options);
        this.resetAndStartCountdown();
      } else {
        console.log("No hay más preguntas, preparando para terminar el juego");
        this.waitForEndGame();
        this.showResults();
      }
    });
  }

  private resetAndStartCountdown(): void {
    console.log("Resetting and starting countdown...");
    this.stopCountdown();
    this.countdown = 10;
    this.allowAnswer = true;
    this.answersReceived = 0;
    this.startCountdown();
  }

  private waitForEndGame(): void {
    this.markGameAsFinished();
  }

  private markGameAsFinished(): void {
    this.gameFinished = true;
    this.stopCountdown();
    console.log("El juego ha terminado. Mostrando pantalla de resultados.");
  }


  private prepareForNextQuestion(): void {
    if (this.gameFinished) {
      console.log("El juego ya ha terminado. No cargar más preguntas.");
      return;
    }
    this.getNextQuestion();
  }

  private resetQuestionState(): void {
    if (this.currentQuestion) {
      this.currentQuestion.options.forEach(option => {
        delete option.selected;
        delete option.correct;
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

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      console.log("Deteniendo el contador.");
      this.progressValue = 0;
    }
  }

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

  showResults(): void {
    console.log("Showing results, game finished.");
    this.allScores.push({username: this.username, score: this.score});
    this.allScores.sort((a, b) => b.score - a.score);
    console.log("Final scores: ", this.allScores);
  }

  goToLobby(): void {
    this.allScores = [];
    if (this.roomId) {
        this.router.navigate(['/lobby'], { queryParams: { id: this.roomId, username: this.username } });
        console.log("Returning to the lobby with Room ID:", this.roomId);
    } else {
        this.router.navigate(['/dashboard']);
        console.log("Room ID was undefined, navigating back to the dashboard.");
    }
  }
}


