import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AuthGuard } from './auth/auth.guard';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { GameThematicComponent } from './components/game-thematic/game-thematic.component';
import { SubmitQuestionComponent } from './pages/submit-question/submit-question.component';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: WelcomeComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },

  { path: 'game-thematic/:type', component: GameThematicComponent },
  { path: 'submit-question', component: SubmitQuestionComponent },

  // Otras rutas específicas de la aplicación aquí
  { path: '**', redirectTo: '' } // Redirigir a la bienvenida si la ruta no existe
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
