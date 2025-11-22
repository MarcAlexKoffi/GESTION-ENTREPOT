import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type TruckStatus =
  | 'En attente'
  | 'En cours de déchargement'
  | 'Déchargé'
  | 'Annulé';

interface Truck {
  id: number;
  immatriculation: string;
  transporteur: string;
  transfert: string;
  kor: string;
  statut: TruckStatus;
  heureArrivee: string;
  entrepotId: number;
  createdAt: string;
}

@Component({
  selector: 'app-entrepot',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './entrepot.html',
  styleUrl: './entrepot.scss',
})
export class Entrepot {
  // --- configuration / contexte entrepôt (à adapter plus tard avec la vraie donnée) ---
  entrepot = {
    id: 1,
    nom: 'Entrepôt Sud Lyon',
    lieu: 'Lyon, France',
  };

  // --- état UI ---
  showModal = false;
  showSuccessBanner = false;
  lastSavedStatutLabel: string | null = null;

  currentTab: 'pending' | 'inProgress' | 'done' | 'cancelled' = 'pending';

  // --- liste des camions de cet entrepôt ---
  trucks: Truck[] = [];

  // --- formulaire du camion en cours de saisie ---
  newTruck = {
    immatriculation: '',
    transporteur: '',
    transfert: '',
    kor: '',
    receptionStatus: 'Mise en attente' as 'Mise en attente' | 'Refouler',
  };

  private readonly storageKey = 'trucks';

  constructor() {
    this.loadTrucksFromStorage();
  }

  // ---------------------------------------------------------------------------
  // Gestion de la modale
  // ---------------------------------------------------------------------------
  openModal(): void {
    this.showModal = true;
    this.showSuccessBanner = false;
    this.lastSavedStatutLabel = null;
  }

  closeModal(): void {
    this.showModal = false;
  }

  // ---------------------------------------------------------------------------
  // Statistiques
  // ---------------------------------------------------------------------------
  get totalCamionsArrives(): number {
    return this.trucks.length;
  }

  get nbEnAttente(): number {
    return this.trucks.filter((t) => t.statut === 'En attente').length;
  }

  get nbEnCours(): number {
    return this.trucks.filter(
      (t) => t.statut === 'En cours de déchargement'
    ).length;
  }

  get nbDecharges(): number {
    return this.trucks.filter((t) => t.statut === 'Déchargé').length;
  }

  get nbRefoules(): number {
    // on stocke les refoulés avec le statut "Annulé"
    return this.trucks.filter((t) => t.statut === 'Annulé').length;
  }

  // ---------------------------------------------------------------------------
  // Filtrage par onglet
  // ---------------------------------------------------------------------------
  setTab(tab: 'pending' | 'inProgress' | 'done' | 'cancelled'): void {
    this.currentTab = tab;
  }

  get filteredTrucks(): Truck[] {
    switch (this.currentTab) {
      case 'pending':
        return this.trucks.filter((t) => t.statut === 'En attente');
      case 'inProgress':
        return this.trucks.filter(
          (t) => t.statut === 'En cours de déchargement'
        );
      case 'done':
        return this.trucks.filter((t) => t.statut === 'Déchargé');
      case 'cancelled':
        return this.trucks.filter((t) => t.statut === 'Annulé');
      default:
        return this.trucks;
    }
  }

  // ---------------------------------------------------------------------------
  // Actions sur un camion
  // ---------------------------------------------------------------------------
  startUnloading(truck: Truck): void {
    if (truck.statut !== 'En attente') {
      return;
    }
    this.updateTruckStatus(truck, 'En cours de déchargement');
  }

  markAsDischarged(truck: Truck): void {
    if (truck.statut !== 'En cours de déchargement') {
      return;
    }
    this.updateTruckStatus(truck, 'Déchargé');
  }

  private updateTruckStatus(truck: Truck, newStatus: TruckStatus): void {
    truck.statut = newStatus;
    this.saveTrucksToStorage();
  }

  // ---------------------------------------------------------------------------
  // Enregistrement d'un nouveau camion
  // ---------------------------------------------------------------------------
  saveTruck(): void {
    if (!this.newTruck.immatriculation.trim()) {
      return;
    }

    const statutCamion: TruckStatus =
      this.newTruck.receptionStatus === 'Refouler'
        ? 'Annulé'
        : 'En attente';

    const maintenant = new Date();
    const heureArrivee = maintenant.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const truck: Truck = {
      id: Date.now(),
      immatriculation: this.newTruck.immatriculation.trim(),
      transporteur: this.newTruck.transporteur.trim(),
      transfert: this.newTruck.transfert.trim(),
      kor: this.newTruck.kor.trim(),
      statut: statutCamion,
      heureArrivee,
      entrepotId: this.entrepot.id,
      createdAt: maintenant.toISOString(),
    };

    this.trucks.push(truck);
    this.saveTrucksToStorage();

    // mémorise le statut pour le bandeau de confirmation
    this.lastSavedStatutLabel =
      statutCamion === 'Annulé' ? 'REFOULÉ' : 'EN ATTENTE';

    // réinitialisation du formulaire
    this.newTruck = {
      immatriculation: '',
      transporteur: '',
      transfert: '',
      kor: '',
      receptionStatus: 'Mise en attente',
    };

    this.showSuccessBanner = true;
  }

  // ---------------------------------------------------------------------------
  // Persistance dans le localStorage
  // ---------------------------------------------------------------------------
  private loadTrucksFromStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      this.trucks = [];
      return;
    }

    try {
      const all: Truck[] = JSON.parse(raw);
      this.trucks = all.filter((t) => t.entrepotId === this.entrepot.id);
    } catch (e) {
      console.error('Erreur de lecture du localStorage (trucks)', e);
      this.trucks = [];
    }
  }

  private saveTrucksToStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    let all: Truck[] = [];
    if (raw) {
      try {
        all = JSON.parse(raw);
      } catch {
        all = [];
      }
    }

    // on remplace tous les camions de cet entrepôt
    all = all.filter((t) => t.entrepotId !== this.entrepot.id);
    all.push(...this.trucks);

    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }
}
