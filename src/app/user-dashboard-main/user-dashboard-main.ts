import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

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

type AdvancedTruckStatus =
  | 'REFUSE_EN_ATTENTE_GERANT'
  | 'REFUSE_RENVOYE'
  | 'REFUSE_REINTEGRE'
  | 'ACCEPTE_FINAL';

interface StoredTruck {
  id: number;
  entrepotId: number;
  statut: string;
  createdAt: string;
  unreadForAdmin?: boolean;
  advancedStatus?: AdvancedTruckStatus;
}

interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-user-dashboard-main',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard-main.html',
  styleUrl: './user-dashboard-main.scss',
})
export class UserDashboardMain implements OnInit {
  // contexte
  currentUser: StoredUser | null = null;
  entrepotId: number | null = null;
  entrepotName = '—';

  // filtre période
  period: PeriodFilter = 'day';

  // data
  trucks: StoredTruck[] = [];

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadEntrepotLabel();
    this.loadTrucks();
  }

  private loadCurrentUser(): void {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return;

    try {
      this.currentUser = JSON.parse(raw) as StoredUser;
      this.entrepotId = this.currentUser.entrepotId;
    } catch {
      this.currentUser = null;
      this.entrepotId = null;
    }
  }

  private loadEntrepotLabel(): void {
    const raw = localStorage.getItem('warehouses');
    const warehouses: StoredWarehouse[] = raw ? JSON.parse(raw) : [];

    if (this.entrepotId === null) {
      this.entrepotName = 'Tous les entrepôts';
      return;
    }

    const wh = warehouses.find((w) => w.id === this.entrepotId);
    this.entrepotName = wh?.name ?? 'Entrepôt';
  }

  private loadTrucks(): void {
    const raw = localStorage.getItem('trucks');
    const all: StoredTruck[] = raw ? JSON.parse(raw) : [];

    // ✅ scope entrepôt user
    const scoped =
      this.entrepotId === null ? all : all.filter((t) => t.entrepotId === this.entrepotId);

    // ✅ scope période
    this.trucks = this.applyPeriodFilter(scoped, this.period);
  }

  setPeriod(p: PeriodFilter): void {
    this.period = p;
    this.loadTrucks();
  }

  private applyPeriodFilter(list: StoredTruck[], period: PeriodFilter): StoredTruck[] {
    const now = new Date();
    const start = new Date(now);

    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      start.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      start.setFullYear(now.getFullYear() - 1);
    }

    const startTime = start.getTime();

    return list.filter((t) => {
      const time = new Date(t.createdAt).getTime();
      return !Number.isNaN(time) && time >= startTime;
    });
  }

  // -------------------------
  // KPIs dynamiques
  // -------------------------
  get totalPresents(): number {
    return this.trucks.length;
  }

  get enAttente(): number {
    return this.trucks.filter((t) => t.statut === 'En attente').length;
  }

  // interprétation actuelle du flux UserEntrepot : "Validé" = en cours côté gérant
  get enDechargement(): number {
    return this.trucks.filter(
      (t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
    ).length;
  }

  get decharges(): number {
    return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }

  get annules(): number {
    return this.trucks.filter((t) => t.statut === 'Annulé').length;
  }

  // "Attente décision admin" : on s’appuie sur unreadForAdmin (déjà utilisé dans ton flux)
  get attenteDecisionAdmin(): number {
    return this.trucks.filter((t) => t.unreadForAdmin === true).length;
  }

  get refusesAttenteGerant(): number {
    return this.trucks.filter((t) => t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT').length;
  }

  get refusesRenvoyes(): number {
    return this.trucks.filter((t) => t.advancedStatus === 'REFUSE_RENVOYE').length;
  }

  get reintegres(): number {
    return this.trucks.filter((t) => t.advancedStatus === 'REFUSE_REINTEGRE').length;
  }
}
