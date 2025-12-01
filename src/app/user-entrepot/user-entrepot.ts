import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, RouterModule } from '@angular/router';

type TruckStatus =
  | 'Enregistre'
  | 'En attente'
  | 'Déchargé'
  | 'Annulé';

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

// structure minimale des entrepôts stockés dans localStorage
interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

@Component({
  selector: 'app-entrepot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-entrepot.html',
  styleUrl: './user-entrepot.scss',
})
export class UserEntrepot implements OnInit {
  // Entrepôt courant (utilisé dans le template)
  entrepot = {
    id: 0,
    nom: '',
    lieu: '',
  };

  // état UI
  showModal = false;
  showSuccessBanner = false;
  lastSavedStatutLabel: string | null = null;
  // Modal d'analyse
showAnalysisModal = false;

  currentTab: 'pending' | 'inProgress' | 'done' | 'cancelled' = 'pending';

  // liste des camions de CET entrepôt
  trucks: Truck[] = [];

  // formulaire camion
  newTruck = {
    immatriculation: '',
    transporteur: '',
    transfert: '',
    coperative: '',
    receptionStatus: 'Mise en attente' as 'Mise en attente' | 'Refouler',
  };
// Truck sélectionné pour l'analyse
selectedTruckForAnalysis: Truck | null = null;

// Formulaire d'analyse
analysisData = {
  kor: '',
  th: ''
};
  private readonly storageKey = 'trucks';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // 1) Récupérer l'id depuis l'URL
    const idParam = Number(this.route.snapshot.paramMap.get('id'));

    // 2) Charger la liste des entrepôts
    let warehouses: StoredWarehouse[] = [];

    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try {
        warehouses = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur de lecture du localStorage (warehouses)', e);
      }
    }

    // si rien en localStorage, on prévoit au moins un entrepôt par défaut
    if (warehouses.length === 0) {
      warehouses = [
        {
          id: 1,
          name: 'Entrepôt Lyon Sud',
          location: 'Corbas, Auvergne-Rhône-Alpes',
        },
      ];
    }

    // 3) Trouver l’entrepôt correspondant à l'id
    const found =
      warehouses.find((w) => w.id === idParam) ?? warehouses[0];

    this.entrepot = {
      id: found.id,
      nom: found.name,
      lieu: found.location,
    };

    // 4) Charger les camions de CET entrepôt
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
openAnalysisModal(truck: Truck): void {
  this.selectedTruckForAnalysis = truck;
  this.analysisData = { kor: '', th: '' };
  this.showAnalysisModal = true;
}

closeAnalysisModal(): void {
  this.showAnalysisModal = false;
}

  // ---------------------------------------------------------------------------
  // Statistiques
  // ---------------------------------------------------------------------------
  get totalCamionsArrives(): number {
    return this.trucks.length;
  }

  get nbEnAttente(): number {
    return this.trucks.filter((t) => t.statut === 'Enregistre').length;
  }

  get nbEnCours(): number {
    return this.trucks.filter(
      (t) => t.statut === 'En attente'
    ).length;
  }

  get nbDecharges(): number {
    return this.trucks.filter((t) => t.statut === 'Déchargé').length;
  }

  get nbRefoules(): number {
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
        return this.trucks.filter((t) => t.statut === 'Enregistre');
      case 'inProgress':
        return this.trucks.filter(
          (t) => t.statut === 'En attente'
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
    if (truck.statut !== 'Enregistre') {
      return;
    }
    this.updateTruckStatus(truck, 'En attente');
  }

  markAsDischarged(truck: Truck): void {
    if (truck.statut !== 'En attente') {
      return;
    }
    this.updateTruckStatus(truck, 'Déchargé');
  }
submitAnalysis(): void {
  if (!this.analysisData.kor.trim() || !this.analysisData.th.trim()) {
    alert("Merci de remplir KOR et TH.");
    return;
  }

  if (!this.selectedTruckForAnalysis) return;

  // On met à jour les données du camion
  this.selectedTruckForAnalysis.kor = this.analysisData.kor.trim();
  (this.selectedTruckForAnalysis as any).th = this.analysisData.th.trim(); // champ ajouté
  this.selectedTruckForAnalysis.statut = 'En attente';

  // Sauvegarde dans le localStorage
  this.saveTrucksToStorage();

  // Fermeture du modal
  this.showAnalysisModal = false;
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
        : 'Enregistre';

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
      kor: this.newTruck.coperative.trim(),
      coperative: this.newTruck.coperative.trim(),
      statut: statutCamion,
      heureArrivee,
      entrepotId: this.entrepot.id,
      createdAt: maintenant.toISOString(),
    };

    this.trucks.push(truck);
    this.saveTrucksToStorage();

    this.lastSavedStatutLabel =
      statutCamion === 'Annulé' ? 'REFOULÉ' : 'EN ATTENTE';

    this.newTruck = {
      immatriculation: '',
      transporteur: '',
      transfert: '',
      coperative: '',
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
