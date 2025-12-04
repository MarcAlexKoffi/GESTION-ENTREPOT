import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

export type TruckStatus =
  | 'Enregistré'
  | 'En attente'
  | 'Validé'
  | 'Refoulé'
  | 'Déchargé';

export type AdvancedTruckStatus =
  | 'REFUSE_EN_ATTENTE_GERANT'
  | 'REFUSE_RENVOYE'
  | 'REFUSE_REINTEGRE'
  | 'ACCEPTE_FINAL';

export interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

export interface StoredTruck {
  id: number;
  entrepotId: number;

  immatriculation: string;
  transporteur: string;
  transfert: string;
  coperative: string;

  kor: string;
  th: string;

  statut: TruckStatus;
  advancedStatus?: AdvancedTruckStatus;

  createdAt: string;
  heureArrivee: string;

  refusedAt?: string;
  validatedAt?: string;
  reintegratedAt?: string;
  renvoyeAt?: string;
  finalAcceptedAt?: string;

  unreadForGerant?: boolean;
  unreadForAdmin?: boolean;

  products?: {
    produit: string;
    categorie: string;
    poids: string;
    quantite: string;
    observations?: string;
  };

  history: {
    event: string;
    by: 'admin' | 'gerant';
    date: string;
  }[];

  showMenu?: boolean;
}

@Component({
  selector: 'app-user-entrepot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-entrepot.html',
  styleUrl: './user-entrepot.scss',
})
export class UserEntrepot implements OnInit {
  
  entrepot = { id: 0, nom: '', lieu: '' };

  trucks: StoredTruck[] = [];

  currentTab:
    | 'enregistres'
    | 'attente'
    | 'valides'
    | 'refoules'
    | 'acceptes'
    | 'historique' = 'enregistres';

  // Modales
  showEditModal = false;
  showAnalysisModal = false;
  showProductsModal = false;
  showHistoryModal = false;
  showModal = false;
  showSuccessBanner = false;

  lastSavedStatutLabel = '';

  // Formulaires initiaux
  newTruck = {
    immatriculation: '',
    transporteur: '',
    transfert: '',
    coperative: ''
  };

  selectedTruckForEdit: StoredTruck | null = null;
  selectedTruckForAnalysis: StoredTruck | null = null;
  selectedTruckForProducts: StoredTruck | null = null;
  selectedTruckForHistory: StoredTruck | null = null;

  editTruckData = { immatriculation: '', transporteur: '', transfert: '', coperative: '' };
  analysisData = { kor: '', th: '' };

