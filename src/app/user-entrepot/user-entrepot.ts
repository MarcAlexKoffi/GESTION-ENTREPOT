import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

import { TruckService, Truck } from '../services/truck.service';
import { WarehouseService, StoredWarehouse } from '../services/warehouse.service';

type UITruck = Truck & { showMenu?: boolean };

@Component({
  selector: 'app-user-entrepot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-entrepot.html',
  styleUrl: './user-entrepot.scss',
})
export class UserEntrepot implements OnInit {
  entrepot = { id: 0, nom: '', lieu: '' };

  trucks: UITruck[] = [];

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
    cooperative: '',
  };

  selectedTruckForEdit: UITruck | null = null;
  selectedTruckForAnalysis: UITruck | null = null;
  selectedTruckForProducts: UITruck | null = null;
  selectedTruckForHistory: UITruck | null = null;
  selectedTruckForDetails: UITruck | null = null;

  editTruckData = { immatriculation: '', transporteur: '', transfert: '', cooperative: '' };
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

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private truckService = inject(TruckService);
  private warehouseService = inject(WarehouseService);

  constructor() {}
  // ===============================
  // FILTRES (toolbar)
  // ===============================
  filterSearch = '';
  selectedPeriod: 'all' | 'today' | '7days' | '30days' = 'today';
  selectedStatus: 'all' | string = 'all';

  showPeriodMenu = false;
  showStatusMenu = false;

  filteredTrucks: UITruck[] = [];

  get periodLabel(): string {
    switch (this.selectedPeriod) {
      case 'today':
        return "Aujourd'hui";
      case '7days':
        return '7 derniers jours';
      case '30days':
        return '30 derniers jours';
      default:
        return 'Toutes périodes';
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

  setStatus(s: 'all' | string): void {
    this.selectedStatus = s;
    this.showStatusMenu = false;
    this.applyFilters();
  }

  private isInSelectedPeriod(dateIso: string): boolean {
    if (this.selectedPeriod === 'all') return true;

    const created = new Date(dateIso);
    const now = new Date();

    if (this.selectedPeriod === 'today') {
      return created.toDateString() === now.toDateString();
    }

    if (this.selectedPeriod === '7days') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return created.getTime() >= sevenDaysAgo;
    }

    return true;
  }

  // Ancienne logique getList() renommée en "getBaseListForTab"
  private getBaseListForTab(): UITruck[] {
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
        return this.trucks.filter((t) => t.history && t.history.length > 0);

      default:
        return [];
    }
  }

  applyFilters(): void {
    const base = this.getBaseListForTab();

    console.log('[user-entrepot] applyFilters - currentTab=', this.currentTab, 'selectedPeriod=', this.selectedPeriod, 'selectedStatus=', this.selectedStatus, 'baseCount=', base.length);

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
          (t.immatriculation ?? '') +
          ' ' +
          (t.transporteur ?? '') +
          ' ' +
          (t.transfert ?? '') +
          ' ' +
          ((t as any).cooperative ?? '')
        ).toLowerCase();

        if (!haystack.includes(search)) return false;
      }

      // 2) Statut
      if (this.selectedStatus !== 'all') {
        if (t.statut !== this.selectedStatus) return false;
      }

      // 3) Période (basée sur heureArrivee car createdAt est souvent null en base)
      if (this.selectedPeriod !== 'all') {
        const dateToFilter = t.heureArrivee || '';
        if (!dateToFilter) return false;

        if (this.selectedPeriod === 'today' && !isToday(dateToFilter)) return false;
        if (this.selectedPeriod === '7days' && !inLastDays(dateToFilter, 7)) return false;
        if (this.selectedPeriod === '30days' && !inLastDays(dateToFilter, 30)) return false;
      }

      return true;
    });

    console.log('[user-entrepot] applyFilters - result filteredTrucks.length=', this.filteredTrucks.length);
  }

  ngOnInit(): void {
<<<<<<< HEAD
    console.log('[user-entrepot] ngOnInit - start, entrepot.id =', this.entrepot.id);
    this.loadEntrepot();
    console.log('[user-entrepot] ngOnInit - called loadEntrepot(), entrepot.id =', this.entrepot.id);
    console.log('[user-entrepot] ngOnInit - waiting for entrepot to load before trucks');
=======
    this.route.paramMap.subscribe((params) => {
      const idParam = Number(params.get('id'));
      this.loadEntrepot(idParam);
    });
>>>>>>> 681946aaf0fd1ba0f6cc53e250d906c7bd6ccb00
  }

  private refreshView(): void {
    this.loadTrucks();
  }

