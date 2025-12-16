import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type UserRole = 'admin' | 'operator' | 'driver' | 'security';
type UserStatus = 'Actif' | 'Inactif' | 'En attente';

interface StoredUser {
  id: number;
  nom: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  entrepotId: number | null;
  status: UserStatus;
  createdAt: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly usersKey = 'users';
  private readonly currentUserKey = 'currentUser';

  username = '';
  password = '';
  showPassword = false;

  errorMessage: string | null = null;

  constructor(private router: Router) {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errorMessage = null;

    const username = this.username.trim();
    const password = this.password;

    if (!username || !password) {
      this.errorMessage = 'Veuillez saisir votre identifiant et votre mot de passe.';
      return;
    }

    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      this.errorMessage = "Aucun utilisateur n'existe. Créez d'abord un compte admin.";
      return;
    }

    let users: StoredUser[] = [];
    try {
      users = JSON.parse(raw) as StoredUser[];
    } catch {
      users = [];
    }

    const found = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!found) {
      this.errorMessage = 'Identifiant ou mot de passe incorrect.';
      return;
    }

    if (found.status !== 'Actif') {
      this.errorMessage = `Votre compte est "${found.status}". Contactez un administrateur.`;
      return;
    }

    // session (sans backend)
    localStorage.setItem(this.currentUserKey, JSON.stringify(found));

    // redirection simple (adapte si ton routing diffère)
    this.router.navigate(['/dashboard/dashboard-main']);
  }
}
