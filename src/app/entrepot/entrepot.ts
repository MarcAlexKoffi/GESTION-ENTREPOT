import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TruckService, Truck } from '../services/truck.service';
import { StoredWarehouse } from '../services/warehouse.service';

// type TruckStatus = ... (déjà dans TruckService via union string)
// interface Truck ... (importée)
// interface AdminComment ... (supprimée)

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
  searchTerm: string = '';
  selectedPeriod: 'today' | '7days' | '30days' | 'all' = 'today';

  // Ajout de la nouvelle catégorie RENVOYÉS
  currentTab: 'pending' | 'validated' | 'accepted' | 'cancelled' | 'renvoyes' = 'pending';

  showPeriodDropdown = false;
  showDetailsModal = false;
  showHistoryModal = false;
  historyTruck: Truck | null = null;

  trucks: Truck[] = [];
  selectedTruck: Truck | null = null;
  adminComment: string = '';

  private readonly truckStorageKey = 'trucks';
  // private readonly commentStorageKey = 'truckAdminComments'; // Plus utilisé

  constructor(private route: ActivatedRoute, private truckService: TruckService) {}

  ngOnInit(): void {
    const idParam = Number(this.route.snapshot.paramMap.get('id'));

    let warehouses: StoredWarehouse[] = [];
    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try {
        warehouses = JSON.parse(saved);
      } catch {}
    }

    if (warehouses.length === 0) {
      warehouses = [
        { id: 1, name: 'Entrepôt Lyon Sud', location: 'Corbas, Rhône-Alpes', imageUrl: '' },
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
    this.truckService.getTrucks(this.entrepot.id).subscribe({
      next: (data) => {
        this.trucks = data;
      },
      error: (err) => console.error('Erreur chargement camions', err),
    });
  }

  // private saveTrucks(): void { ... } // Supprimé
  private refreshView(): void {
    this.loadTrucks();
  }

  // ================================================================
  // COMMENTAIRES ADMIN
  // ================================================================
  // loadCommentForTruck et saveComment sont supprimés car intégrés dans l'objet Truck (metadata)

  // ================================================================
  // HEURE PAR CATÉGORIE (colonne "Heure arrivée")
  // ================================================================
  private formatHourFromIso(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private findHistoryDate(truck: Truck, event: string): string | undefined {
    const list = (truck as any).history || [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i]?.event === event && list[i]?.date) return list[i].date;
    }
    return undefined;
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
    if (this.selectedPeriod === '30days') {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return created.getTime() >= thirtyDaysAgo;
    }
    return true;
  }

  getHourForCurrentTab(t: Truck): string {
    const fallback = t.createdAt || '';

    switch (this.currentTab) {
      case 'pending': {
        const iso =
          this.findHistoryDate(t, 'Analyses envoyées à l’administrateur') ||
          t.createdAt ||
          fallback;
        return this.formatHourFromIso(iso);
      }

      case 'validated': {
        const iso = this.findHistoryDate(t, 'Validation administrateur') || t.createdAt || fallback;
        return this.formatHourFromIso(iso);
      }

      case 'accepted': {
        const iso =
          (t as any).finalAcceptedAt ||
          this.findHistoryDate(t, 'Détails produits renseignés — Camion accepté') ||
          t.createdAt ||
          fallback;
        return this.formatHourFromIso(iso);
      }

      case 'cancelled': {
        const iso =
          (t as any).refusedAt ||
          this.findHistoryDate(t, 'Refus administrateur') ||
          t.createdAt ||
          fallback;
        return this.formatHourFromIso(iso);
      }

      case 'renvoyes': {
        const iso =
          (t as any).renvoyeAt ||
          this.findHistoryDate(t, 'Camion renvoyé par le gérant') ||
          t.createdAt ||
          fallback;
        return this.formatHourFromIso(iso);
      }

      default:
        return this.formatHourFromIso(t.createdAt || fallback);
    }
  }

  // ================================================================
  // ONGLET
  // ================================================================
  setTab(tab: 'pending' | 'validated' | 'accepted' | 'cancelled' | 'renvoyes'): void {
    this.currentTab = tab;
  }

  get filteredTrucks(): Truck[] {
    const source = this.filteredTrucksBase;

    switch (this.currentTab) {
      case 'pending':
        return source.filter((t) => t.statut === 'En attente');

      case 'validated':
        return source.filter(
          (t: any) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
        );

      case 'accepted':
        return source.filter((t: any) => t.advancedStatus === 'ACCEPTE_FINAL');

      case 'cancelled':
        return source.filter(
          (t: any) => t.statut === 'Annulé' && t.advancedStatus !== 'REFUSE_RENVOYE'
        );

      case 'renvoyes':
        return source.filter(
          (t: any) => t.statut === 'Annulé' && t.advancedStatus === 'REFUSE_RENVOYE'
        );

      default:
        return [];
    }
  }

  get filteredTrucksBase(): Truck[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.trucks.filter((t) => {
      // 🔍 recherche texte
      if (search) {
        const haystack = `${t.immatriculation} ${t.transporteur}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      // période
      return this.isInSelectedPeriod(t.createdAt || '');
    });
  }
  get selectedPeriodLabel(): string {
    switch (this.selectedPeriod) {
      case 'today':
        return "Aujourd'hui";
      case '7days':
        return '7 derniers jours';
      case '30days':
        return '30 derniers jours';
      case 'all':
        return 'Toutes périodes';
      default:
        return 'Toutes périodes';
    }
  }
  // ================================================================
  // MODAL "VOIR PLUS"
  // ================================================================
  openDetailsModal(truck: Truck): void {
    this.selectedTruck = truck;

    // Charger le commentaire (stocké dans l'objet camion/metadata désormais)
    this.adminComment = truck.comment || '';

    // Si admin ouvre, on considère que la notification est lue
    if (truck.unreadForAdmin) {
      truck.unreadForAdmin = false;
      // Mise à jour API "silencieuse"
      this.truckService.updateTruck(truck.id, { unreadForAdmin: false }).subscribe();
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

    // Mise à jour des statuts
    const updates: Partial<Truck> = {
      statut: 'Validé',
      unreadForGerant: true,
      unreadForAdmin: false,
      comment: this.adminComment,
      history: [
        ...(this.selectedTruck.history || []),
        {
          event: 'Validation administrateur',
          by: 'admin',
          date: new Date().toISOString(),
        },
      ],
    };

    this.truckService.updateTruck(this.selectedTruck.id, updates).subscribe({
      next: () => {
        this.refreshView();
        this.closeDetailsModal();
      },
      error: (err) => alert('Erreur lors de la validation'),
    });
  }

  // ================================================================
  // REFOULEMENT
  // ================================================================
  refuseTruck(): void {
    if (!this.selectedTruck) return;

    const updates: Partial<Truck> = {
      statut: 'Annulé',
      advancedStatus: 'REFUSE_EN_ATTENTE_GERANT',
      refusedAt: new Date().toISOString(),
      unreadForGerant: true,
      unreadForAdmin: false,
      comment: this.adminComment,
      history: [
        ...(this.selectedTruck.history || []),
        {
          event: 'Refus administrateur',
          by: 'admin',
          date: new Date().toISOString(),
        },
      ],
    };

    this.truckService.updateTruck(this.selectedTruck.id, updates).subscribe({
      next: () => {
        this.refreshView();
        this.closeDetailsModal();
      },
      error: (err) => alert('Erreur lors du refus'),
    });
  }
  // ================================================================
  // HISTORIQUE (ADMIN) – même logique que côté user
  // ================================================================
  openHistoryModal(truck: Truck): void {
    this.historyTruck = truck;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.historyTruck = null;
  }
  // ================================================================
  // IMPRESSION CAMION
  // ================================================================
  printSelectedTruck(): void {
    if (!this.selectedTruck) return;

    const truck = this.selectedTruck;

    const content = `
    <h2>Détails du camion</h2>
    <p><strong>Immatriculation :</strong> ${truck.immatriculation}</p>
    <p><strong>Transporteur :</strong> ${truck.transporteur}</p>
    <p><strong>Coopérative :</strong> ${truck.coperative ?? '—'}</p>
    <p><strong>Entrepôt :</strong> ${this.entrepot.nom}</p>
    <p><strong>Statut :</strong> ${truck.statut}</p>
    <p><strong>Heure d’arrivée :</strong> ${truck.heureArrivee}</p>
  `;

    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;

    win.document.write(`
    <html>
      <head>
        <title>Impression camion</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h2 { margin-bottom: 16px; }
          p { margin: 6px 0; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
    </html>
  `);

    win.document.close();
  }

  // ================================================================
  // STATISTIQUES
  // ================================================================
  get totalCamionsArrives(): number {
    return this.filteredTrucksBase.length;
  }

  get nbPending(): number {
    return this.filteredTrucksBase.filter((t) => t.statut === 'En attente').length;
  }

  get nbValidated(): number {
    return this.filteredTrucksBase.filter(
      (t: any) => t.statut === 'Validé' && t.advancedStatus !== 'ACCEPTE_FINAL'
    ).length;
  }

  get nbAccepted(): number {
    return this.filteredTrucksBase.filter((t: any) => t.advancedStatus === 'ACCEPTE_FINAL').length;
  }

  get nbCancelled(): number {
    return this.filteredTrucksBase.filter(
      (t: any) => t.statut === 'Annulé' && t.advancedStatus !== 'REFUSE_RENVOYE'
    ).length;
  }

  get nbRenvoyes(): number {
    return this.filteredTrucksBase.filter(
      (t: any) => t.statut === 'Annulé' && t.advancedStatus === 'REFUSE_RENVOYE'
    ).length;
  }
  isAcceptedFinal(truck: Truck): boolean {
    return truck.advancedStatus === 'ACCEPTE_FINAL';
  }

  isValidatedOnly(truck: Truck): boolean {
    return truck.statut === 'Validé' && truck.advancedStatus !== 'ACCEPTE_FINAL';
  }

  isRefused(truck: Truck): boolean {
    return truck.statut === 'Annulé';
  }

  togglePeriodDropdown(): void {
    this.showPeriodDropdown = !this.showPeriodDropdown;
  }

  closePeriodDropdown(): void {
    this.showPeriodDropdown = false;
  }

  setPeriod(value: 'today' | '7days' | '30days' | 'all'): void {
    this.selectedPeriod = value;
    this.closePeriodDropdown();
  }
}
