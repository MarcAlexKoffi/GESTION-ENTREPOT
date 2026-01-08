import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

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
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss',
})
export class UserDashboard implements OnInit {
  // session user
  currentUser: StoredUser | null = null;
  userName = '—';
  userRoleLabel = '—';
  userEntrepotId: number | null = null;

  // notifications
  notifCount = 0;
  showNotifDropdown = false;

  notifications: Array<{
    id: number;
    immatriculation: string;
    entrepotId: number;
    entrepotName: string;
    statut: string;
  }> = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.loadCurrentUserOrRedirect();
    this.loadNotifications();
  }

  // -----------------------------
  // Session
  // -----------------------------
  private loadCurrentUserOrRedirect(): void {
    const raw = localStorage.getItem('currentUser');
    if (!raw) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      this.currentUser = JSON.parse(raw) as StoredUser;
    } catch {
      this.currentUser = null;
    }

    if (!this.currentUser || this.currentUser.status !== 'Actif') {
      localStorage.removeItem('currentUser');
      this.router.navigate(['/login']);
      return;
    }

    this.userName = this.currentUser.nom;
    this.userRoleLabel = this.roleLabel(this.currentUser.role);
    this.userEntrepotId = this.currentUser.entrepotId;

    // un user non-admin doit avoir un entrepôt
    if (this.currentUser.role !== 'admin' && this.userEntrepotId === null) {
      localStorage.removeItem('currentUser');
      this.router.navigate(['/login']);
      return;
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  private roleLabel(role: UserRole): string {
    switch (role) {
      case 'admin':
        return 'Administrateur';
      case 'operator':
        return 'Opérateur';
      case 'driver':
        return 'Chauffeur';
      case 'security':
        return 'Sécurité';
      default:
        return role;
    }
  }

  // -----------------------------
  // Notifications
  // -----------------------------
  loadNotifications(): void {
    const rawTrucks = localStorage.getItem('trucks');
    const rawWarehouses = localStorage.getItem('warehouses');

    const trucks = rawTrucks ? JSON.parse(rawTrucks) : [];
    const warehouses = rawWarehouses ? JSON.parse(rawWarehouses) : [];

    // ✅ filtre par entrepôt assigné (si non admin)
    const allowedEntrepotId = this.userEntrepotId;

    this.notifications = trucks
      .filter((t: any) => t.unreadForGerant === true)
      .filter((t: any) => {
        if (allowedEntrepotId === null) return true; // admin
        return t.entrepotId === allowedEntrepotId;
      })
      .map((t: any) => {
        const wh = warehouses.find((w: any) => w.id === t.entrepotId);
        return {
          id: t.id,
          immatriculation: t.immatriculation,
          entrepotId: t.entrepotId,
          entrepotName: wh ? wh.name : 'Inconnu',
          statut: t.statut,
        };
      });

    this.notifCount = this.notifications.length;
  }

  toggleNotifications(): void {
    this.showNotifDropdown = !this.showNotifDropdown;
  }
  @HostListener('document:click')
  closeNotifDropdownOnOutsideClick(): void {
    if (this.showNotifDropdown) {
      this.showNotifDropdown = false;
    }
  }

  openNotification(n: any): void {
    // Marquer comme lu
    const raw = localStorage.getItem('trucks');
    const all = raw ? JSON.parse(raw) : [];

    const idx = all.findIndex((t: any) => t.id === n.id);
    if (idx !== -1) {
      all[idx].unreadForGerant = false;
      localStorage.setItem('trucks', JSON.stringify(all));
    }

    this.showNotifDropdown = false;

    // ✅ navigation Angular (pas window.location)
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate(['/userdashboard/userentrepot', n.entrepotId]);
    });
  }
}
