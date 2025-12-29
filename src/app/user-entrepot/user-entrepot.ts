import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

export type TruckStatus =
  | 'Enregistré'
  | 'En attente'
  | 'Validé'
  | 'Refoulé'
  | 'Déchargé'
  | 'Annulé';

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
    numeroLot: string;
    nombreSacsDecharges: string;
    poidsBrut: string;
    poidsNet: string;
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

  currentTab: 'enregistres' | 'attente' | 'valides' | 'refoules' | 'acceptes' | 'historique' =
    'enregistres';

  // Modales
  showEditModal = false;
  showAnalysisModal = false;
  showProductsModal = false;
  showHistoryModal = false;
  showModal = false;
  showSuccessBanner = false;
  showDetailsModal = false;

  lastSavedStatutLabel = '';

  // Formulaires initiaux
  newTruck = {
    immatriculation: '',
    transporteur: '',
    transfert: '',
    coperative: '',
  };

  selectedTruckForEdit: StoredTruck | null = null;
  selectedTruckForAnalysis: StoredTruck | null = null;
  selectedTruckForProducts: StoredTruck | null = null;
  selectedTruckForHistory: StoredTruck | null = null;
  selectedTruckForDetails: StoredTruck | null = null;

  editTruckData = { immatriculation: '', transporteur: '', transfert: '', coperative: '' };
  analysisData = { kor: '', th: '' };

  productForm = {
    numeroCamion: '',
    numeroFicheTransfert: '',
    numeroLot: '',
    nombreSacsDecharges: '',
    poidsBrut: '',
    poidsNet: '',
    kor: '',
  };

  constructor(private route: ActivatedRoute) {}
// ===============================
// FILTRES (toolbar)
// ===============================
filterSearch = '';
selectedPeriod: 'all' | 'today' | '7days' | '30days' = 'today';
selectedStatus: 'all' | TruckStatus = 'all';

showPeriodMenu = false;
showStatusMenu = false;

filteredTrucks: StoredTruck[] = [];

get periodLabel(): string {
  switch (this.selectedPeriod) {
    case 'today': return "Aujourd'hui";
    case '7days': return '7 derniers jours';
    case '30days': return '30 derniers jours';
    default: return 'Toutes périodes';
  }
}

get statusLabel(): string {
  return this.selectedStatus === 'all' ? 'Tous statuts' : this.selectedStatus;
}

togglePeriodMenu(): void {
  this.showPeriodMenu = !this.showPeriodMenu;
  this.showStatusMenu = false;
}

toggleStatusMenu(): void {
  this.showStatusMenu = !this.showStatusMenu;
  this.showPeriodMenu = false;
}

setPeriod(p: 'all' | 'today' | '7days' | '30days'): void {
  this.selectedPeriod = p;
  this.showPeriodMenu = false;
  this.applyFilters();
}

setStatus(s: 'all' | TruckStatus): void {
  this.selectedStatus = s;
  this.showStatusMenu = false;
  this.applyFilters();
}

