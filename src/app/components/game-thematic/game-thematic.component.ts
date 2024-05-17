import { Component, OnInit, OnDestroy } from '@angular/core';
import { GameService } from '../../services/game.service';
import { Question, QuestionOption } from '../../models/question';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoomService } from '../../services/room.service';
import { Room, Participant } from '../../models/room';
import { FirebaseService } from '../../services/firebase.service';
import { distinctUntilChanged } from 'rxjs/operators';

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
  progressValue = 100;
  allScores: { username: string, score: number }[] = [];
  soloPlay: boolean = false;
  isHost: boolean = false;
  username: string = '';
  participants: Participant[] = [];
  roomId?: string;
  room?: Room;
  currentQuestionIndex: number = 0;
  timer: number = 10;
  displayedColumns: string[] = ['username', 'score'];

  constructor(
    private gameService: GameService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private roomService: RoomService,
    private authService: FirebaseService
  ) {
  }

  ngOnInit(): void {
    this.subscribeToParams();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.unsubscribe();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  subscribeToParams() {
    this.route.queryParams.subscribe(params => {
      this.roomId = params['roomId'];
      this.username = params['username'] || 'Guest';
      this.soloPlay = params['soloPlay'] === 'true';
      this.isHost = params['isHost'] === 'true';
      
      if (!this.roomId && !this.soloPlay) {
        this.snackBar.open('Room ID is missing. Please join a room first.', 'Close', { duration: 5000 });
        this.router.navigate(['/dashboard']);
        return;
      }

      this.startGame();
       
      if (!this.soloPlay) {
        this.fetchParticipants();
      }
      this.subscribeToScore();

    });
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

  startGame() {
    this.resetGame();
    this.loadQuestionsBasedOnRoute();
    this.subscribeToGameState();
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
    this.currentQuestionIndex = 0;
    this.timer = 10;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.countdown = 10;

    this.gameService.resetGame();

    if (!this.gameFinished) {
      this.startCountdown();
    }
  }

  restartGame(): void {
    if (!this.isHost && !this.soloPlay) {
      this.snackBar.open("Only the host or solo players can restart the game.", "Close", { duration: 3000 });
      return;
    }

    if (this.soloPlay) {
      this.resetGame();
      this.snackBar.open("Game restarted successfully.", "Close", { duration: 3000 });
    } else if (this.roomId) {
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

  onOptionSelected(option: QuestionOption): void {
    if (!this.currentQuestion || !this.allowAnswer) return;
  
    this.allowAnswer = false;
    option.selected = true;
    const isCorrect = option.isCorrect;
    const userId = this.roomService.getCurrentUserIdOrGuest();
  
    // Detener el temporizador
    this.stopCountdown();
  
    if (this.soloPlay) {
      // Lógica para juego en solitario
      if (isCorrect) {
        this.score++;
      }
      this.markCorrectAnswer(true); // Mostrar la respuesta correcta antes de avanzar
    } else {
      this.roomService.answerQuestion(this.roomId!, userId, isCorrect).then(() => {
        if (isCorrect) {
          this.score++;
        }
        this.roomService.updateAnswersReceived(this.roomId!, userId, true).then(() => {
          this.checkAllAnswered(); // Verificar si todos han respondido
        });
      }).catch(error => {
        console.error("Error answering question:", error);
        this.snackBar.open("Error answering question. Please try again.", "Close", { duration: 3000 });
      });
    }
  }

  checkAllAnswered(): void {
    this.roomService.getRoomByIdentifier(this.roomId!).subscribe({
      next: (room: Room | null) => {
        if(room &&  room.answersReceived &&  this.participants.every(p => room.answersReceived[p.userId] !== undefined))
          this.markCorrectAnswer(true); // Mostrar la respuesta correcta y avanzar
        else
          this.startCountdown(); // Reiniciar el temporizador si no todos han respondido

      }
    });
  }

  checkForNextQuestion(): void {
    if (this.soloPlay) {
      // Logica para juego en solitario
      this.currentQuestionIndex++;
      this.getNextQuestion();
    } else {

      this.roomService.getRoomByIdentifier(this.roomId!).subscribe({
        next: (room: Room | null) => {
          if(room && room.answersReceived &&  this.participants.every(p => room.answersReceived[p.userId] !== undefined))
            {
              const nextIndex = this.currentQuestionIndex + 1;
              this.roomService.updateTimerAndQuestionIndex(this.roomId!, this.timer, nextIndex).then(() => {
                this.currentQuestionIndex = nextIndex;
                this.getNextQuestion();
              }).catch(error => {
                console.error("Error updating question index and timer:", error);
                this.snackBar.open("Error updating question index and timer. Please try again.", "Close", { duration: 3000 });
              });
            }
  
        }
      });


    }
  }

  getNextQuestion(): void {
    this.resetQuestionState();
    if (this.soloPlay) {
      this.gameService.getQuestionByIndex(this.currentQuestionIndex).pipe(
        distinctUntilChanged()
      ).subscribe(question => {
        if (question) {
          this.currentQuestion = question;
          this.currentQuestion.options = this.shuffleOptions(this.currentQuestion.options);
          this.resetAndStartCountdown();
        } else {
          this.waitForEndGame();
          this.showResults();
        }
      });
    } else {
      this.gameService.getQuestionByIndex(this.roomId!, this.currentQuestionIndex).pipe(
        distinctUntilChanged()
      ).subscribe(question => {
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
  }

  private resetAndStartCountdown(): void {
    this.countdown = this.timer;
    this.allowAnswer = true;
  
    if (!this.soloPlay) {
      this.participants.forEach(participant => {
        this.roomService.updateAnswersReceived(this.roomId!, participant.userId, false);
      });
    }
  
    this.startCountdown();
  }

  private waitForEndGame(): void {
    this.markGameAsFinished();
  }

  private markGameAsFinished(): void {
    this.gameFinished = true;
    this.stopCountdown();
    this.showResults();
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
    this.stopCountdown(); // Asegurarse de detener cualquier temporizador en ejecución
    this.countdown = this.timer;
    this.progressValue = 100;
    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
        this.progressValue = (this.countdown / this.timer) * 100;
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
      this.countdownInterval = null;
      this.progressValue = 0;
    }
  }

  markCorrectAnswer(autoAdvance: boolean = false): void {
    if (this.currentQuestion) {
      this.currentQuestion.options.forEach(option => {
        if (option.isCorrect) {
          option.correct = true;
        }
      });
  
      this.allowAnswer = false;
  
      if (this.soloPlay) {
        // Lógica para juego en solitario
        if (autoAdvance) {
          setTimeout(() => {
            if (!this.gameFinished) {
              this.checkForNextQuestion();
            } else {
              this.markGameAsFinished();
            }
          }, 3000);
        }
      } else {

        this.roomService.getRoomByIdentifier(this.roomId!).subscribe({
          next: (room: Room | null) => {
            if(room &&  room.answersReceived)
              {
                this.participants.forEach(p => {
                  if (room.answersReceived[p.userId] === undefined) {
                    this.roomService.answerQuestion(this.roomId!, p.userId, false).then(() => {
                      this.roomService.updateAnswersReceived(this.roomId!, p.userId, true);
                    });
                  }
                });
        
                if (autoAdvance) {
                  setTimeout(() => {
                    if (!this.gameFinished) {
                      this.checkForNextQuestion();
                    } else {
                      this.markGameAsFinished();
                    }
                  }, 3000);
                }
              }
          }
        });
      }
    }
  }

  showResults(): void {
    if (this.soloPlay) {
      this.allScores = [{
        username: this.username || 'Guest',
        score: this.score
      }];
    } else if (this.roomId) {
      this.roomService.getRoomById(this.roomId).subscribe(room => {
        if (room && room.participants) {
          this.allScores = room.participants.map(p => ({
            username: p.username,
            score: p.score !== undefined ? p.score : 0
          }));
          this.allScores.sort((a, b) => b.score - a.score);
        }
      }, error => {
        console.error('Error fetching room details:', error);
        this.snackBar.open('Failed to fetch room details.', 'Close', { duration: 3000 });
      });
    } else {
      console.error("Room ID is missing and not in solo play mode.");
      this.snackBar.open("Error: Room ID is missing.", "Close", { duration: 3000 });
    }
  }

  goToLobby(): void {
    if (this.roomId) {
      this.roomService.setGameStarted(this.roomId, false).then(() => {
        this.allScores = [];
        this.resetGame();
        this.router.navigate(['/lobby', { id: this.roomId, username: this.username }]);
      }).catch(error => {
        console.error('Failed to set gameStarted to false:', error);
        this.snackBar.open('Failed to return to lobby. Please try again.', 'Close', { duration: 3000 });
      });
    } else if (this.soloPlay) {
      this.allScores = [];
      this.resetGame();
      this.router.navigate(['/lobby', { username: this.username, soloPlay: 'true' }]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  subscribeToGameState() {
    if (this.soloPlay) return;
    
    this.roomService.getGameState(this.roomId!).pipe(
      distinctUntilChanged((prev, curr) => prev.timer === curr.timer && prev.currentQuestionIndex === curr.currentQuestionIndex)
    ).subscribe(state => {
      if (state) {
        if (this.timer !== state.timer) {
          this.timer = state.timer;
          this.countdown = state.timer; // Actualizar el temporizador local
          this.progressValue = (this.countdown / this.timer) * 100; // Actualizar la barra de progreso
        }
        if (this.currentQuestionIndex !== state.currentQuestionIndex) {
          this.currentQuestionIndex = state.currentQuestionIndex;
          this.getNextQuestion(); // Cargar la nueva pregunta
        }
      }
    });
  }
}















