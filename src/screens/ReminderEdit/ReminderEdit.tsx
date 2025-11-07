import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Reminder } from '../../types';
import { useCourses } from '../../hooks';

import { styles } from './styles';
import { EditReminderScreenNavigationProp, EditReminderScreenRouteProp } from './types';

const ReminderEdit: React.FC = () => {
  const navigation = useNavigation<EditReminderScreenNavigationProp>();
  const route = useRoute<EditReminderScreenRouteProp>();
  const { reminder, mainKey } = route.params;
  const { removeCourse } = useCourses();

  const [name, setName] = useState(reminder.name);
  const [dosage, setDosage] = useState(reminder.dosage);
  const [time, setTime] = useState(reminder.time);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(() => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  });

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (selectedDate) {
      setSelectedTime(selectedDate);

      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setTime(`${hours}:${minutes}`);
    }
  };

  const openTimePicker = () => {
    setShowTimePicker(true);
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
  };

  const saveReminder = async () => {
    try {
      // Create updated reminder
      const updatedReminder: Reminder = {
        ...reminder,
        name,
        dosage,
        time,
      };

      // Retrieve existing reminders from AsyncStorage
      const storedRemindersJson = await AsyncStorage.getItem('reminders');
      
      if (storedRemindersJson) {
        // Parse stored reminders
        const storedReminders: Reminder[] = JSON.parse(storedRemindersJson);

        // Find and replace the updated reminder
        const updatedReminders = storedReminders.map(r => 
          r.id === reminder.id ? updatedReminder : r
        );

        // Save updated reminders back to AsyncStorage
        await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      }

      // Navigate back to Main screen with updated reminder
      const key = mainKey || navigation.getState().routes[0]?.key;
      navigation.goBack();
      // @ts-ignore
      navigation.navigate({
        name: 'Main',
        key,
        params: {
          updatedReminder,
          forceRefresh: Date.now(),
        },
        merge: true,
      });

      Alert.alert('Сохранено', 'Напоминание успешно обновлено!');
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить напоминание');
    }
  };

  const deleteReminder = async () => {
    try {
      const storedRemindersJson = await AsyncStorage.getItem('reminders');
      let updatedReminders: Reminder[] = [];
      if (storedRemindersJson) {
        const storedReminders: Reminder[] = JSON.parse(storedRemindersJson);
        updatedReminders = storedReminders.filter(r => r.id !== reminder.id);
        await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
      }

      if (reminder.courseId) {
        const exists = updatedReminders.some(r => r.courseId === reminder.courseId);
        if (!exists) {
          await removeCourse(reminder.courseId);
        }
      }

      const key = mainKey || navigation.getState().routes[0]?.key;
      navigation.goBack();
      // @ts-ignore
      navigation.navigate({
        name: 'Main',
        key,
        params: {
          forceRefresh: Date.now(),
        },
        merge: true,
      });

      Alert.alert('Удалено', 'Напоминание успешно удалено!');
    } catch (error) {
      console.error('Error deleting reminder:', error);
      Alert.alert('Ошибка', 'Не удалось удалить напоминание');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Удалить напоминание', 'Вы уверены, что хотите удалить это напоминание?', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: deleteReminder },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.label}>Название</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        maxLength={35}
      />

      <Text style={styles.label}>Дозировка</Text>
      <TextInput
        style={styles.input}
        value={dosage}
        keyboardType="default"
        maxLength={35}
        onChangeText={setDosage}
      />

      <Text style={styles.label}>Время</Text>
      <TouchableOpacity onPress={openTimePicker} style={styles.timePickerButton}>
        <Text style={styles.timeText}>{time}</Text>
        <Icon name="clock-outline" size={24} color="#007AFF" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && showTimePicker && (
        <Modal transparent={true} animationType="slide" visible={showTimePicker}>
          <TouchableWithoutFeedback onPress={closeTimePicker}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={closeTimePicker}>
                      <Text style={styles.cancelButton}>Отмена</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Выберите время</Text>
                    <TouchableOpacity onPress={closeTimePicker}>
                      <Text style={styles.doneButton}>Готово</Text>
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
        />
      )}

      <TouchableOpacity onPress={saveReminder} style={styles.saveButton}>
        <Text style={styles.buttonText}>Сохранить</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
        <Text style={styles.buttonText}>Удалить напоминание</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ReminderEdit;