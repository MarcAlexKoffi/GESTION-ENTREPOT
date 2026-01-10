import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TruckService, Truck } from '../services/truck.service';
import { WarehouseService, StoredWarehouse } from '../services/warehouse.service';

type TruckStatus = Truck['statut'];

interface TruckHistoryRow {
  entrepotId: number;
  entrepotName: string;
  immatriculation: string;
  transporteur: string;
  kor: string;
  heureArrivee: string;
  debutDechargement: string;
  finDechargement: string;
  statut: TruckStatus;
  createdAt: string; // utile pour le filtre par période
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historique.html',
  styleUrl: './historique.scss',
})
export class Historique implements OnInit {
  // toutes les lignes (avant filtre)
  allRows: TruckHistoryRow[] = [];

  // lignes après filtre (celles affichées dans le tableau)
  filteredRows: TruckHistoryRow[] = [];

  // champs de filtre
  searchTerm = '';
  selectedWarehouseId: number | 'all' = 'all';
  selectedStatus: TruckStatus | 'all' = 'all';
  selectedPeriod: 'today' | '7days' | 'all' = 'all';

  // options pour la liste des entrepôts
  warehousesOptions: StoredWarehouse[] = [];

  constructor(private truckService: TruckService, private warehouseService: WarehouseService) {}

  ngOnInit(): void {
    this.loadData();
  }

  // Charge les entrepôts + camions depuis l'API
  private loadData(): void {
    // 1) Entrepôts
    this.warehouseService.getWarehouses().subscribe({
      next: (warehouses) => {
        this.warehousesOptions = warehouses;
        this.loadTrucks();
      },
      error: (err) => {
        console.error('Erreur loading warehouses', err);
        // Fallback empty but try loading trucks anyway?
        this.loadTrucks();
      },
    });
  }

  private loadTrucks(): void {
    this.truckService.getTrucks().subscribe({
      next: (trucks) => {
        this.allRows = trucks.map((t) => {
          const warehouse = this.warehousesOptions.find((w) => w.id === t.entrepotId) ?? null;

          return {
            entrepotId: t.entrepotId,
            entrepotName: warehouse ? warehouse.name : 'Entrepôt inconnu',
            immatriculation: t.immatriculation,
            transporteur: t.transporteur,
            kor: t.kor || '',
            heureArrivee: t.heureArrivee,
            // TODO: Checker si debut/finDechargement existent dans Truck
            // Pour l'instant on met '-' car ce n'est pas explicite dans l'interface Truck
            debutDechargement: '-',
            finDechargement: '-',
            statut: t.statut,
            createdAt: t.createdAt || new Date().toISOString(),
          };
        });

        // Tri : le plus récent en premier
        this.allRows.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.applyFilters();
      },
      error: (err) => console.error('Erreur loading trucks', err),
    });
  }

  // Applique tous les filtres à la fois
  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    const now = new Date();

    this.filteredRows = this.allRows.filter((row) => {
      // 1) Filtre texte (immat OU transporteur)
      if (search) {
        const haystack = (row.immatriculation + ' ' + row.transporteur).toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      // 2) Filtre entrepôt
      if (this.selectedWarehouseId !== 'all') {
        if (row.entrepotId !== Number(this.selectedWarehouseId)) {
          return false;
        }
      }

      // 3) Filtre statut
      if (this.selectedStatus !== 'all') {
        if (row.statut !== this.selectedStatus) {
          return false;
        }
      }

      // 4) Filtre période
      // 4) Filtre période (basé sur la date locale, plus fiable que UTC)
      if (this.selectedPeriod !== 'all') {
        const created = new Date(row.createdAt);

        // Si createdAt est invalide, on exclut la ligne (évite des filtres incohérents)
        if (isNaN(created.getTime())) {
          return false;
        }

        const now = new Date();

        // Date locale YYYY-MM-DD
        const toLocalYMD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        if (this.selectedPeriod === 'today') {
          if (toLocalYMD(created) !== toLocalYMD(now)) {
            return false;
          }
        }

        if (this.selectedPeriod === '7days') {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);

          if (created.getTime() < sevenDaysAgo.getTime()) {
            return false;
          }
        }
      }

      return true;
    });
  }

  private formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);

    if (isNaN(d.getTime())) {
      return '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  private getTodayFileName(): string {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
  }

  exporterCSV(): void {
    if (!this.filteredRows || this.filteredRows.length === 0) {
      alert('Aucune donnée à exporter.');
      return;
    }

    // En-têtes CSV (ordre volontairement clair pour un export métier)
    const headers = [
      'Entrepôt',
      'Immatriculation',
      'Transporteur',
      'Statut',
      'Heure arrivée',
      'Heure enregistrement',
      'Début déchargement',
      'Fin déchargement',
    ];

    const rows = this.filteredRows.map((row) => {
      const entrepot = this.warehousesOptions.find((w) => w.id === row.entrepotId);

      return [
        entrepot ? entrepot.name : '',
        row.immatriculation,
        row.transporteur,
        row.statut,
        row.heureArrivee || '',
        row.createdAt ? this.formatDateTime(row.createdAt) : '',
        row.debutDechargement ? this.formatDateTime(row.debutDechargement) : '',
        row.finDechargement ? this.formatDateTime(row.finDechargement) : '',
      ];
    });

    // Construction du CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map((r) => r.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')),
    ].join('\n');

    // Création du fichier téléchargeable
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `historique_camions_${this.getTodayFileName()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // Helpers pour les labels dans le template
  getStatusCssClass(statut: string): string {
    switch (statut) {
      case 'Déchargé':
        return 'status-pill status-pill--success';

      case 'En attente':
        return 'status-pill status-pill--warning';
      case 'Annulé':
        return 'status-pill status-pill--danger';
      case 'En cours de déchargement':
        return 'status-pill status-pill--info';
      default:
        return 'status-pill';
    }
  }

  formatHeure(date?: string): string {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
