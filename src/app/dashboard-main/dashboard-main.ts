import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface CardInfo {
  id: number;
  imageUrl: string;
  name: string;
  location: string;
  pending: number;
  active: number;
  discharged: number;
}

@Component({
  selector: 'app-dashboard-main',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-main.html',
  styleUrl: './dashboard-main.scss',
})
export class DashboardMain implements OnInit {

  cards: Array<CardInfo> = [
    {
      id: 1,
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
  ];

  showWarehouseModal = false;

  newWarehouse: Partial<CardInfo> = {
    name: '',
    location: '',
    imageUrl: '',
    pending: 0,
    active: 0,
    discharged: 0,
  };

  constructor(private router: Router) {}

  // 🔹 Cette méthode est appelée automatiquement au démarrage du composant
  ngOnInit(): void {
    const saved = localStorage.getItem('warehouses');
    if (saved) {
      try {
        this.cards = JSON.parse(saved);
      } catch (e) {
        console.error('Erreur de lecture du localStorage', e);
      }
    }
  }

  handleContanerClick(card: CardInfo) {
    console.log(card);

    // 1) On enregistre l'entrepôt cliqué dans le navigateur
    localStorage.setItem('selectedWarehouse', JSON.stringify(card));

    // 2) On navigue vers la page Entrepôt
    this.router.navigateByUrl('/dashboard/entrepot');
  }

  openWarehouseModal() {
    this.showWarehouseModal = true;
  }

  closeWarehouseModal() {
    this.showWarehouseModal = false;
  }

  saveWarehouse() {
    if (!this.newWarehouse.name || !this.newWarehouse.location) {
      alert("Merci de saisir au moins le nom et la localisation de l’entrepôt.");
      return;
    }

    const nextId =
      this.cards.length > 0 ? this.cards[this.cards.length - 1].id + 1 : 1;

    const warehouse: CardInfo = {
      id: nextId,
      imageUrl:
        (this.newWarehouse.imageUrl as string) ||
        'https://via.placeholder.com/800x400?text=Nouvel+entrepot',
      name: this.newWarehouse.name as string,
      location: this.newWarehouse.location as string,
      pending: Number(this.newWarehouse.pending ?? 0),
      active: Number(this.newWarehouse.active ?? 0),
      discharged: Number(this.newWarehouse.discharged ?? 0),
    };

    this.cards.push(warehouse);

    // 🔹 Sauvegarde dans le navigateur
    localStorage.setItem('warehouses', JSON.stringify(this.cards));

    this.newWarehouse = {
      name: '',
      location: '',
      imageUrl: '',
      pending: 0,
      active: 0,
      discharged: 0,
    };

    this.closeWarehouseModal();
  }
}
