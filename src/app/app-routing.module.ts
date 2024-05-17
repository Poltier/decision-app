import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AuthGuard } from './auth/auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { GameThematicComponent } from './components/game-thematic/game-thematic.component';
import { SubmitQuestionComponent } from './pages/submit-question/submit-question.component';
import { LobbyComponent } from './pages/lobby/lobby.component';

const routes: Routes = [
  { path: 'home', component: WelcomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'lobby', component: LobbyComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
  { path: 'submit-question', component: SubmitQuestionComponent },
  { path: 'game-thematic/:theme', component: GameThematicComponent }, // For solo play
  { path: 'game-room/:roomId/:theme', component: GameThematicComponent }, // For multiplayer
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

