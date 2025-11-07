import { Reminder, MedicationType, ReminderStatus } from '../../types';

export const statusColors: Record<ReminderStatus, string> = {
  taken: 'green',
  pending: 'gray',
  missed: 'red',
};

export const typeIcons: Record<MedicationType, string> = {
  tablet: 'pill',
  capsule: 'pill',
  liquid: 'bottle-tonic-plus',
  injection: 'needle',
  other: 'pill'
};

export const sampleReminders: Reminder[] = [
  {
    id: '1',
    name: 'Vitamin D',
    dosage: '2 tablets',
    type: 'tablet',
    time: '09:00',
    status: 'pending',
    date: '2025-03-11',
  },
  {
    id: '2',
    name: 'Omega 3',
    dosage: '1 capsule',
    type: 'capsule',
    time: '12:00',
    status: 'missed',
    date: '2025-03-11',
  },
  { id: '3', name: 'Painkiller', dosage: '5ml', type: 'liquid', time: '18:00', status: 'taken', date: '2025-03-13' },
  {
    id: '4',
    name: 'Insulin',
    dosage: '1 injection',
    type: 'injection',
    time: '21:00',
    status: 'pending',
    date: '2025-03-13',
  },
];