// Ancienne logique getList() renommée en "getBaseListForTab"
private getBaseListForTab(): StoredTruck[] {
  switch (this.currentTab) {
    case 'enregistres':
      return this.trucks.filter((t) => t.statut === 'Enregistré');

    case 'attente':
      return this.trucks.filter((t) => t.statut === 'En attente');

    case 'valides':
      return this.trucks.filter(
        (t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
      );

    case 'refoules':
      return this.trucks.filter(
        (t: any) =>
          t.statut === 'Refoulé' ||
          (t.statut === 'Annulé' &&
            (t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT' ||
              t.advancedStatus === 'REFUSE_RENVOYE'))
      );

    case 'acceptes':
      return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL');

    case 'historique':
      return this.trucks.filter((t) => t.history.length > 0);

    default:
      return [];
  }
}

applyFilters(): void {
  const base = this.getBaseListForTab();

  const search = this.filterSearch.trim().toLowerCase();
  const now = new Date();

  // helper date
  const isToday = (iso: string) => {
    const d = new Date(iso);
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  const inLastDays = (iso: string, days: number) => {
    const d = new Date(iso).getTime();
    const limit = now.getTime() - days * 24 * 60 * 60 * 1000;
    return d >= limit;
  };

  this.filteredTrucks = base.filter((t) => {
    // 1) Recherche
    if (search) {
      const haystack = (
        (t.immatriculation ?? '') + ' ' +
        (t.transporteur ?? '') + ' ' +
        (t.transfert ?? '') + ' ' +
        ((t as any).coperative ?? '')
      ).toLowerCase();

      if (!haystack.includes(search)) return false;
    }

    // 2) Statut
    if (this.selectedStatus !== 'all') {
      if (t.statut !== this.selectedStatus) return false;
    }

    // 3) Période (basée sur createdAt)
    if (this.selectedPeriod !== 'all') {
      if (!t.createdAt) return false;

      if (this.selectedPeriod === 'today' && !isToday(t.createdAt)) return false;
      if (this.selectedPeriod === '7days' && !inLastDays(t.createdAt, 7)) return false;
      if (this.selectedPeriod === '30days' && !inLastDays(t.createdAt, 30)) return false;
    }

    return true;
  });
}

  ngOnInit(): void {
    this.loadEntrepot();
    this.loadTrucksFromStorage();
    this.applyFilters();
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
        return this.trucks.filter(
          (t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
        );

      case 'refoules':
        return this.trucks.filter(
          (t: any) =>
            t.statut === 'Refoulé' ||
            (t.statut === 'Annulé' && t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT') ||
            (t.statut === 'Annulé' && t.advancedStatus === 'REFUSE_RENVOYE')
        );

      case 'acceptes':
        return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL');

      case 'historique':
        return this.trucks.filter((t) => t.history.length > 0);

      default:
        return [];
    }
  }
// =========================================================
// HEURE PAR CATÉGORIE (affichée dans la colonne "Heure")
// =========================================================
private formatHourFromIso(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

private findHistoryDate(truck: StoredTruck, event: string): string | undefined {
  const list = truck.history || [];
  // On cherche la dernière occurrence de cet event (plus récent)
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]?.event === event && list[i]?.date) return list[i].date;
  }
  return undefined;
}

/** Heure à afficher selon l’onglet actif */
getHourForCurrentTab(t: StoredTruck): string {
  // fallback : heureArrivee (ancienne logique) si vraiment rien
  const fallback = t.createdAt || '';

  switch (this.currentTab) {
    case 'enregistres': {
      const iso = this.findHistoryDate(t, 'Camion enregistré') || t.createdAt || fallback;
      return this.formatHourFromIso(iso);
    }

    case 'attente': {
      const iso =
        this.findHistoryDate(t, 'Analyses envoyées à l’administrateur') ||
        t.createdAt ||
        fallback;
      return this.formatHourFromIso(iso);
    }

    case 'valides': {
      const iso =
        // si tu remplis un jour validatedAt, il sera prioritaire
        (t as any).validatedAt ||
        this.findHistoryDate(t, 'Validation administrateur') ||
        t.createdAt ||
        fallback;
      return this.formatHourFromIso(iso);
    }

    case 'refoules': {
      const iso =
        (t as any).refusedAt ||
        this.findHistoryDate(t, 'Refus administrateur') ||
        t.createdAt ||
        fallback;
      return this.formatHourFromIso(iso);
    }

    case 'acceptes': {
      const iso =
        t.finalAcceptedAt ||
        this.findHistoryDate(t, 'Détails produits renseignés — Camion accepté') ||
        t.createdAt ||
        fallback;
      return this.formatHourFromIso(iso);
    }

    case 'historique': {
      const last = (t.history && t.history.length > 0) ? t.history[t.history.length - 1]?.date : undefined;
      return this.formatHourFromIso(last || t.createdAt || fallback);
    }

    default:
      return this.formatHourFromIso(t.createdAt || fallback);
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
      coperative: '',
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

      history: [{ event: 'Camion enregistré', by: 'gerant', date: now.toISOString() }],
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
      numeroCamion: t.immatriculation ?? '',
      numeroFicheTransfert: t.transfert ?? '',
      kor: t.kor ?? '',

      numeroLot: t.products?.numeroLot ?? '',
      nombreSacsDecharges: t.products?.nombreSacsDecharges ?? '',
      poidsBrut: t.products?.poidsBrut ?? '',
      poidsNet: t.products?.poidsNet ?? '',
    };

    this.showProductsModal = true;
  }

  saveProducts() {
    if (!this.selectedTruckForProducts) return;

    const t = this.selectedTruckForProducts;

    // Champs déjà existants dans ton camion
    t.immatriculation = (this.productForm.numeroCamion || '').trim();
    t.transfert = (this.productForm.numeroFicheTransfert || '').trim();
    t.kor = (this.productForm.kor || '').trim();

    // Champs produits
   const toStr = (v: any) => String(v ?? '').trim();

    // Champs produits (robustes même si l’input renvoie un number)
  t.products = {
  numeroLot: toStr(this.productForm.numeroLot),
  nombreSacsDecharges: toStr(this.productForm.nombreSacsDecharges),
  poidsBrut: toStr(this.productForm.poidsBrut),
  poidsNet: toStr(this.productForm.poidsNet),
};


    // Si tu avais déjà une logique métier après validation, garde-la.
    // (Ne supprime pas ce que tu avais : mets juste ces champs avant de sauvegarder.)
    // Marquer comme "Accepté définitivement" côté gérant
    t.advancedStatus = 'ACCEPTE_FINAL';
    t.finalAcceptedAt = new Date().toISOString();

    // Notifier l’admin (si tu utilises la cloche / pastille)
    t.unreadForAdmin = true;

    // Historique
    this.addHistory(t, 'Détails produits renseignés — Camion accepté');

    this.saveTrucks();
    this.showProductsModal = false;
  }

  // =========================================================
  // REFOULEMENT : RENVOYER PAR LE GÉRANT
  // =========================================================
  markAsRenvoye(t: StoredTruck) {
    //  Assure la compatibilité admin : l’admin classe par statut "Annulé"
    t.statut = 'Annulé';

    // Statut avancé : renvoyé
    t.advancedStatus = 'REFUSE_RENVOYE';
    t.renvoyeAt = new Date().toISOString();

    // Notifier l’admin
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
  openDetailsModal(t: StoredTruck) {
    this.selectedTruckForDetails = t;
    this.showDetailsModal = true;
  }

  printSelectedTruck() {
    if (!this.selectedTruckForDetails) return;

    const t = this.selectedTruckForDetails;

    const html = `
    <html>
      <head>
        <title>Fiche camion</title>
        <style>
          body { font-family: Arial; padding: 24px; }
          h2 { margin-bottom: 16px; }
          .row { margin-bottom: 8px; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Fiche camion acceptée</h2>
        <div class="row"><span class="label">Camion :</span> ${t.immatriculation}</div>
        <div class="row"><span class="label">Transfert :</span> ${t.transfert}</div>
        <div class="row"><span class="label">Lot :</span> ${t.products?.numeroLot ?? ''}</div>
        <div class="row"><span class="label">Sacs :</span> ${
          t.products?.nombreSacsDecharges ?? ''
        }</div>
        <div class="row"><span class="label">Poids brut :</span> ${
          t.products?.poidsBrut ?? ''
        }</div>
        <div class="row"><span class="label">Poids net :</span> ${t.products?.poidsNet ?? ''}</div>
        <div class="row"><span class="label">KOR :</span> ${t.kor}</div>
        <script>window.print()</script>
      </body>
    </html>
  `;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
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
  // Validés = Validé mais pas encore accepté
  return this.trucks.filter(
    (t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
  ).length;
}

  get totalAcceptes() {
    return this.trucks.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }
  get totalRefoules() {
    return this.trucks.filter(
      (t: any) =>
        t.statut === 'Refoulé' ||
        (t.statut === 'Annulé' &&
          (t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT' ||
            t.advancedStatus === 'REFUSE_RENVOYE'))
    ).length;
  }

  get historique() {
    return this.trucks.filter((t) => t.history && t.history.length > 0);
  }
}
