import { NavigationProp } from '@react-navigation/native';

export type RootNavigationProp = NavigationProp<any>;


export type UserData = {
  email: string;
  full_name: string;
  timezone: string;
  is_active: boolean;
  total_taken: number;
  total_missed: number;
  adherence_percentage: number;
};
