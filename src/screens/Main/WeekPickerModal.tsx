import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getISOWeeksInYear } from 'date-fns';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (year: number, week: number) => void;
  initialYear: number;
  initialWeek: number;
}

const WeekPickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onSelect,
  initialYear,
  initialWeek,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(initialYear);
  const [week, setWeek] = useState(initialWeek);
  const [weeksInYear, setWeeksInYear] = useState(getISOWeeksInYear(new Date(initialYear, 0, 4)));

  useEffect(() => {
    setWeeksInYear(getISOWeeksInYear(new Date(year, 0, 4)));
    if (week > getISOWeeksInYear(new Date(year, 0, 4))) {
      setWeek(getISOWeeksInYear(new Date(year, 0, 4)));
    }
  }, [year]);

  useEffect(() => {
    setYear(initialYear);
    setWeek(initialWeek);
  }, [initialYear, initialWeek]);

  const yearOptions = [];
  for (let y = 2020; y <= currentYear + 5; y++) {
    yearOptions.push(<Picker.Item key={y} label={String(y)} value={y} />);
  }

  const weekOptions = [];
  for (let w = 1; w <= weeksInYear; w++) {
    weekOptions.push(<Picker.Item key={w} label={String(w)} value={w} />);
  }

  const confirm = () => {
    onSelect(year, week);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={onClose} accessibilityRole="button">
                  <Text style={styles.cancelButton}>Отмена</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Выберите год и неделю</Text>
                <TouchableOpacity onPress={confirm} accessibilityRole="button">
                  <Text style={styles.doneButton}>Выбрать</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerRow}>
                <Picker
                  selectedValue={year}
                  style={styles.picker}
                  onValueChange={(v) => setYear(v)}
                  itemStyle={styles.pickerItem}
                >
                  {yearOptions}
                </Picker>
                <Picker
                  selectedValue={week}
                  style={styles.picker}
                  onValueChange={(v) => setWeek(v)}
                  itemStyle={styles.pickerItem}
                >
                  {weekOptions}
                </Picker>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2C2C2C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
    width: '100%',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerRow: {
    flexDirection: 'row',
  },
  picker: {
    flex: 1,
    color: 'white',
  },
  pickerItem: {
    color: 'white',
  },
  cancelButton: {
    color: '#FF3B30',
    fontSize: 16,
    paddingRight: 8,
  },
  doneButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 8,
  },
});

export default WeekPickerModal;