  productForm = { produit: '', categorie: '', poids: '', quantite: '', observations: '' };

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.loadEntrepot();
    this.loadTrucksFromStorage();
  }

  // =========================================================
  // CHARGEMENT ENTREPT
  // =========================================================
  loadEntrepot(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
    const saved = localStorage.getItem('warehouses');
    let warehouses: StoredWarehouse[] = saved ? JSON.parse(saved) : [];

    if (warehouses.length === 0) {
      warehouses = [{ id: 1, name: 'Entrepôt Défaut', location: 'Non défini' }];
    }

    const found = warehouses.find((w) => w.id === idParam) ?? warehouses[0];

    this.entrepot = { id: found.id, nom: found.name, lieu: found.location };
  }

  // =========================================================
  // CHARGEMENT CAMIONS
  // =========================================================
  loadTrucksFromStorage(): void {
    const raw = localStorage.getItem('trucks');
    const all: StoredTruck[] = raw ? JSON.parse(raw) : [];
    this.trucks = all.filter((t) => t.entrepotId === this.entrepot.id);

    this.trucks.forEach((t) => {
      if (!t.history) t.history = [];
      if (!t.kor) t.kor = '';
      if (!t.th) t.th = '';
      if (t.showMenu === undefined) t.showMenu = false;
    });
  }

  saveTrucks(): void {
    const raw = localStorage.getItem('trucks');
    let all: StoredTruck[] = raw ? JSON.parse(raw) : [];

    all = all.filter((t) => t.entrepotId !== this.entrepot.id);
    all.push(...this.trucks);

    localStorage.setItem('trucks', JSON.stringify(all));
  }

  // =========================================================
  // HISTORIQUE
  // =========================================================
  addHistory(t: StoredTruck, event: string) {
    t.history.push({
      event,
      by: 'gerant',
      date: new Date().toISOString(),
    });
  }

  // =========================================================
  // ONGLET LISTES
  // =========================================================
  getList(): StoredTruck[] {
    switch (this.currentTab) {
      case 'enregistres':
        return this.trucks.filter((t) => t.statut === 'Enregistré');

      case 'attente':
        return this.trucks.filter((t) => t.statut === 'En attente');

      case 'valides':
        return this.trucks.filter((t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL');

      case 'refoules':
        return this.trucks.filter((t) => t.statut === 'Refoulé');

      case 'acceptes':
        return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL');

      case 'historique':
        return this.trucks.filter((t) => t.history.length > 0);

      default:
        return [];
    }
  }

  // =========================================================
  // AJOUT CAMION
  // =========================================================
  openModal() {
    this.showSuccessBanner = false;
    this.newTruck = {
      immatriculation: '',
      transporteur: '',
      transfert: '',
      coperative: ''
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveTruck() {
    if (
      !this.newTruck.immatriculation.trim() ||
      !this.newTruck.transporteur.trim() ||
      !this.newTruck.transfert.trim() ||
      !this.newTruck.coperative.trim()
    ) {
      alert('Veuillez remplir tous les champs.');
      return;
    }

    const now = new Date();

    const truck: StoredTruck = {
      id: Date.now(),
      entrepotId: this.entrepot.id,

      immatriculation: this.newTruck.immatriculation.trim(),
      transporteur: this.newTruck.transporteur.trim(),
      transfert: this.newTruck.transfert.trim(),
      coperative: this.newTruck.coperative.trim(),

      kor: '',
      th: '',

      statut: 'Enregistré',
      advancedStatus: undefined,

      createdAt: now.toISOString(),
      heureArrivee: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

      history: [
        { event: 'Camion enregistré', by: 'gerant', date: now.toISOString() }
      ]
    };

    this.trucks.push(truck);
    this.saveTrucks();

    this.lastSavedStatutLabel = 'Enregistré';
    this.showSuccessBanner = true;

    setTimeout(() => {
      this.showModal = false;
      this.showSuccessBanner = false;
    }, 1200);
  }

  // =========================================================
  // ÉDITION CAMION
  // =========================================================
  openEditModal(t: StoredTruck) {
    this.selectedTruckForEdit = t;
    this.editTruckData = {
      immatriculation: t.immatriculation,
      transporteur: t.transporteur,
      transfert: t.transfert,
      coperative: t.coperative,
    };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.selectedTruckForEdit) return;

    const t = this.selectedTruckForEdit;
    t.immatriculation = this.editTruckData.immatriculation.trim();
    t.transporteur = this.editTruckData.transporteur.trim();
    t.transfert = this.editTruckData.transfert.trim();
    t.coperative = this.editTruckData.coperative.trim();

    this.addHistory(t, 'Modification des informations');
    this.saveTrucks();
    this.showEditModal = false;
  }

  // =========================================================
  // ANALYSES
  // =========================================================
  openAnalysisModal(t: StoredTruck) {
    this.selectedTruckForAnalysis = t;
    this.analysisData = { kor: t.kor ?? '', th: t.th ?? '' };
    this.showAnalysisModal = true;
  }

  submitAnalysis() {
    if (!this.selectedTruckForAnalysis) return;

    const t = this.selectedTruckForAnalysis;
    t.kor = this.analysisData.kor.trim();
    t.th = this.analysisData.th.trim();
    t.statut = 'En attente';

    this.addHistory(t, 'Analyses envoyées à l’administrateur');
    this.saveTrucks();
    this.showAnalysisModal = false;
  }

  // =========================================================
  // PRODUITS (APRÈS VALIDATION)
  // =========================================================
  openProductsModal(t: StoredTruck) {
    this.selectedTruckForProducts = t;

    this.productForm = {
      produit: t.products?.produit ?? '',
      categorie: t.products?.categorie ?? '',
      poids: t.products?.poids ?? '',
      quantite: t.products?.quantite ?? '',
      observations: t.products?.observations ?? ''
    };

    this.showProductsModal = true;
  }

  saveProducts() {
    if (!this.selectedTruckForProducts) return;

    const t = this.selectedTruckForProducts;
    t.products = {
      produit: this.productForm.produit.trim(),
      categorie: this.productForm.categorie.trim(),
      poids: this.productForm.poids.trim(),
      quantite: this.productForm.quantite.trim(),
      observations: this.productForm.observations.trim(),
    };

    t.advancedStatus = 'ACCEPTE_FINAL';
    t.finalAcceptedAt = new Date().toISOString();

    this.addHistory(t, 'Détails produits renseignés');
    this.saveTrucks();
    this.showProductsModal = false;
  }

  // =========================================================
  // REFOULEMENT : RENVOYER PAR LE GÉRANT
  // =========================================================
  markAsRenvoye(t: StoredTruck) {
    t.advancedStatus = 'REFUSE_RENVOYE';
    t.renvoyeAt = new Date().toISOString();

    // NOTIFIER L’ADMIN
    t.unreadForAdmin = true;

    this.addHistory(t, 'Camion renvoyé par le gérant');
    this.saveTrucks();
  }

  // =========================================================
  // HISTORIQUE
  // =========================================================
  openHistoryModal(t: StoredTruck) {
    this.selectedTruckForHistory = t;
    this.showHistoryModal = true;
  }

  // =========================================================
  // STATISTIQUES
  // =========================================================
  get totalEnregistres() {
    return this.trucks.filter((t) => t.statut === 'Enregistré').length;
  }
  get totalEnAttente() {
    return this.trucks.filter((t) => t.statut === 'En attente').length;
  }
  get totalValides() {
    return this.trucks.filter((t) => t.statut === 'Validé').length;
  }
  get totalAcceptes() {
    return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }
  get totalRefoules() {
    return this.trucks.filter((t) => t.statut === 'Refoulé').length;
  }

  get historique() {
    return this.trucks.filter(t => t.history && t.history.length > 0);
  }
}
