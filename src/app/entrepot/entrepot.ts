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

  // Champs gérant stockés dans localStorage mais pas définis dans l’interface admin :
  advancedStatus?: string;
  history?: any[];
  unreadForGerant?: boolean;
  unreadForAdmin?: boolean;

  refusedAt?: string;
  renvoyeAt?: string;
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

  entrepot = {
    id: 0,
    nom: '',
    lieu: '',
  };

  // Ajout de la nouvelle catégorie RENVOYÉS
  currentTab: 'pending' | 'validated' | 'cancelled' | 'renvoyes' = 'pending';
  showDetailsModal = false;

  trucks: Truck[] = [];
  selectedTruck: Truck | null = null;
  adminComment: string = '';

  private readonly truckStorageKey = 'trucks';
  private readonly commentStorageKey = 'truckAdminComments';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));

    let warehouses: StoredWarehouse[] = [];
    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try { warehouses = JSON.parse(saved); } catch {}
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

  // ================================================================
  // CHARGEMENT CAMIONS
  // ================================================================
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

  // ================================================================
  // COMMENTAIRES ADMIN
  // ================================================================
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
      try { all = JSON.parse(raw); } catch {}
    }

    all = all.filter((c) => c.truckId !== truckId);
    if (comment.trim().length > 0) {
      all.push({ truckId, comment });
    }

    localStorage.setItem(this.commentStorageKey, JSON.stringify(all));
  }

  // ================================================================
  // ONGLET
  // ================================================================
  setTab(tab: 'pending' | 'validated' | 'cancelled' | 'renvoyes'): void {
    this.currentTab = tab;
  }

  get filteredTrucks(): Truck[] {
    switch (this.currentTab) {
      case 'pending':
        return this.trucks.filter((t) => t.statut === 'En attente');

      case 'validated':
        return this.trucks.filter((t) => t.statut === 'Validé');

      case 'cancelled':
        // Refoulés mais PAS renvoyés
        return this.trucks.filter((t: any) =>
          t.statut === 'Annulé' &&
          t.advancedStatus !== 'REFUSE_RENVOYE'
        );

      case 'renvoyes':
        // RENVOYÉS par le gérant
        return this.trucks.filter((t: any) =>
          t.statut === 'Annulé' &&
          t.advancedStatus === 'REFUSE_RENVOYE'
        );

      default:
        return this.trucks;
    }
  }

  // ================================================================
  // MODAL "VOIR PLUS"
  // ================================================================
  openDetailsModal(truck: Truck): void {
    this.selectedTruck = truck;

    // Charger le commentaire admin
    this.adminComment = this.loadCommentForTruck(truck.id);

    // Si admin ouvre, on considère que la notification est lue
    if (truck.unreadForAdmin) {
      truck.unreadForAdmin = false;
      this.saveTrucks();
    }

    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
  }

  // ================================================================
  // VALIDATION
  // ================================================================
  validateTruck(): void {
    if (!this.selectedTruck) return;

    // Statut admin
    this.selectedTruck.statut = 'Validé';

    // Notification côté gérant
    (this.selectedTruck as any).unreadForGerant = true;

    // Historique gérant
    const now = new Date().toISOString();
    (this.selectedTruck as any).history = (this.selectedTruck as any).history || [];
    (this.selectedTruck as any).history.push({
      event: 'Validation administrateur',
      by: 'admin',
      date: now
    });

    this.saveComment(this.selectedTruck.id, this.adminComment);

    this.saveTrucks();
    this.closeDetailsModal();
  }

  // ================================================================
  // REFOULEMENT
  // ================================================================
  refuseTruck(): void {
  if (!this.selectedTruck) return;

  // ✅ Statut ADMIN (utilisé pour les onglets Refoulés / Renvoyés)
  this.selectedTruck.statut = 'Annulé';

  // ✅ Statut métier avancé (gérant)
  this.selectedTruck.advancedStatus = 'REFUSE_EN_ATTENTE_GERANT';
  this.selectedTruck.refusedAt = new Date().toISOString();

  // Notification côté gérant
  this.selectedTruck.unreadForGerant = true;

  // Historique
  this.selectedTruck.history = this.selectedTruck.history || [];
  this.selectedTruck.history.push({
    event: 'Refus administrateur',
    by: 'admin',
    date: new Date().toISOString()
  });

  this.saveComment(this.selectedTruck.id, this.adminComment);

  this.saveTrucks();
  this.closeDetailsModal();
}

  // ================================================================
  // STATISTIQUES
  // ================================================================
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
    return this.trucks.filter((t: any) =>
      t.statut === 'Annulé' &&
      t.advancedStatus !== 'REFUSE_RENVOYE'
    ).length;
  }

  get nbRenvoyes(): number {
    return this.trucks.filter((t: any) =>
      t.statut === 'Annulé' &&
      t.advancedStatus === 'REFUSE_RENVOYE'
    ).length;
  }
}
