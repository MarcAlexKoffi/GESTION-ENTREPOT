import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface CardInfo {
  imageUrl: any;
  name: any;
  location: any;
  pending: any;
  active: any;
  discharged: any;
}

@Component({
  selector: 'app-dashboard-main',
  imports: [CommonModule],
  templateUrl: './dashboard-main.html',
  styleUrl: './dashboard-main.scss',
})
export class DashboardMain {
  cards: Array<CardInfo> = [
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
    {
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAl6UTGFPudQ7Xw_KL-FLsUY4fF6xF9auoEoHQi8bYObkkQ1lp94ptnTdgDRbV1rIzWagetFC2uQ8PWUn0Mz6nUn-Y3VcsRNC79MSDmqe4uDzjCp7HPyd13Ymk1mMekEowDgJAAplDxHIVvALpovHo3VOkXIsJGMqJvwklhNj8_yMBV2OIKGozLkeDEx4xy7Jj2OExxyeRXLMYLckZ3ghjfCblPH1sflv8i_cFzNKXv2y8Gzokpi-kzB-8EqApLJhw3CETMEoHmq1mc',
      name: 'Entrepôt Lyon Sud',
      location: 'Corbas, Auvergne-Rhône-Alpes',
      pending: 8,
      active: 3,
      discharged: 32,
    },
  ];
  constructor(
    private router: Router
  ) {}

  handleContanerClick(c: CardInfo) {
    console.log(c);
    this.router.navigateByUrl('/dashboard/entrepot');
  }
}
