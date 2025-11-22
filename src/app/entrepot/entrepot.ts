import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from "@angular/router";

interface Truck {
  id: number;
  entrepotId: number;      // à quel entrepôt il appartient
  immatriculation: string;
  transporteur: string;
  transfert: string;
  marchandise: string;
  heureArrivee: string;
  statut: string;          // ex: "EN ATTENTE"
}


@Component({
  selector: 'app-entrepot',
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './entrepot.html',
  styleUrl: './entrepot.scss',
})
export class Entrepot implements OnInit {
  entrepot: any = null;
  showModal = false
  showConfirm = false;  // pour afficher / cacher le cadre vert


  // Données en cours de saisie dans la modale
  newTruck: Partial<Truck> = {
    immatriculation: '',
    transporteur: '',
    transfert: '',
    marchandise: '',
  };
  trucks: Truck[] = [];
  // --- Statistiques calculées à partir des camions ---

  // Nombre total de camions (pour aujourd'hui)
  get totalCamionsArrives(): number {
    return this.trucks.length;
  }

  // Nombre de camions "En attente"
  get nbEnAttente(): number {
    return this.trucks.filter((t) => t.statut === 'En attente').length;
  }

  // Nombre de camions "En cours de déchargement"
  get nbEnCours(): number {
    return this.trucks.filter((t) => t.statut === 'En cours de déchargement').length;
  }

  // Nombre de camions "Déchargé"
  get nbDecharges(): number {
    return this.trucks.filter((t) => t.statut === 'Déchargé').length;
  }

private updateTruckStatus(truck: Truck, newStatus: string) {
    truck.statut = newStatus;

    // Mettre à jour dans le localStorage (tous entrepôts confondus)
    const trucksSaved = localStorage.getItem('trucks');
    if (!trucksSaved) return;

    const allTrucks: Truck[] = JSON.parse(trucksSaved);
    const index = allTrucks.findIndex((t) => t.id === truck.id);
    if (index !== -1) {
      allTrucks[index].statut = newStatus;
      localStorage.setItem('trucks', JSON.stringify(allTrucks));
    }
  }

  // Quand on clique sur "Démarrer déchargement"
  startUnloading(truck: Truck) {
    this.updateTruckStatus(truck, 'En cours de déchargement');
  }

  // Quand on clique sur "Marquer déchargé"
  markAsDischarged(truck: Truck) {
    this.updateTruckStatus(truck, 'Déchargé');
  }



  openModal() {
    this.showModal = true
    this.showConfirm = false; // on cache le cadre vert à l'ouverture
  }

  closeModal() {
    this.showModal = false
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('selectedWarehouse');
    if (saved) {
      this.entrepot = JSON.parse(saved);
      console.log('Entrepôt sélectionné :', this.entrepot);
    }
    // 2) Charger les camions depuis le localStorage
    const trucksSaved = localStorage.getItem('trucks');
    if (trucksSaved && this.entrepot?.id != null) {
      const allTrucks: Truck[] = JSON.parse(trucksSaved);
      // On ne garde que les camions de cet entrepôt
      this.trucks = allTrucks.filter(
        (t) => t.entrepotId === this.entrepot.id
      );
    }
  }

  saveTruck() {
    if (!this.entrepot || this.entrepot.id == null) {
      alert("Entrepôt introuvable.");
      return;
    }

    // Vérifications simples
    if (!this.newTruck.immatriculation || !this.newTruck.transporteur || !this.newTruck.marchandise) {
      alert("Merci de renseigner au moins l'immatriculation, le transporteur et la marchandise.");
      return;
    }

    // Heure actuelle HH:MM
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const heure = `${hh}:${mm}`;

    // Charger tous les camions existants (tous entrepôts)
    const trucksSaved = localStorage.getItem('trucks');
    const allTrucks: Truck[] = trucksSaved ? JSON.parse(trucksSaved) : [];

    const nextId =
      allTrucks.length > 0 ? allTrucks[allTrucks.length - 1].id + 1 : 1;

    // Construire le camion à enregistrer
    const truck: Truck = {
      id: nextId,
      entrepotId: this.entrepot.id,
      immatriculation: this.newTruck.immatriculation as string,
      transporteur: this.newTruck.transporteur as string,
      transfert: this.newTruck.transfert || '',
      marchandise: this.newTruck.marchandise as string,
      heureArrivee: heure,
      statut: 'En attente',
    };

    // Ajouter au tableau global
    allTrucks.push(truck);
    localStorage.setItem('trucks', JSON.stringify(allTrucks));

    // Rafraîchir la liste locale de CET entrepôt
    this.trucks = allTrucks.filter(
      (t) => t.entrepotId === this.entrepot.id
    );

    // Réinitialiser le formulaire
    this.newTruck = {
      immatriculation: '',
      transporteur: '',
      transfert: '',
      marchandise: '',
    };

    // Afficher le cadre vert
    this.showConfirm = true;
  }
}
