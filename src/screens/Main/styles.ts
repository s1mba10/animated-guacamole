import { StyleSheet, Platform, StatusBar } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'ios' ? 10 : StatusBar.currentHeight,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  arrowButton: {
    padding: 10,
  },
  weekContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 5,
  },
  weekdayText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    width: '14%',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  dayContainer: {
    alignItems: 'center',
    width: '14%',
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedDay: {
    backgroundColor: '#323232',
  },
  dayText: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: 'white',
  },
  todayText: {
    color: '#007AFF',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 3,
    minHeight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    borderLeftWidth: 6,
  },
  reminderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  reminderTitle: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  reminderDetails: {
    fontSize: 14,
    color: '#AAA',
  },
  countdownContainer: {
    marginTop: 4,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
  },
  reminderListWrapper: {
    flex: 1,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    marginTop: 2,
  },
  takeButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyListText: {
    color: '#AAA',
    fontSize: 18,
    marginTop: 20,
    fontWeight: 'bold',
  },
  emptyListSubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },
});
