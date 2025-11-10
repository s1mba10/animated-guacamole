import React from 'react';
import { Modal, TouchableWithoutFeedback, View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { styles } from '../styles';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  title,
  onCancel,
  onConfirm,
  onChange,
}) => {
  if (Platform.OS === 'android') {
    return visible ? (
      <DateTimePicker
        value={selectedDate}
        mode="date"
        display="default"
        onChange={onChange}
        locale="ru-RU"
      />
    ) : null;
  }

  // iOS modal
  return (
    <Modal transparent animationType="slide" visible={visible}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onCancel}>
                  <Text style={styles.cancelButton}>Отмена</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onConfirm}>
                  <Text style={styles.doneButton}>Готово</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
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
