import { NavigationProp } from '@react-navigation/native';

export type MedicationsScreenNavigationProp = NavigationProp<any>;

export interface MedicationFormData {
  id?: number;
  name: string;
  dosage: string;
}