<<<<<<< HEAD
  // =========================================================
  // LOCAL STORAGE FALLBACK (per warehouse)
  // =========================================================
  private loadTrucksFromStorage(): void {
    const raw = localStorage.getItem('trucks');
    const all: UITruck[] = raw ? JSON.parse(raw) : [];
    // Keep only trucks for current entrepot (coerce to Number)
    this.trucks = all
      .filter((t) => Number(t.entrepotId) === Number(this.entrepot.id))
      .map((t) => ({ ...t, showMenu: false }));

    this.trucks.forEach((t) => {
      if (!t.history) t.history = [];
      if (!t.kor) t.kor = '';
      if (!t.th) t.th = '';
      if (t.showMenu === undefined) t.showMenu = false;
    });

    this.applyFilters();
  }

  private saveTrucksToStorage(): void {
    const raw = localStorage.getItem('trucks');
    let all: UITruck[] = raw ? JSON.parse(raw) : [];

    // Remove trucks belonging to this entrepot and replace with current list
    all = all.filter((t) => Number(t.entrepotId) !== Number(this.entrepot.id));

    // Save copies without UI-only fields
    const toSave = this.trucks.map((t) => {
      const copy: any = { ...t };
      delete copy.showMenu;
      return copy;
    });

    all.push(...toSave);
    localStorage.setItem('trucks', JSON.stringify(all));
  }

  // =========================================================
  // CHARGEMENT ENTREPT
  // =========================================================
  loadEntrepot(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));
=======
  loadEntrepot(idParam: number): void {
    // SÉCURITÉ : Vérifier que l'utilisateur a le droit d'accéder à cet entrepôt
    const rawUser = localStorage.getItem('currentUser');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        // FORCE CONVERSION TO NUMBER FOR COMPARISON
        const userEntrepotId = Number(user.entrepotId);

        // Only check for operators
        if (user.role === 'operator' && userEntrepotId !== idParam) {
          console.warn(`Accès refusé : User(${userEntrepotId}) vs Route(${idParam})`);
          this.router.navigate(['/userdashboard/userentrepot', userEntrepotId]);
          return;
        }
      } catch (e) {}
    }
