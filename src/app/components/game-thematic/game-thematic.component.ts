import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question, QuestionOption } from '../../models/question';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoomService } from '../../services/room.service';
import { Room, Participant } from '../../models/room';
import { FirebaseService } from '../../services/firebase.service';

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

  constructor(
    private gameService: GameService, 
    private router: Router, 
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private roomService: RoomService,
    private authService: FirebaseService 
  ) {
    this.subscribeToParams();
  }

  ngOnInit(): void {
    this.initializeGame();
  }

  initializeGame() {
    this.route.params.subscribe(params => {
      this.roomId = params['roomId'];
      if (!this.roomId && !this.soloPlay) {
        this.snackBar.open('Room ID is missing. Please join a room first.', 'Close', {duration: 5000});
        this.router.navigate(['/dashboard']);
        return;
      }
      this.subscribeToGameStart();
      this.loadQuestionsBasedOnRoute();
      this.fetchParticipants();
      this.subscribeToScore();
    });
  }

  subscribeToGameStart() {
    if (this.soloPlay) {
      return; // No hacer nada en modo soloPlay
    }
    this.unsubscribe$.add(
      this.roomService.watchGameStarted(this.roomId!).subscribe(gameStarted => {
        if (gameStarted) {
          this.startGame();
        } else {
          console.log("Waiting for game to restart or start.");
        }
      }, error => {
        console.error('Error in receiving game start signal:', error);
        this.snackBar.open('Error in game start signal. Please try again.', 'Close', { duration: 3000 });
      })
    );
  }
  

  fetchParticipants() {
    if (this.roomId) {
      this.roomService.getRoomById(this.roomId).subscribe(room => {
        if (room) {
          this.participants = room.participants;
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
  
      if (this.soloPlay) {
        this.startGame();
      } else if (this.roomId) {
        this.waitForGameStart();
      }
    });
  }
  

  waitForGameStart() {
    const roomSubscription = this.roomService.watchGameStarted(this.roomId!).subscribe(gameStarted => {
        if (gameStarted) {
            this.startGame();
        }
    }, error => {
        console.error('Error waiting for game to start:', error);
        this.snackBar.open('Error waiting for game to start. Please try again.', 'Close', { duration: 3000 });
    });
    this.unsubscribe$.add(roomSubscription);
  }
 
  startGame() {
    this.resetGame();
    this.loadQuestionsBasedOnRoute();
  }  

  subscribeToScore() {
    this.gameService.getScore().subscribe(score => {
      this.score = score;
    });
  }

  loadQuestionsBasedOnRoute(): void {
    const theme = this.route.snapshot.params['theme'];
    if (theme) {
      this.gameService.loadQuestionsFromFirestoreByThematic(theme)
        .then(() => {
          this.resetGame();
          this.getNextQuestion();
        })
        .catch(error => {
          console.error("Error loading questions:", error);
          this.snackBar.open("Error loading questions. Please try again.", "Close", { duration: 5000 });
        });
    } else {
      console.error("Theme is missing");
      this.snackBar.open("Theme is missing from the route parameters.", "Close", { duration: 5000 });
    }
  }
  

  startNewGame(): void {
    this.resetGame();
    this.getNextQuestion();
  }

  resetGame() {
    this.score = 0;
    this.gameFinished = false;
    this.allowAnswer = true;
    this.progressValue = 100;
    this.allScores = [];
    
    // Detiene cualquier temporizador existente
    if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null; // Asegúrate de limpiar la referencia
    }
    
    this.countdown = 10;  // Reinicia el contador a su valor inicial
    
    // Reinicia cualquier lógica de juego adicional
    this.gameService.resetGame();  

    // Inicia el temporizador nuevamente
    this.startCountdown();
  }

  restartGame(): void {
    // Permitir reiniciar si el usuario es el host o está en modo soloPlay.
    if (!this.isHost && !this.soloPlay) {
        this.snackBar.open("Only the host or solo players can restart the game.", "Close", { duration: 3000 });
        return;
    }
  
    // Para modo soloPlay, no es necesario un roomId, por lo que podemos omitir esa comprobación.
    if (this.soloPlay) {
        this.resetGame();
        this.snackBar.open("Game restarted successfully.", "Close", { duration: 3000 });
    } else if (this.roomId) {
        // Reiniciar el juego en modo multijugador requiere un roomId.
        this.roomService.restartGame(this.roomId, this.authService.getCurrentUserId())
            .then(() => {
                this.snackBar.open("Game restarted successfully. Waiting for game to start.", "Close", { duration: 3000 });
                this.resetGame();
            })
            .catch(error => {
                console.error("Failed to restart game", error);
                this.snackBar.open("Failed to restart game: " + error.message, "Close", { duration: 3000 });
            });
    } else {
        console.error("Room ID is missing");
        this.snackBar.open("Error: Room ID is missing.", "Close", { duration: 3000 });
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.unsubscribe();  // Properly clean up all subscriptions
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);  // Clean up any existing intervals
    }
  }

  onOptionSelected(option: QuestionOption): void {
    if (!this.currentQuestion || !this.allowAnswer) return;
  
    this.allowAnswer = false;
    this.stopCountdown();
    this.countdown = 0;
    
    option.selected = true;
    if (option.isCorrect) {
      this.score++;
    }
    this.markCorrectAnswer(true);
  
  }

  getNextQuestion(): void {
    this.resetQuestionState();
    this.gameService.getRandomUnansweredQuestion().subscribe(question => {
      if (question) {
        this.currentQuestion = question;
        this.currentQuestion.options = this.shuffleOptions(this.currentQuestion.options);
        this.resetAndStartCountdown();
      } else {
        this.waitForEndGame();
        this.showResults();
      }
    });
  }

  private resetAndStartCountdown(): void {
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
    this.showResults();  // Call here to ensure that final scores are displayed
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
    this.stopCountdown();  // Asegúrate de detener cualquier temporizador existente
    this.countdown = 10;  // Establece el contador
    this.progressValue = 100;
    this.countdownInterval = setInterval(() => {
        if (this.countdown > 0) {
            this.countdown--;
            this.progressValue = (this.countdown / 10) * 100;
        } else {
            console.log("Time ran out, marking correct answer.");
            this.stopCountdown();
            this.allowAnswer = false;
            this.markCorrectAnswer(true);
        }
    }, 1000);
  } 

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
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
    if (this.soloPlay) {
        // En modo solo, solo muestra la puntuación del jugador actual
        this.allScores = [{
            username: this.username || 'Guest',  // Usa 'Guest' si no hay un nombre de usuario
            score: this.score
        }];
    } else if (this.roomId) {
        // En modo multijugador, recupera las puntuaciones de todos los participantes
        this.roomService.getRoomById(this.roomId).subscribe(room => {
            if (room && room.participants) {
                this.allScores = room.participants.map(p => ({
                    username: p.username,
                    score: p.score !== undefined ? p.score : 0
                }));
                this.allScores.sort((a, b) => b.score - a.score); // Ordena de mayor a menor
            }
        }, error => {
            console.error('Error fetching room details:', error);
            this.snackBar.open('Failed to fetch room details.', 'Close', { duration: 3000 });
        });
    } else {
        // Si no es modo solo y falta roomId, muestra un error
        console.error("Room ID is missing and not in solo play mode.");
        this.snackBar.open("Error: Room ID is missing.", "Close", { duration: 3000 });
    }
  }

  goToLobby(): void {
    this.allScores = [];  // Limpiar las puntuaciones
    this.resetGame();  // Resetear el juego para limpieza

    // Navegar al lobby con o sin roomId
    if (this.roomId || this.soloPlay) {
        // Usa el roomId si está disponible, de lo contrario, no incluyas el roomId en los parámetros
        const queryParams = this.roomId ? { id: this.roomId, username: this.username } : { username: this.username, soloPlay: 'true' };
        this.router.navigate(['/lobby'], { queryParams });
    } else {
        // Si no hay roomId y no es soloPlay, navega al dashboard por defecto
        this.router.navigate(['/dashboard']);
    }
  }

}


