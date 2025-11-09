import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReminders, useMedications, useCourses } from '../../hooks';
import NotificationManager from '../../services/NotificationManager';

import { styles } from './styles';
import { AddReminderScreenNavigationProp, AddReminderScreenRouteProp, typeIcons } from './types';
import { Reminder, MedicationType } from '../../types';

const formatDateRu = (iso: string) => format(new Date(iso), 'd MMMM', { locale: ru });
const formatDisplayDate = (iso: string) => format(new Date(iso), 'dd-MM-yyyy');

const weekDaysOrder = [
  { label: 'Пн', value: 1 },
  { label: 'Вт', value: 2 },
  { label: 'Ср', value: 3 },
  { label: 'Чт', value: 4 },
  { label: 'Пт', value: 5 },
  { label: 'Сб', value: 6 },
  { label: 'Вс', value: 0 },
] as const;

const ReminderAdd: React.FC = () => {
  const navigation = useNavigation<AddReminderScreenNavigationProp>();
  const route = useRoute<AddReminderScreenRouteProp>();
  const { selectedDate, mainKey, course } = route.params || {};

  const { scheduleReminders } = useReminders();
  const { medications, createMedication } = useMedications();
  const { saveCourse } = useCourses();
  const [selectVisible, setSelectVisible] = useState(false);

  console.log('AddReminderScreen opened with date:', selectedDate);

  const [name, setName] = useState(course?.name || '');
  const [dosage, setDosage] = useState(course?.dosage || '');
  const [type, setType] = useState<MedicationType>(course?.type || 'tablet');

  const [times, setTimes] = useState<string[]>(
    course?.times || [format(new Date(), 'HH:mm')],
  );
  const [startDate, setStartDate] = useState<string>(
    course?.startDate || selectedDate || format(new Date(), 'yyyy-MM-dd'),
  );
  const [endDate, setEndDate] = useState<string>(
    course?.endDate || selectedDate || format(new Date(), 'yyyy-MM-dd'),
  );
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'alternate' | 'weekdays'>(
    course?.repeatPattern || 'once',
  );
  const [weekdays, setWeekdays] = useState<number[]>(course?.weekdays || []);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedStartDateObj, setSelectedStartDateObj] = useState(new Date());
  const [selectedEndDateObj, setSelectedEndDateObj] = useState(new Date());
  const [currentEditingTime, setCurrentEditingTime] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });

  // Ensure single-day course when repeating once
  useEffect(() => {
    if (repeat === 'once') {
      setEndDate(startDate);
    }
  }, [repeat, startDate]);

  const addTime = (timeString: string) => {
    if (times.includes(timeString)) {
      Alert.alert('Предупреждение', 'Это время уже добавлено');
      return;
    }

    const newTimes = [...times, timeString].sort();
    setTimes(newTimes);
  };

  const startEditingTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    setSelectedTime(date);
    setCurrentEditingTime(time);
    setShowTimePicker(true);
  };

  const removeTime = (timeToRemove: string) => {
    if (times.length <= 1) {
      Alert.alert('Предупреждение', 'Должно быть добавлено хотя бы одно время');
      return;
    }

    setTimes(times.filter((t) => t !== timeToRemove));
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedDate) {
      setSelectedTime(selectedDate);

      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      if (Platform.OS === 'android') {
        confirmTimeSelection(timeString);
      }
    }
  };

  const openTimePicker = () => {
    setCurrentEditingTime(null);
    setShowTimePicker(true);
  };

  const openStartPicker = () => {
    setSelectedStartDateObj(new Date(startDate));
    setShowStartPicker(true);
  };

  const openEndPicker = () => {
    setSelectedEndDateObj(new Date(endDate));
    setShowEndPicker(true);
  };

  const confirmTimeSelection = (timeString: string) => {
    if (currentEditingTime) {
      if (currentEditingTime !== timeString) {
        const newTimes = times.filter((t) => t !== currentEditingTime);

        if (newTimes.includes(timeString)) {
          Alert.alert('Предупреждение', 'Это время уже добавлено');
        } else {
          setTimes([...newTimes, timeString].sort());
        }
      }
    } else {
      addTime(timeString);
    }

    setCurrentEditingTime(null);
    setShowTimePicker(false);
  };

  const confirmTime = () => {
    const hours = selectedTime.getHours().toString().padStart(2, '0');
    const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    confirmTimeSelection(timeString);
  };

  const cancelTimePicker = () => {
    setCurrentEditingTime(null);
    setShowTimePicker(false);
  };

  const handleStartChange = (_e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      if (date) setStartDate(format(date, 'yyyy-MM-dd'));
    } else if (date) {
      setSelectedStartDateObj(date);
    }
  };

  const handleEndChange = (_e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
      if (date) setEndDate(format(date, 'yyyy-MM-dd'));
    } else if (date) {
      setSelectedEndDateObj(date);
    }
  };

  const confirmStartDate = () => {
    setStartDate(format(selectedStartDateObj, 'yyyy-MM-dd'));
    setShowStartPicker(false);
  };

  const cancelStartPicker = () => {
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(format(selectedEndDateObj, 'yyyy-MM-dd'));
    setShowEndPicker(false);
  };

  const cancelEndPicker = () => {
    setShowEndPicker(false);
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const isWeekdayInRange = (day: number) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === day) return true;
    }
    return false;
  };

  useEffect(() => {
    setWeekdays((prev) => prev.filter((d) => isWeekdayInRange(d)));
  }, [startDate, endDate]);

  const handleWeekdayPress = (day: number) => {
    if (!isWeekdayInRange(day)) {
      Alert.alert('Недоступно', 'Этот день не входит в выбранный период');
      return;
    }
    toggleWeekday(day);
  };

  const generateSchedule = () => {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = format(d, 'yyyy-MM-dd');
      switch (repeat) {
        case 'daily':
          dates.push(iso);
          break;
        case 'alternate':
          if (Math.floor((d.getTime() - start.getTime()) / 86400000) % 2 === 0) dates.push(iso);
          break;
        case 'weekdays':
          if (weekdays.includes(d.getDay())) dates.push(iso);
          break;
        default:
          if (d.getTime() === start.getTime()) dates.push(iso);
      }
    }
    return dates;
  };

  const typeOptions: Array<{ label: string; value: MedicationType }> = [
    { label: 'Таблетка', value: 'tablet' },
    { label: 'Капсула', value: 'capsule' },
    { label: 'Жидкость', value: 'liquid' },
    { label: 'Инъекция', value: 'injection' },
  ];

  const saveNewReminders = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите название напоминания');
      return;
    }

    if (!dosage.trim()) {
      Alert.alert('Ошибка', 'Пожалуйста, введите дозировку');
      return;
    }

    if (!medications.find((m) => m.name.toLowerCase() === name.toLowerCase())) {
      await createMedication({ name, dosage });
    }

    const dates = generateSchedule();
    if (dates.length === 0) {
      Alert.alert('Ошибка', 'Пожалуйста, выберите даты принятия препарата.');
      return;
    }
    const courseId = Date.now();
    const newReminders: Reminder[] = [];
    let counter = 0; // Add counter to ensure unique IDs
    dates.forEach((date) => {
      times.forEach((time) => {
        const id = `${Date.now()}-${counter}-${Math.random().toString(36).substring(2, 9)}`;
        counter++;
        newReminders.push({
          id,
          name,
          dosage,
          type,
          time,
          status: 'pending',
          date,
          courseId,
        });
      });
    });

    const course = {
      id: courseId,
      name,
      dosage,
      type,
      times,
      startDate,
      endDate,
      repeatPattern: repeat,
      weekdays,
    } as const;

    console.log('Created reminders:', JSON.stringify(newReminders));
    await saveCourse(course);

    try {
      await scheduleReminders(newReminders);
    } catch (error) {
      console.error('Failed to schedule reminders via API:', error);

      try {
        const storedReminders = await AsyncStorage.getItem('reminders');
        let allReminders: Reminder[] = [];

        if (storedReminders) {
          try {
            allReminders = JSON.parse(storedReminders);
            if (!Array.isArray(allReminders)) {
              allReminders = [];
            }
          } catch {
            allReminders = [];
          }
        }

        const existingIds = new Set(allReminders.map((r) => r.id));
        allReminders = [...allReminders, ...newReminders.filter((r) => !existingIds.has(r.id))];
        await AsyncStorage.setItem('reminders', JSON.stringify(allReminders));
        console.log('Successfully saved all reminders to storage');

        // Schedule notifications using the new NotificationManager
        for (const reminder of newReminders) {
          const [hour, minute] = reminder.time.split(':').map(Number);
          const notificationDate = new Date(reminder.date);
          notificationDate.setHours(hour, minute, 0, 0);

          if (notificationDate > new Date()) {
            try {
              await NotificationManager.scheduleNotification({
                reminderId: reminder.id,
                title: `Напоминание: ${reminder.name}`,
                body: `Примите ${reminder.dosage}`,
                date: notificationDate,
              });
            } catch (notifError) {
              console.error(`Failed to schedule notification for reminder ${reminder.id}:`, notifError);
            }
          }
        }
      } catch (storageError) {
        console.error('Failed to update reminders in storage:', storageError);
        Alert.alert(
          'Storage Error',
          'Failed to save your reminders. The app will try to add them to your list, but you may need to restart the app.',
        );
      }
    }

    const key = mainKey || navigation.getState().routes[0]?.key;
    navigation.goBack();
    // @ts-ignore
    navigation.navigate({
      name: 'Main',
      key,
      params: {
        newReminders,
        forceRefresh: Date.now(),
      },
      merge: true,
    });

    const reminderText = newReminders.length === 1 ? 'напоминание' : 'напоминания';
    Alert.alert('Добавлено', `${newReminders.length} ${reminderText} успешно создано!`);
  };
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {/* Сделать чтобы было похоже на листание с правой станицы на левую, а не наоборот */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Добавить напоминание</Text>
        </View>
        <Text style={styles.dateInfo}>
          {startDate === endDate
            ? `Дата: ${formatDateRu(startDate)}`
            : `Курс: ${formatDateRu(startDate)} - ${formatDateRu(endDate)}`}
        </Text>

        <Text style={styles.label}>Название</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          maxLength={35}
          placeholder="Название лекарства"
          placeholderTextColor="#666"
        />
        <TouchableOpacity onPress={() => setSelectVisible(true)} style={styles.selectButton}>
          <Icon name="format-list-bulleted" size={20} color="#007AFF" />
          <Text style={styles.selectButtonText}>Выбрать из добавленных</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Дозировка</Text>
        <TextInput
          style={styles.input}
          value={dosage}
          keyboardType="default"
          maxLength={35}
          onChangeText={setDosage}
          placeholder="Например: 1"
          placeholderTextColor="#666"
        />

        <Text style={styles.label}>Тип</Text>
        <View style={styles.typeContainer}>
          {typeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.typeOption, type === option.value && styles.selectedType]}
              onPress={() => setType(option.value)}
            >
              <Icon name={typeIcons[option.value]} size={24} color={type === option.value ? '#007AFF' : '#888'} />
              <Text style={[styles.typeText, type === option.value && styles.selectedTypeText]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Повторять</Text>
        <View style={styles.repeatRow}>
          {[
            { label: 'один раз', value: 'once' },
            { label: 'каждый день', value: 'daily' },
            { label: 'через день', value: 'alternate' },
            { label: 'по дням недели', value: 'weekdays' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.repeatOption, repeat === opt.value && styles.repeatSelected]}
              onPress={() => setRepeat(opt.value as any)}
            >
              <Text style={{ color: 'white' }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {repeat === 'weekdays' && (
          <View style={styles.repeatRow}>
            {weekDaysOrder.map((day) => {
              const disabled = !isWeekdayInRange(day.value);
              return (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.weekdayOption,
                    weekdays.includes(day.value) && styles.weekdaySelected,
                    disabled && styles.weekdayDisabled,
                  ]}
                  onPress={() => handleWeekdayPress(day.value)}
                >
                  <Text style={{ color: 'white' }}>{day.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {repeat === 'once' ? (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>Дата</Text>
              <TouchableOpacity onPress={openStartPicker} style={styles.addTimeButton}>
                <Text style={styles.addTimeText}>{formatDisplayDate(startDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dateRow}>
            <View style={[styles.dateField, { marginRight: 10 }]}>
              <Text style={styles.label}>Начало</Text>
              <TouchableOpacity onPress={openStartPicker} style={styles.addTimeButton}>
                <Text style={styles.addTimeText}>{formatDisplayDate(startDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.label}>Конец</Text>
              <TouchableOpacity onPress={openEndPicker} style={styles.addTimeButton}>
                <Text style={styles.addTimeText}>{formatDisplayDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.label}>Время</Text>
        <View style={styles.timesList}>
          {times.map((time) => (
            <View key={time} style={styles.timeItem}>
              <Text style={styles.timeItemText}>{time}</Text>
              <View style={styles.timeActions}>
                <TouchableOpacity onPress={() => startEditingTime(time)} style={styles.timeActionButton}>
                  <Icon name="pencil" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeTime(time)} style={styles.timeActionButton}>
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={openTimePicker} style={styles.addTimeButton}>
          <Icon name="plus-circle" size={24} color="#007AFF" />
          <Text style={styles.addTimeText}>Добавить время</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && showTimePicker && (
          <Modal transparent={true} animationType="slide" visible={showTimePicker}>
            <TouchableWithoutFeedback onPress={cancelTimePicker}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={cancelTimePicker}>
                        <Text style={styles.cancelButton}>Отмена</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>{currentEditingTime ? 'Изменить время' : 'Добавить время'}</Text>
                      <TouchableOpacity onPress={confirmTime}>
                        <Text style={styles.doneButton}>{currentEditingTime ? 'Сохранить' : 'Добавить'}</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={styles.timePickerIOS}
                      textColor="white"
                      themeVariant="dark"
                      locale="ru-RU"
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
            locale="ru-RU"
          />
        )}

        {Platform.OS === 'ios' && showStartPicker && (
          <Modal transparent animationType="slide" visible={showStartPicker}>
            <TouchableWithoutFeedback onPress={cancelStartPicker}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={cancelStartPicker}>
                        <Text style={styles.cancelButton}>Отмена</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Начало</Text>
                      <TouchableOpacity onPress={confirmStartDate}>
                        <Text style={styles.doneButton}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedStartDateObj}
                      mode="date"
                      display="spinner"
                      onChange={handleStartChange}
                      style={styles.timePickerIOS}
                      textColor="white"
                      themeVariant="dark"
                      locale="ru-RU"
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {Platform.OS === 'android' && showStartPicker && (
          <DateTimePicker
            value={selectedStartDateObj}
            mode="date"
            display="default"
            onChange={handleStartChange}
            locale="ru-RU"
          />
        )}
        {Platform.OS === 'ios' && showEndPicker && (
          <Modal transparent animationType="slide" visible={showEndPicker}>
            <TouchableWithoutFeedback onPress={cancelEndPicker}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={cancelEndPicker}>
                        <Text style={styles.cancelButton}>Отмена</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Конец</Text>
                      <TouchableOpacity onPress={confirmEndDate}>
                        <Text style={styles.doneButton}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={selectedEndDateObj}
                      mode="date"
                      display="spinner"
                      onChange={handleEndChange}
                      style={styles.timePickerIOS}
                      textColor="white"
                      themeVariant="dark"
                      locale="ru-RU"
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
        {Platform.OS === 'android' && showEndPicker && (
          <DateTimePicker
            value={selectedEndDateObj}
            mode="date"
            display="default"
            onChange={handleEndChange}
            locale="ru-RU"
          />
        )}

        {selectVisible && (
          <Modal transparent animationType="slide" visible={selectVisible}>
            <TouchableWithoutFeedback onPress={() => setSelectVisible(false)}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <TouchableOpacity onPress={() => setSelectVisible(false)}>
                        <Text style={styles.cancelButton}>Отмена</Text>
                      </TouchableOpacity>
                      <Text style={styles.modalTitle}>Выберите лекарство</Text>
                      <View style={{ width: 60 }} />
                    </View>
                    <ScrollView style={{ width: '100%' }}>
                      {medications.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={styles.medItem}
                          onPress={() => {
                            setName(m.name);
                            setDosage(m.dosage);
                            setSelectVisible(false);
                          }}
                        >
                          <Text style={styles.medItemText}>{m.name}</Text>
                          {!!m.dosage && <Text style={styles.medItemText}>{m.dosage}</Text>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        <TouchableOpacity onPress={saveNewReminders} style={styles.saveButton}>
          <Text style={styles.buttonText}>Добавить</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReminderAdd;
