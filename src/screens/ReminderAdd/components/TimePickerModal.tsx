import React from 'react';
import { Modal, TouchableWithoutFeedback, View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { styles } from '../styles';

interface TimePickerModalProps {
  visible: boolean;
  selectedTime: Date;
  isEditing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  selectedTime,
  isEditing,
  onCancel,
  onConfirm,
  onChange,
}) => {
  if (Platform.OS === 'android') {
    return visible ? (
      <DateTimePicker
        value={selectedTime}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={onChange}
        locale="ru-RU"
      />
    ) : null;
  }

  // iOS modal
  return (
    <Modal transparent={true} animationType="slide" visible={visible}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onCancel}>
                  <Text style={styles.cancelButton}>Отмена</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Изменить время' : 'Добавить время'}
                </Text>
                <TouchableOpacity onPress={onConfirm}>
                  <Text style={styles.doneButton}>
                    {isEditing ? 'Сохранить' : 'Добавить'}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={onChange}
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
  );
};
