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
  currentQuestionIsCorrect:boolean = false;
  watchOn:boolean = false;

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

  watchGameStarted(){
    if(!this.soloPlay && !this.isHost && !this.watchOn){
      this.unsubscribe$.add(
        this.roomService.watchGameStarted(this.roomId!).subscribe(gameStart =>{
          if(!gameStart)
             this.router.navigate(['/lobby', { id: this.roomId, username: this.username }]);
        })
      );
      this.watchOn = true;
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
      
      this.watchGameStarted();
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

    if (this.roomId && !this.soloPlay) {
    this.roomService.resetRoomScores(this.roomId).then(() => {
      console.log('Room scores reset successfully.');
    }).catch(error => {
      console.error('Failed to reset room scores:', error);
      this.snackBar.open('Failed to reset room scores. Please try again.', 'Close', { duration: 3000 });
    });
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
    this.currentQuestionIsCorrect = option.isCorrect;
    const userId = this.roomService.getCurrentUserIdOrGuest();
  
    if (this.soloPlay) {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdown = 0;
        this.progressValue = 0;
      }
      this.markCorrectAnswer(true);
    } else {
      this.roomService.answerQuestion(this.roomId!, userId, this.currentQuestionIsCorrect).then(() => {
        this.roomService.updateAnswersReceived(this.roomId!, userId, true).then();
      }).catch(error => {
        console.error("Error answering question:", error);
        this.snackBar.open("Error answering question. Please try again.", "Close", { duration: 3000 });
      });
    }
  }

  checkForNextQuestion(): void {
    if (this.soloPlay) {
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
          this.markGameAsFinished();
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
          this.markGameAsFinished();
        }
      });
    }
  }

  private resetAndStartCountdown(): void {
    this.allowAnswer = true;
    this.countdown = this.timer;
    this.progressValue = 100;

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    this.countdownInterval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
        this.progressValue = (this.countdown / this.timer) * 100;
      } else {
        clearInterval(this.countdownInterval);
        this.allowAnswer = false;
        this.markCorrectAnswer(true);
      }
    }, 1000);
  
    if (!this.soloPlay) {
      this.participants.forEach(participant => {
        this.roomService.updateAnswersReceived(this.roomId!, participant.userId, false);
      });
    }
  
  }

  private markGameAsFinished(): void {
    this.gameFinished = true;
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

  markCorrectAnswer(autoAdvance: boolean = false): void {
    if (this.currentQuestion) {
      this.currentQuestion.options.forEach(option => {
        if (option.isCorrect) {
          option.correct = true;
        }
      });

      if(this.currentQuestionIsCorrect)
        {
          this.score++;
          this.currentQuestionIsCorrect = false;
        }

      this.allowAnswer = false;
  
      if (this.soloPlay) {
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
        this.router.navigate(['/lobby', { id: this.roomId, username: this.username }]);
      }).catch(error => {
        console.error('Failed to set gameStarted to false:', error);
        this.snackBar.open('Failed to return to lobby. Please try again.', 'Close', { duration: 3000 });
      });
    } else if (this.soloPlay) {
      this.router.navigate(['/lobby', { username: this.username, soloPlay: 'true' }]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  subscribeToGameState() {
    if (this.soloPlay) {
      return;
    }
    
    this.roomService.getGameState(this.roomId!).pipe(
      distinctUntilChanged((prev, curr) => prev.timer === curr.timer && prev.currentQuestionIndex === curr.currentQuestionIndex)
    ).subscribe(state => {
      if (state) {
        if (this.countdown !== state.timer) {
          this.countdown = state.timer;
          this.progressValue = (this.countdown / this.timer) * 100;
          if(this.countdown === 0){
            console.log("Time ran out, marking correct answer.");
            this.allowAnswer = false;
            this.markCorrectAnswer(true);
          }
        } 
        if (this.currentQuestionIndex !== state.currentQuestionIndex) {
          this.currentQuestionIndex = state.currentQuestionIndex;
          this.getNextQuestion();
        }
      }
    });
  }
}















