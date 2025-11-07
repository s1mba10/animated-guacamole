import React, { useState, useRef, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TouchableWithoutFeedback, StatusBar, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  format,
  addWeeks,
  getISOWeek,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
  differenceInCalendarISOWeeks,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView, Swipeable, RectButton } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, RouteProp } from '@react-navigation/native';

import { styles } from './styles';
import WeekPickerModal from './WeekPickerModal';
import { NavigationProp } from './types';
import { RootStackParamList } from '../../navigation';
import { Reminder } from '../../types';
import { getWeekDates } from './utils';
import { statusColors, typeIcons } from './constants';
import { useCountdown, useCourses } from '../../hooks';
import NotificationManager from '../../services/NotificationManager';

const applyStatusRules = (items: Reminder[]): Reminder[] => {
  const now = Date.now();
  return items.map((r) => {
    if (r.status === 'taken' || r.status === 'missed') {
      return r;
    }
    const due = new Date(`${r.date}T${r.time}`);
    return now >= due.getTime() + 15 * 60 * 1000
      ? { ...r, status: 'missed' }
      : { ...r, status: 'pending' };
  });
};

const Main: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Main'>>();
  const { removeCourse } = useCourses();
  
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const weekDates = getWeekDates(weekOffset);
  const rowRefs = useRef<Map<string, Swipeable>>(new Map());

  const handleWeekSelect = (year: number, week: number) => {
    const target = startOfISOWeek(setISOWeek(setISOWeekYear(new Date(), year), week));
    const offset = differenceInCalendarISOWeeks(target, startOfISOWeek(new Date()));
    setWeekOffset(offset);
    setSelectedDate(format(target, 'yyyy-MM-dd'));
    setPickerVisible(false);
  };

  // Load reminders from storage on component mount
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const storedReminders = await AsyncStorage.getItem('reminders');
        if (storedReminders) {
          const parsed: Reminder[] = JSON.parse(storedReminders);
          setReminders(applyStatusRules(parsed));
        }
      } catch (error) {
        console.error('Failed to load reminders:', error);
      }
    };

    loadReminders();

    const interval = setInterval(() => {
      setReminders(prev => applyStatusRules(prev));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Save reminders and stats to storage when they change
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('reminders', JSON.stringify(reminders));

        const total_taken = reminders.filter(r => r.status === 'taken').length;
        const total_missed = reminders.filter(r => r.status === 'missed').length;
        const total = total_taken + total_missed;
        const adherence_percentage = total > 0 ? (total_taken / total) * 100 : 0;
        await AsyncStorage.setItem(
          'userStats',
          JSON.stringify({ total_taken, total_missed, adherence_percentage })
        );
      } catch (error) {
        console.error('Failed to save reminders:', error);
      }
    };

    if (reminders.length > 0) {
      saveData();
    }
  }, [reminders]);

  // Handle navigation focus and route params
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const params = route.params;

      if (params?.forceRefresh) {
        AsyncStorage.getItem('reminders').then(stored => {
          if (stored) {
            try {
              setReminders(applyStatusRules(JSON.parse(stored)));
            } catch {
              setReminders([]);
            }
          } else {
            setReminders([]);
          }
        });
        navigation.setParams({ forceRefresh: undefined });
      }

      if (params) {
        if (params.newReminders?.length) {
          setReminders(prev =>
            applyStatusRules([...prev, ...params.newReminders!]),
          );
          
          const reminderDates = params.newReminders.map(r => r.date);
          if (!reminderDates.includes(selectedDate) && reminderDates.length > 0) {
            setSelectedDate(reminderDates[0]);
          }

          navigation.setParams({ newReminders: undefined });
        } else if (params.newReminder) {
          if (params.newReminder.date !== selectedDate) {
            setSelectedDate(params.newReminder.date);
          }

          setReminders(prev => applyStatusRules([...prev, params.newReminder!]));
          navigation.setParams({ newReminder: undefined });
        }

        if (params.updatedReminder) {
          setReminders(prev =>
            applyStatusRules(
              prev.map(reminder =>
                reminder.id === params.updatedReminder!.id
                  ? params.updatedReminder!
                  : reminder
              )
            )
          );
          navigation.setParams({ updatedReminder: undefined });
        }
      }
    });

    return unsubscribe;
  }, [navigation, selectedDate, route.params]);

  // Filter and sort reminders for the selected date
  const filteredReminders = reminders
    .filter(reminder => reminder.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Get status dots for each day
  const getDayStatusDots = (date: string) => {
    return reminders
      .filter(reminder => reminder.date === date)
      .slice(0, 5)
      .map(reminder => ({ color: statusColors[reminder.status] }));
  };

  // Delete reminder
  const deleteReminder = (id: string) => {
  Alert.alert('Удалить напоминание', 'Вы уверены, что хотите удалить это напоминание?', [
    { text: 'Отмена', style: 'cancel' },
    {
      text: 'Удалить',
      onPress: async () => {
        try {
          const swipeable = rowRefs.current.get(id);
          swipeable?.close();

          const reminder = reminders.find(item => item.id === id);
          const updatedReminders = reminders.filter(item => item.id !== id);
          setReminders(applyStatusRules(updatedReminders));

          await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));

          // Cancel the notification for this reminder (including repeat notifications)
          await NotificationManager.cancelNotification(id);

          if (reminder?.courseId) {
            const exists = updatedReminders.some(r => r.courseId === reminder.courseId);
            if (!exists) {
              await removeCourse(reminder.courseId);
            }
          }
        } catch (error) {
          console.error('Failed to delete reminder:', error);
          Alert.alert('Ошибка', 'Не удалось удалить напоминание');
        }
      },
      style: 'destructive',
    },
  ]);
};

  const markAsMissed = async (id: string) => {
    setReminders(prev =>
      prev.map(r => (r.id === id ? { ...r, status: 'missed' } : r)),
    );
    // Cancel notifications when marked as missed
    await NotificationManager.cancelNotification(id);
  };

  const markAsTaken = async (item: Reminder) => {
    setReminders(prev =>
      prev.map(r => (r.id === item.id ? { ...r, status: 'taken' } : r)),
    );
    // Cancel notifications when marked as taken
    await NotificationManager.cancelNotification(item.id);
  };

  // Close other open swipeable rows
  const closeOtherRows = (id: string) => {
    rowRefs.current.forEach((ref, key) => {
      if (key !== id) {
        ref.close();
      }
    });
  };

  // Render delete action for swipeable
  const renderRightActions = (id: string) => (
    <RectButton style={styles.deleteButton} onPress={() => deleteReminder(id)}>
      <Icon name="delete" size={24} color="white" />
      <Text style={styles.deleteText}>Удалить</Text>
    </RectButton>
  );

  const ReminderCard: React.FC<{ item: Reminder }> = ({ item }) => {
    const due = new Date(`${item.date}T${item.time}`);
    const now = Date.now();
    const active =
      item.status === 'pending' && now >= due.getTime() && now < due.getTime() + 15 * 60 * 1000;
    const { minutes, seconds, progress } = useCountdown(due, active, () => markAsMissed(item.id));
    const progressColor = progress > 0.5 ? '#4CAF50' : progress > 0.2 ? '#FFEB3B' : '#F44336';

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            rowRefs.current.set(item.id, ref);
          }
        }}
        renderRightActions={() => renderRightActions(item.id)}
        onSwipeableOpen={() => closeOtherRows(item.id)}
        friction={2}
        overshootRight={false}
      >
        <View
          style={[
            styles.reminderItem,
            { borderLeftColor: statusColors[item.status] },
          ]}
        >
          <TouchableWithoutFeedback
            onPress={() =>
              navigation.navigate('ReminderEdit', {
                reminder: item,
                mainKey: route.key,
              })
            }
          >
            <View style={styles.reminderContent}>
              <Icon
                name={typeIcons[item.type]}
                size={24}
                color={statusColors[item.status]}
                style={styles.icon}
              />
              <View style={styles.textContainer}>
                <Text style={styles.reminderTitle}>{item.name}</Text>
                <Text style={styles.reminderDetails}>
                  {item.dosage} @ {item.time}
                </Text>
                {active && (
                  <View style={styles.countdownContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${progress * 100}%`, backgroundColor: progressColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.countdownText, { color: progressColor }]}>
                      {minutes}:{seconds}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>

          <TouchableOpacity
            onPress={() =>
              item.status === 'taken'
                ? markAsMissed(item.id)
                : markAsTaken(item)
            }
            style={[
              styles.takeButton,
              { backgroundColor: statusColors[item.status] },
            ]}
          >
            <Text style={styles.buttonText}>
              {item.status === 'taken' ? 'Пропустить' : 'Принять'}
            </Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Week Navigation */}
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset - 1)} style={styles.arrowButton} accessibilityRole="button">
            <Icon name="chevron-left" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
          >
            <Text style={styles.weekText}>
              {format(addWeeks(new Date(), weekOffset), 'LLLL yyyy', { locale: ru }).charAt(0).toUpperCase() +
                format(addWeeks(new Date(), weekOffset), 'LLLL yyyy ', { locale: ru }).slice(1)}
              • {getISOWeek(addWeeks(new Date(), weekOffset))} неделя
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeekOffset(weekOffset + 1)} style={styles.arrowButton} accessibilityRole="button">
            <Icon name="chevron-right" size={30} color="white" />
          </TouchableOpacity>
        </View>

        {/* Week Dates */}
        <View style={styles.weekContainer}>
          <View style={styles.weekdayRow}>
            {weekDates.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day.dayLabel}
              </Text>
            ))}
          </View>
          <View style={styles.datesRow}>
            {weekDates.map((day) => (
              <TouchableOpacity
                key={day.fullDate}
                onPress={() => setSelectedDate(day.fullDate)}
                style={[styles.dayContainer, day.fullDate === selectedDate && styles.selectedDay]}
              >
                <Text
                  style={[
                    styles.dayText,
                    day.fullDate === selectedDate && styles.selectedDayText,
                    day.isToday && styles.todayText,
                  ]}
                >
                  {day.dateNumber}
                </Text>
                <View style={styles.dotContainer}>
                  {getDayStatusDots(day.fullDate).map((dot, index) => (
                    <View key={index} style={[styles.dot, { backgroundColor: dot.color }]} />
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminders List */}
        <FlatList
          data={filteredReminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReminderCard item={item} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <Image
                source={require('../../../assets/heart_pill.png')}
                style={styles.emptyListImage}
                resizeMode="contain"
              />
              <Text style={styles.emptyListText}>Нет напоминаний на этот день</Text>
              <Text style={styles.emptyListSubText}>Нажмите на + чтобы добавить</Text>
            </View>
          )}
        />

        {/* Add Reminder FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            navigation.navigate('ReminderAdd', {
              selectedDate,
              mainKey: route.key,
            });
          }}
        >
          <Icon name="plus" size={30} color="white" />
        </TouchableOpacity>
        <WeekPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={handleWeekSelect}
          initialYear={Number(format(addWeeks(new Date(), weekOffset), 'yyyy'))}
          initialWeek={getISOWeek(addWeeks(new Date(), weekOffset))}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Main;
