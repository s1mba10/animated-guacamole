import { RouteProp, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation';
import { MedicationType } from '../../types';

export const typeIcons: Record<MedicationType, string> = {
  tablet: 'pill',
  capsule: 'pill',
  liquid: 'bottle-tonic-plus',
  injection: 'needle',
  other: 'pill',
};

export type AddReminderScreenRouteProp = RouteProp<RootStackParamList, 'ReminderAdd'>;
export type AddReminderScreenNavigationProp = NavigationProp<any>;
