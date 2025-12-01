import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

type TruckStatus =
  | 'En attente'                // données analyse envoyées par le gérant → attente validation admin
  | 'Validé'                    // validation admin → attente démarrage déchargement par gérant
  | 'En cours de déchargement'
  | 'Déchargé'
  | 'Annulé';                   // refoulé par admin

interface Truck {
  id: number;
  immatriculation: string;
  transporteur: string;
  transfert: string;
  kor: string;
  th?: string;
  statut: TruckStatus;
  heureArrivee: string;
  entrepotId: number;
  createdAt: string;
  coperative?: string;
}

interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

interface AdminComment {
  truckId: number;
  comment: string;
}

@Component({
  selector: 'app-entrepot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './entrepot.html',
  styleUrl: './entrepot.scss',
})
export class Entrepot implements OnInit {
  // ---------------------------------------------------------------------------
  // Entrepôt courant
  // ---------------------------------------------------------------------------
  entrepot = {
    id: 0,
    nom: '',
    lieu: '',
  };

  // UI
  currentTab: 'pending' | 'validated' | 'cancelled' = 'pending';
  showDetailsModal = false;

  // Liste des camions de cet entrepôt
  trucks: Truck[] = [];

  // Truck sélectionné pour le modal "Voir plus"
  selectedTruck: Truck | null = null;

  // Commentaire admin (pour valid/refoul)
  adminComment: string = '';

  private readonly truckStorageKey = 'trucks';
  private readonly commentStorageKey = 'truckAdminComments';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));

    // Charger entrepôts
    let warehouses: StoredWarehouse[] = [];
    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try {
        warehouses = JSON.parse(saved);
      } catch {}
    }

    if (warehouses.length === 0) {
      warehouses = [
        { id: 1, name: 'Entrepôt Lyon Sud', location: 'Corbas, Rhône-Alpes' },
      ];
    }

    const found = warehouses.find((w) => w.id === idParam) ?? warehouses[0];
    this.entrepot = {
      id: found.id,
      nom: found.name,
      lieu: found.location,
    };

    this.loadTrucks();
  }

  // ---------------------------------------------------------------------------
  // Chargement camions
  // ---------------------------------------------------------------------------
  private loadTrucks(): void {
    const raw = localStorage.getItem(this.truckStorageKey);
    if (!raw) {
      this.trucks = [];
      return;
    }

    try {
      const all: Truck[] = JSON.parse(raw);
      this.trucks = all.filter((t) => t.entrepotId === this.entrepot.id);
    } catch {
      this.trucks = [];
    }
  }

  private saveTrucks(): void {
    const raw = localStorage.getItem(this.truckStorageKey);
    let all: Truck[] = [];

    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }

    all = all.filter((t) => t.entrepotId !== this.entrepot.id);
    all.push(...this.trucks);

    localStorage.setItem(this.truckStorageKey, JSON.stringify(all));
  }

  // ---------------------------------------------------------------------------
  // Gestion commentaires
  // ---------------------------------------------------------------------------
  private loadCommentForTruck(truckId: number): string {
    const raw = localStorage.getItem(this.commentStorageKey);
    if (!raw) return '';

    try {
      const all: AdminComment[] = JSON.parse(raw);
      const found = all.find((c) => c.truckId === truckId);
      return found ? found.comment : '';
    } catch {
      return '';
    }
  }

  private saveComment(truckId: number, comment: string) {
    const raw = localStorage.getItem(this.commentStorageKey);
    let all: AdminComment[] = [];

    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {}
    }

    all = all.filter((c) => c.truckId !== truckId);
    if (comment.trim().length > 0) {
      all.push({ truckId, comment });
    }

    localStorage.setItem(this.commentStorageKey, JSON.stringify(all));
  }

  // ---------------------------------------------------------------------------
  // Onglets
  // ---------------------------------------------------------------------------
  setTab(tab: 'pending' | 'validated' | 'cancelled'): void {
    this.currentTab = tab;
  }

  get filteredTrucks(): Truck[] {
    switch (this.currentTab) {
      case 'pending':
        return this.trucks.filter((t) => t.statut === 'En attente');
      case 'validated':
        return this.trucks.filter((t) => t.statut === 'Validé');
      case 'cancelled':
        return this.trucks.filter((t) => t.statut === 'Annulé');
      default:
        return this.trucks;
    }
  }

  // ---------------------------------------------------------------------------
  // Modal "Voir plus"
  // ---------------------------------------------------------------------------
  openDetailsModal(truck: Truck): void {
    this.selectedTruck = truck;
    this.adminComment = this.loadCommentForTruck(truck.id);
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
  }

  // ---------------------------------------------------------------------------
  // Validation / Refoulement
  // ---------------------------------------------------------------------------
  validateTruck(): void {
    if (!this.selectedTruck) return;

    this.selectedTruck.statut = 'Validé';
    this.saveComment(this.selectedTruck.id, this.adminComment);
    this.saveTrucks();
    this.closeDetailsModal();
  }

  refuseTruck(): void {
    if (!this.selectedTruck) return;

    this.selectedTruck.statut = 'Annulé';
    this.saveComment(this.selectedTruck.id, this.adminComment);
    this.saveTrucks();
    this.closeDetailsModal();
  }

  // ---------------------------------------------------------------------------
  // Statistiques
  // ---------------------------------------------------------------------------
  get totalCamionsArrives(): number {
    return this.trucks.length;
  }
  get nbPending(): number {
    return this.trucks.filter((t) => t.statut === 'En attente').length;
  }
  get nbValidated(): number {
    return this.trucks.filter((t) => t.statut === 'Validé').length;
  }
  get nbCancelled(): number {
    return this.trucks.filter((t) => t.statut === 'Annulé').length;
  }
}
