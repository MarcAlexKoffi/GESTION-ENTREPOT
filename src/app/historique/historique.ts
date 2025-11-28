import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface StoredTruck {
  id: number;
  entrepotId: number;
  immatriculation: string;
  transporteur: string;
  transfert: string;
  kor: string;
  statut: string; // 'En attente' | 'En cours de déchargement' | 'Déchargé' | 'Annulé'
  heureArrivee: string;
  createdAt: string; // date ISO
  debutDechargement?: string;
  finDechargement?: string;
}

interface StoredWarehouse {
  id: number;
  name: string;
  location: string;
}

interface TruckHistoryRow {
  entrepotId: number;
  entrepotName: string;
  immatriculation: string;
  transporteur: string;
  kor: string;
  heureArrivee: string;
  debutDechargement: string;
  finDechargement: string;
  statut: string;
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
  selectedStatus: string | 'all' = 'all';
  selectedPeriod: 'today' | '7days' | 'all' = 'all';

  // options pour la liste des entrepôts
  warehousesOptions: StoredWarehouse[] = [];

  ngOnInit(): void {
    this.loadDataFromLocalStorage();
    this.applyFilters();
  }

  // Charge les entrepôts + camions depuis le localStorage
  private loadDataFromLocalStorage(): void {
    // 1) Entrepôts
    const rawWarehouses = localStorage.getItem('warehouses');
    if (rawWarehouses) {
      try {
        this.warehousesOptions = JSON.parse(rawWarehouses) as StoredWarehouse[];
      } catch (e) {
        console.error('Erreur parsing warehouses', e);
        this.warehousesOptions = [];
      }
    }

    // 2) Camions
    const rawTrucks = localStorage.getItem('trucks');
    if (!rawTrucks) {
      this.allRows = [];
      return;
    }

    let trucks: StoredTruck[] = [];
    try {
      trucks = JSON.parse(rawTrucks) as StoredTruck[];
    } catch (e) {
      console.error('Erreur parsing trucks', e);
      trucks = [];
    }

    // 3) Construction des lignes d’historique
    this.allRows = trucks.map((t) => {
      const warehouse =
        this.warehousesOptions.find((w) => w.id === t.entrepotId) ?? null;

      return {
        entrepotId: t.entrepotId,
        entrepotName: warehouse ? warehouse.name : 'Entrepôt inconnu',
        immatriculation: t.immatriculation,
        transporteur: t.transporteur,
        kor: t.kor,
        heureArrivee: t.heureArrivee,
        debutDechargement: t.debutDechargement ?? '-',
        finDechargement: t.finDechargement ?? '-',
        statut: t.statut,
        createdAt: t.createdAt,
      };
    });

    // Tri : le plus récent en premier
    this.allRows.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Applique tous les filtres à la fois
  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    const now = new Date();
    const todayString = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'

    this.filteredRows = this.allRows.filter((row) => {
      // 1) Filtre texte (immat OU transporteur)
      if (search) {
        const haystack =
          (row.immatriculation + ' ' + row.transporteur).toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      // 2) Filtre entrepôt
      if (this.selectedWarehouseId !== 'all') {
        if (row.entrepotId !== this.selectedWarehouseId) {
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
      if (this.selectedPeriod !== 'all') {
        const createdDate = row.createdAt.slice(0, 10); // 'YYYY-MM-DD'

        if (this.selectedPeriod === 'today') {
          if (createdDate !== todayString) {
            return false;
          }
        }

        if (this.selectedPeriod === '7days') {
          const createdTime = new Date(row.createdAt).getTime();
          const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
          if (createdTime < sevenDaysAgo) {
            return false;
          }
        }
      }

      return true;
    });
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
}
