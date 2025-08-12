import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    color: 'white',
  },
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dateInfo: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  typeOption: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
  },
  selectedType: {
    backgroundColor: '#2C2C2C',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  typeText: {
    color: '#888',
    marginTop: 5,
  },
  selectedTypeText: {
    color: 'white',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  selectButtonText: {
    color: '#007AFF',
    marginLeft: 10,
    fontSize: 16,
  },
  // Styles for multiple times
  timesList: {
    marginBottom: 10,
  },
  timeItem: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 5,
    marginBottom: 8,
  },
  timeItemText: {
    color: 'white',
    fontSize: 16,
  },
  timeActions: {
    flexDirection: 'row',
  },
  timeActionButton: {
    paddingHorizontal: 8,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 5,
    marginBottom: 20,
  },
  addTimeText: {
    color: '#007AFF',
    marginLeft: 10,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateField: {
    flex: 1,
  },
  repeatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  repeatOption: {
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  repeatSelected: {
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  weekdayOption: {
    backgroundColor: '#1E1E1E',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 5,
    marginBottom: 5,
  },
  weekdaySelected: {
    backgroundColor: '#2C2C2C',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  weekdayDisabled: {
    opacity: 0.4,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal styles
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
  timePickerIOS: {
    height: 200,
    alignSelf: 'center',
    width: '100%',
  },
  medItem: {
    width: '100%',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
  },
  medItemText: {
    color: 'white',
    fontSize: 16,
  },
});