>>>>>>> 681946aaf0fd1ba0f6cc53e250d906c7bd6ccb00

    console.log('[user-entrepot] loadEntrepot - idParam=', idParam);
    this.warehouseService.getWarehouse(idParam).subscribe({
<<<<<<< HEAD
      next: (w) => {
        console.log('[user-entrepot] loadEntrepot - API returned', w);
        this.entrepot = { id: w.id, nom: w.name, lieu: w.location };
        console.log('[user-entrepot] loadEntrepot - this.entrepot now', this.entrepot);
        // maintenant que l'entrepôt est chargé, charger les camions
        try { localStorage.setItem('lastVisitedEntrepot', String(this.entrepot.id)); } catch (e) { /* ignore */ }
=======
      next: (w: StoredWarehouse) => {
        this.entrepot = { id: w.id, nom: w.name, lieu: w.location };
        // Une fois l'entrepôt chargé, on charge les camions
>>>>>>> 681946aaf0fd1ba0f6cc53e250d906c7bd6ccb00
        this.loadTrucks();
      },
      error: (err: any) => {
        console.error('Erreur chargement entrepôt', err);
      },
    });
  }

  loadTrucks(): void {
<<<<<<< HEAD
    console.log('[user-entrepot] loadTrucks - requesting trucks for entrepotId=', this.entrepot.id);
    this.truckService.getTrucks(this.entrepot.id).subscribe({
      next: (data) => {
        console.log('[user-entrepot] loadTrucks - received', data?.length, 'trucks from API');
        // Force filter by entrepotId in case backend returns extras
        const filtered = (data || []).filter((t) => Number(t.entrepotId) === Number(this.entrepot.id));
        this.trucks = filtered.map((t) => ({ ...t, showMenu: false }));
=======
    console.log('UserEntrepot: loading trucks for ID:', this.entrepot.id);
    if (!this.entrepot.id) return;
    this.truckService.getTrucks(this.entrepot.id).subscribe({
      next: (data: Truck[]) => {
        this.trucks = data.map((t) => ({ ...t, showMenu: false }));
>>>>>>> 681946aaf0fd1ba0f6cc53e250d906c7bd6ccb00
        this.applyFilters();
        // persist a local copy per-warehouse
        try {
          this.saveTrucksToStorage();
        } catch (e) {
          console.warn('Could not save trucks to localStorage', e);
        }
        console.log('[user-entrepot] loadTrucks - after applyFilters, filteredTrucks.length=', this.filteredTrucks.length);
      },
      error: (err) => {
        console.error('Erreur loading trucks, falling back to localStorage', err);
        this.loadTrucksFromStorage();
      },
<<<<<<< HEAD
=======
      error: (err: any) => console.error('Erreur loading trucks', err),
>>>>>>> 681946aaf0fd1ba0f6cc53e250d906c7bd6ccb00
    });
  }

  // saveTrucks supprimé (remplacé par API)

  // =========================================================
  // HISTORIQUE
  // =========================================================
  // =========================================================
  // HISTORIQUE
  // =========================================================
  addHistory(t: UITruck, event: string) {
    if (!t.history) t.history = [];
    t.history.push({
      event,
      by: 'gerant',
      date: new Date().toISOString(),
    });
  }

  // =========================================================
  // ONGLET LISTES
  // =========================================================
  getList(): UITruck[] {
    const source = this.trucksByPeriod;

    switch (this.currentTab) {
      case 'enregistres':
        return source.filter((t) => t.statut === 'Enregistré');

      case 'attente':
        return source.filter((t) => t.statut === 'En attente');

      case 'valides':
        return source.filter((t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL');

      case 'refoules':
        return source.filter(
          (t: any) =>
            t.statut === 'Refoulé' ||
            (t.statut === 'Annulé' &&
              (t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT' ||
                t.advancedStatus === 'REFUSE_RENVOYE'))
        );

      case 'acceptes':
        return source.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL');

      case 'historique':
        return source.filter((t) => t.history && t.history.length > 0);

      default:
        return [];
    }
  }
  get trucksByPeriod(): UITruck[] {
    return this.trucks.filter((t) => this.isInSelectedPeriod(t.heureArrivee || ''));
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

  private findHistoryDate(truck: UITruck, event: string): string | undefined {
    const list = truck.history || [];
    // On cherche la dernière occurrence de cet event (plus récent)
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.event === event && list[i]?.date) return list[i].date;
    }
    return undefined;
  }

  /** Heure à afficher selon l’onglet actif */
  getHourForCurrentTab(t: UITruck): string {
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
        const last =
          t.history && t.history.length > 0 ? t.history[t.history.length - 1]?.date : undefined;
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
      cooperative: '',
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveTruck() {
    if (!this.newTruck.immatriculation.trim() || !this.newTruck.transporteur.trim()) {
      alert('Veuillez au moins l’immatriculation et le transporteur.');
      return;
    }

    if (!this.entrepot.id) {
      alert('Entrepôt non chargé, impossible de créer le camion.');
      return;
    }

    const now = new Date();
    // note: 'Enregistré' n'est pas dans le type strict, on triche ou on change le type
    const statutInit = 'Enregistré' as any;

    const truckPayload: Partial<Truck> = {
      entrepotId: this.entrepot.id,
      immatriculation: this.newTruck.immatriculation.trim(),
      transporteur: this.newTruck.transporteur.trim(),
      transfert: this.newTruck.transfert.trim(),
      cooperative: this.newTruck.cooperative.trim(),

      kor: '',
      th: '',

      statut: statutInit,
      heureArrivee: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      history: [{ event: 'Camion enregistré', by: 'gerant', date: now.toISOString() }],
    };

    console.log('Sending payload:', truckPayload);

    this.truckService.createTruck(truckPayload).subscribe({
      next: (created) => {
        // Backend may return only { id: ... } — build a full UI truck locally
        const nowIso = new Date().toISOString();
        const uiTruck: UITruck = {
          id: (created && (created as any).id) || Math.floor(Math.random() * -1000000),
          entrepotId: truckPayload.entrepotId!,
          immatriculation: (truckPayload.immatriculation as string) || '',
          transporteur: (truckPayload.transporteur as string) || '',
          transfert: (truckPayload.transfert as string) || '',
          coperative: (truckPayload.coperative as string) || '',
          kor: truckPayload.kor || '',
          th: truckPayload.th || '',
          statut: (truckPayload.statut as any) || ('Enregistré' as any),
          heureArrivee: truckPayload.heureArrivee || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          history: truckPayload.history || [],
          createdAt: nowIso,
          showMenu: false,
        };

        // Insert at top and refresh filters/stats
        this.trucks = [uiTruck, ...this.trucks];
        this.applyFilters();

        // Persist locally as well so each entrepot keeps its own list
        try {
          this.saveTrucksToStorage();
        } catch (e) {
          console.warn('Could not save created truck to localStorage', e);
        }

        this.lastSavedStatutLabel = 'Enregistré';
        this.showSuccessBanner = true;
        setTimeout(() => {
          this.showModal = false;
          this.showSuccessBanner = false;
        }, 1200);
      },
      error: (err) => {
        console.error('API createTruck failed, saving locally', err);
        // Fallback: save locally so this entrepot still sees its trucks
        const nowIso = new Date().toISOString();
        const uiTruck: UITruck = {
          id: Math.floor(Math.random() * -1000000),
          entrepotId: truckPayload.entrepotId!,
          immatriculation: (truckPayload.immatriculation as string) || '',
          transporteur: (truckPayload.transporteur as string) || '',
          transfert: (truckPayload.transfert as string) || '',
          coperative: (truckPayload.coperative as string) || '',
          kor: truckPayload.kor || '',
          th: truckPayload.th || '',
          statut: (truckPayload.statut as any) || ('Enregistré' as any),
          heureArrivee: truckPayload.heureArrivee || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          history: truckPayload.history || [],
          createdAt: nowIso,
          showMenu: false,
        };

        this.trucks = [uiTruck, ...this.trucks];
        this.applyFilters();
        try {
          this.saveTrucksToStorage();
          alert('Camion enregistré localement (mode hors-ligne)');
        } catch (e) {
          console.error('Failed to save truck locally', e);
          alert(err.error?.message || 'Erreur création camion');
        }
      },
    });
  }

  // =========================================================
  // ÉDITION CAMION
  // =========================================================
  openEditModal(t: UITruck) {
    if (t.unreadForGerant) {
      t.unreadForGerant = false;
      this.truckService.updateTruck(t.id, { unreadForGerant: false }).subscribe();
    }
    this.selectedTruckForEdit = t;
    this.editTruckData = {
      immatriculation: t.immatriculation,
      transporteur: t.transporteur,
      transfert: t.transfert || '',
      cooperative: t.cooperative || '',
    };
    this.showEditModal = true;
  }

  saveEdit() {
    if (!this.selectedTruckForEdit) return;

    const t = this.selectedTruckForEdit;
    // Mise à jour locale pour l'historique
    t.immatriculation = this.editTruckData.immatriculation.trim();
    t.transporteur = this.editTruckData.transporteur.trim();
    t.transfert = this.editTruckData.transfert.trim();
    t.cooperative = this.editTruckData.cooperative.trim();

    this.addHistory(t, 'Modification des informations');

    // API call
    const updates: Partial<Truck> = {
      immatriculation: t.immatriculation,
      transporteur: t.transporteur,
      transfert: t.transfert,
      cooperative: t.cooperative,
      history: t.history,
    };

    this.truckService.updateTruck(t.id, updates).subscribe({
      next: () => {
        this.showEditModal = false;
        this.refreshView();
      },
      error: () => alert('Erreur modification'),
    });
  }

  // =========================================================
  // ANALYSES
  // =========================================================
  openAnalysisModal(t: UITruck) {
    if (t.unreadForGerant) {
      t.unreadForGerant = false;
      this.truckService.updateTruck(t.id, { unreadForGerant: false }).subscribe();
    }
    this.selectedTruckForAnalysis = t;
    this.analysisData = { kor: t.kor ?? '', th: t.th ?? '' };
    this.showAnalysisModal = true;
  }

  submitAnalysis() {
    if (!this.selectedTruckForAnalysis) return;

    const t = this.selectedTruckForAnalysis;
    // Local update
    t.kor = this.analysisData.kor.trim();
    t.th = this.analysisData.th.trim();
    t.statut = 'En attente';

    this.addHistory(t, 'Analyses envoyées à l’administrateur');

    // API
    const updates: Partial<Truck> = {
      kor: t.kor,
      th: t.th,
      statut: 'En attente',
      history: t.history,
    };

    this.truckService.updateTruck(t.id, updates).subscribe({
      next: () => {
        this.showAnalysisModal = false;
        this.refreshView();
      },
      error: () => alert('Erreur envoi analyses'),
    });
  }

  // =========================================================
  // PRODUITS (APRÈS VALIDATION)
  // =========================================================
  openProductsModal(t: UITruck) {
    if (t.unreadForGerant) {
      t.unreadForGerant = false;
      this.truckService.updateTruck(t.id, { unreadForGerant: false }).subscribe();
    }
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

  // Helper pour marquer comme lu lors de l'ouverture du menu contextuel
  markAsRead(t: UITruck) {
    if (t.unreadForGerant) {
      t.unreadForGerant = false;
      this.truckService.updateTruck(t.id, { unreadForGerant: false }).subscribe();
    }
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
    t.advancedStatus = 'ACCEPTE_FINAL';
    t.finalAcceptedAt = new Date().toISOString();

    // Notifier l’admin
    t.unreadForAdmin = true;

    // Historique
    this.addHistory(t, 'Détails produits renseignés — Camion accepté');

    const updates: Partial<Truck> = {
      immatriculation: t.immatriculation,
      transfert: t.transfert,
      kor: t.kor,
      products: t.products,
      advancedStatus: 'ACCEPTE_FINAL',
      finalAcceptedAt: t.finalAcceptedAt,
      unreadForAdmin: true,
      history: t.history,
    };

    this.truckService.updateTruck(t.id, updates).subscribe({
      next: () => {
        this.showProductsModal = false;
        this.refreshView();
      },
      error: () => alert('Erreur sauvegarde produits'),
    });
  }

  // =========================================================
  // REFOULEMENT : RENVOYER PAR LE GÉRANT
  // =========================================================
  markAsRenvoye(t: UITruck) {
    //  Assure la compatibilité admin : l’admin classe par statut "Annulé"
    t.statut = 'Annulé';

    // Statut avancé : renvoyé
    t.advancedStatus = 'REFUSE_RENVOYE';
    t.renvoyeAt = new Date().toISOString();

    // Notifier l’admin
    t.unreadForAdmin = true;

    this.addHistory(t, 'Camion renvoyé par le gérant');

    const updates: Partial<Truck> = {
      statut: 'Annulé',
      advancedStatus: 'REFUSE_RENVOYE',
      renvoyeAt: t.renvoyeAt,
      unreadForAdmin: true,
      history: t.history,
    };

    this.truckService.updateTruck(t.id, updates).subscribe({
      next: () => this.refreshView(),
      error: () => alert('Erreur renvoi'),
    });
  }

  // =========================================================
  // HISTORIQUE
  // =========================================================
  openHistoryModal(t: UITruck) {
    this.selectedTruckForHistory = t;
    this.showHistoryModal = true;
  }
  openDetailsModal(t: UITruck) {
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
    return this.trucksByPeriod.filter((t) => t.statut === 'Enregistré').length;
  }
  get totalEnAttente() {
    return this.trucksByPeriod.filter((t) => t.statut === 'En attente').length;
  }
  get totalValides() {
    // Validés = Validé mais pas encore accepté
    return this.trucksByPeriod.filter((t) => t.statut === 'Validé').length;
  }

  get totalAcceptes() {
    return this.trucksByPeriod.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }
  get totalRefoules() {
    return this.trucksByPeriod.filter(
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

  get nbValidesByPeriod(): number {
    return this.trucksByPeriod.filter(
      (t) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
    ).length;
  }

  get nbEnregistresByPeriod(): number {
    return this.trucksByPeriod.filter((t) => t.statut === 'Enregistré').length;
  }

  get nbAttenteByPeriod(): number {
    return this.trucksByPeriod.filter((t) => t.statut === 'En attente').length;
  }

  get nbRefoulesByPeriod(): number {
    return this.trucksByPeriod.filter(
      (t: any) =>
        t.statut === 'Refoulé' ||
        (t.statut === 'Annulé' &&
          (t.advancedStatus === 'REFUSE_EN_ATTENTE_GERANT' ||
            t.advancedStatus === 'REFUSE_RENVOYE'))
    ).length;
  }

  get nbAcceptesByPeriod(): number {
    return this.trucksByPeriod.filter((t) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }
}
