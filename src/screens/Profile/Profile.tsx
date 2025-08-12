import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useFocusEffect,
  CommonActions,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BarChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Reminder } from '../../types';

import { styles } from './styles';
import { RootNavigationProp } from './types';
import { useMedications } from '../../hooks/useMedications';
import { useCourses } from '../../hooks/useCourses';

const Profile: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const { fetchMedications } = useMedications();
  const { fetchCourses } = useCourses();
  const [user, setUser] = useState({
    full_name: 'User Name',
    email: 'user@example.com',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_active: true,
    total_taken: 0,
    total_missed: 0,
    adherence_percentage: 0,
  });

  const screenWidth = Dimensions.get('window').width - 40; // Account for padding

  useEffect(() => {
    navigation.setOptions({ headerTitle: 'Profile' });
  }, [navigation]);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem('userProfile');
      if (stored) {
        try {
          const info = JSON.parse(stored);
          setUser(prev => ({ ...prev, ...info }));
        } catch {
          // ignore parse errors
        }
      }
    };
    loadUser();
  }, []);

  // Define prop types for the Adherence Display Component
  type AdherenceDisplayProps = {
    percentage: number;
    color: string;
  };

  // Custom Adherence Display Component
  const AdherenceDisplay: React.FC<AdherenceDisplayProps> = ({ percentage, color }) => {
    // Calculate the stroke dash based on percentage (circumference = 2πr = 2 * π * 85)
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * percentage) / 100;
    
    // Round the percentage to a whole number
    const roundedPercentage = Math.round(percentage);
    
    return (
      <View style={styles.adherenceContainer}>
        <Svg height="200" width="200" viewBox="0 0 200 200">
          {/* Background Circle */}
          <Circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#2C2C2C"
            strokeWidth="15"
            fill="transparent"
          />
          
          {/* Progress Arc */}
          <Circle
            cx="100"
            cy="100"
            r={radius}
            stroke={color}
            strokeWidth="15"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90, 100, 100)"
          />
        </Svg>
        
        {/* Central display */}
        <View style={styles.adherenceCenterContent}>
          <Text style={[styles.adherencePercentage, { color: color }]}>
            {roundedPercentage}%
          </Text>
          <Text style={styles.adherenceLabel}>Соблюдения</Text>
          
          {/* Status indicator */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={styles.statusText}>
              {roundedPercentage >= 80 ? 'Потрясающе' : 
                roundedPercentage >= 60 ? 'Хорошо' : 'Можно лучше'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const loadStats = async () => {
    try {
      const stored = await AsyncStorage.getItem('reminders');
      if (stored) {
        const items: Reminder[] = JSON.parse(stored);
        const total_taken = items.filter(r => r.status === 'taken').length;
        const total_missed = items.filter(r => r.status === 'missed').length;
        const total = total_taken + total_missed;
        const adherence_percentage = total > 0 ? (total_taken / total) * 100 : 0;
        setUser(prev => ({
          ...prev,
          total_taken,
          total_missed,
          adherence_percentage,
        }));
      }
    } catch (e) {
      console.warn('Failed to load stats', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const flushData = () => {
    Alert.alert(
      'Очистить данные',
      'Все напоминания и созданные курсы будут удалены',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'reminders',
                'medications',
                'courses',
                'userProfile',
                'userStats',
              ]);
              await fetchMedications();
              await fetchCourses();
              await loadStats();
              navigation.getParent()?.dispatch(
                CommonActions.reset({ index: 0, routes: [{ name: 'Главная' }] })
              );
            } catch (e) {
              console.warn('Failed to clear storage', e);
            }
          },
        },
      ],
    );
  };



  // Navigate to medications management
  const navigateToMedications = () => {
    // Switch to the Medications tab instead of pushing a new screen on top
    const parentNavigator = navigation.getParent();
    parentNavigator?.navigate('Препараты');
  };

  // Data for bar chart
  const barData = {
    labels: ['Принято', 'Пропущено'],
    datasets: [
      {
        data: [user.total_taken, user.total_missed],
        colors: [(opacity = 1) => `rgba(76, 175, 80, ${opacity})`, (opacity = 1) => `rgba(255, 87, 34, ${opacity})`]
      },
    ],
  };

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#1E1E1E',
    backgroundGradientTo: '#1E1E1E',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726',
    },
  };

  // Get adherence color based on percentage
  const getAdherenceColor = (percentage: number): string => {
    if (percentage >= 80) return '#4CAF50'; // Good - Green
    if (percentage >= 60) return '#FFC107'; // Okay - Yellow
    return '#FF5722'; // Poor - Red/Orange
  };
  
  const adherenceColor = getAdherenceColor(user.adherence_percentage);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>






        {/* Medication Adherence Section */}
        <View style={styles.adherenceSection}>
          <Text style={styles.sectionTitle}>Статистика</Text>
          
          {/* Adherence Rate - Enhanced Circular Progress */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Процент соблюдения</Text>
            <View style={styles.centeredChart}>
              <AdherenceDisplay 
                percentage={user.adherence_percentage} 
                color={adherenceColor} 
              />
              
              <View style={styles.adherenceLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Принято</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF5722' }]} />
                  <Text style={styles.legendText}>Пропущено</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Medications Summary - Bar Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Общая информация</Text>
            <BarChart
              data={barData}
              width={screenWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          </View>

          {/* Stats Summary */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.total_taken}</Text>
              <Text style={styles.statLabel}>Принято</Text>
              <Icon name="check-circle" size={20} color="#4CAF50" style={styles.statIcon} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.total_missed}</Text>
              <Text style={styles.statLabel}>Пропущено</Text>
              <Icon name="close-circle" size={20} color="#FF5722" style={styles.statIcon} />
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user.total_taken + user.total_missed}</Text>
              <Text style={styles.statLabel}>Всего</Text>
              <Icon name="pill" size={20} color="#007AFF" style={styles.statIcon} />
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={navigateToMedications}>
            <Icon name="pill" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Управление лекарствами</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Настройки', 'Здесь откроется страница настроек')}>
            <Icon name="cog" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Настройки</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={flushData}>
            <Text style={styles.logoutText}>Очистить данные</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
