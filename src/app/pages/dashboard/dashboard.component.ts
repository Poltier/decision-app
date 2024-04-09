import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface Thematic {
  name: string;
  imageUrl: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  thematics: Thematic[] = [
    { name: 'Science', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fscience-thematic.webp?alt=media&token=3d5179f4-b296-489d-b818-3b54641b2675' },
    { name: 'Geography', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fgeography-thematic.jpeg?alt=media&token=cce6a5f1-c137-427b-b249-9f24fbb48fb2' },
    { name: 'History', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fhistory-thematic.jpeg?alt=media&token=0f1d1b2b-9bb4-481a-9afb-e86cbd800d44' },
    { name: 'Sports', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fsports-thematic.jpeg?alt=media&token=4d8939c8-4362-493c-93c7-3b5299201012' },
    { name: 'Literature', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/decisiondevelopmentapp.appspot.com/o/game-thematic%2Fliterature-thematic.webp?alt=media&token=5bac1ca6-49b2-4f63-a780-8fcc94eec597' },
  ];

  constructor(private router: Router) { }

  goToGame(thematic: Thematic) {
    this.router.navigate(['/game-thematic', thematic.name]);
  }

  goToMixGame() {
    this.router.navigate(['/game-thematic', 'mix']);
  }  

  goToCreateQuestion() {
    this.router.navigate(['/submit-question']);
  }
}
