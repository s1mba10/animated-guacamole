import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { useMedications } from '../../hooks/useMedications';
import { useCourses, useReminders } from '../../hooks';
import { MedicationCourse } from '../../types';
import { MedicationsScreenNavigationProp, MedicationFormData } from './types';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { styles } from './styles';

const Medications: React.FC = () => {
  const navigation = useNavigation<MedicationsScreenNavigationProp>();
  const { medications, createMedication, updateMedication, removeMedication } = useMedications();
  const { courses, removeCourse } = useCourses();
  const { reminders, deleteByCourse, fetchReminders } = useReminders();

  useFocusEffect(
    React.useCallback(() => {
      fetchReminders();
    }, [fetchReminders]),
  );

  const [form, setForm] = useState<MedicationFormData>({ name: '', dosage: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const fabPressAnim = useRef(new Animated.Value(1)).current;
  const medicationRowRefs = useRef<Map<number, Swipeable>>(new Map());

  // Clean up refs for deleted medications to prevent memory leaks
  useEffect(() => {
    const currentIds = new Set(medications.map(m => m.id));
    const refsToDelete: number[] = [];

    medicationRowRefs.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        refsToDelete.push(id);
      }
    });

    refsToDelete.forEach(id => medicationRowRefs.current.delete(id));
  }, [medications]);

  const formatDate = (iso: string) =>
    format(new Date(iso), 'd MMMM', { locale: ru });

  // Close all other swipeable rows when one is opened
  const closeOtherRows = (currentId: number) => {
    medicationRowRefs.current.forEach((ref, id) => {
      if (id !== currentId) {
        ref?.close();
      }
    });
  };

  const startEdit = (id: number) => {
    // Close the swipeable row when editing
    medicationRowRefs.current.get(id)?.close();
    const med = medications.find(m => m.id === id);
    if (med) {
      setForm({ id: med.id, name: med.name, dosage: med.dosage });
      setModalVisible(true);
    }
  };

  const startAdd = () => {
    setForm({ name: '', dosage: '' });
    setModalVisible(true);
  };

  const clearForm = () => {
    setForm({ name: '', dosage: '' });
    setModalVisible(false);
  };

  const save = async () => {
    if (!form.name.trim()) {
      return;
    }
    if (form.id) {
      await updateMedication(form.id, { name: form.name, dosage: form.dosage });
    } else {
      await createMedication({ name: form.name, dosage: form.dosage });
    }
    clearForm();
  };

  const today = new Date().toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'finished'>(
    'active',
  );

  const getCourseProgress = (id: number) => {
    const courseReminders = reminders.filter(r => r.courseId === id);
    const done = courseReminders.filter(r => r.status !== 'pending').length;
    return { done, total: courseReminders.length };
  };

  const activeCourses = courses.filter(c => {
    const { done, total } = getCourseProgress(c.id);
    const completed = total > 0 && done >= total;
    return !completed && c.startDate <= today && c.endDate >= today;
  });

  const scheduledCourses = courses.filter(c => {
    const { done, total } = getCourseProgress(c.id);
    const completed = total > 0 && done >= total;
    return !completed && c.startDate > today;
  });

  const finishedCourses = courses.filter(c => {
    const { done, total } = getCourseProgress(c.id);
    const completed = total > 0 && done >= total;
    return completed || c.endDate < today;
  });

  const stopCourse = async (id: number) => {
    await removeCourse(id);
    await deleteByCourse(id);
    navigation.navigate('Главная', {
      screen: 'Main',
      params: { forceRefresh: Date.now() },
    });
  };

  const repeatCourse = (course: MedicationCourse) => {
    const duration =
      differenceInCalendarDays(new Date(course.endDate), new Date(course.startDate));
    const newStart = new Date();
    const newEnd = addDays(newStart, duration);
    navigation.navigate('Главная', {
      screen: 'ReminderAdd',
      params: {
        course: {
          ...course,
          startDate: format(newStart, 'yyyy-MM-dd'),
          endDate: format(newEnd, 'yyyy-MM-dd'),
        },
      },
    });
  };

  const deleteCourse = async (id: number) => {
    await removeCourse(id);
    await deleteByCourse(id);
    navigation.navigate('Главная', {
      screen: 'Main',
      params: { forceRefresh: Date.now() },
    });
  };

  // Render edit action for swipeable (left swipe)
  const renderLeftActions = (id: number) => (
    <RectButton style={styles.editButton} onPress={() => startEdit(id)}>
      <Icon name="pencil" size={24} color="white" />
      <Text style={styles.editText}>Редактировать</Text>
    </RectButton>
  );

  // Render delete action for swipeable (right swipe)
  const renderRightActions = (id: number) => (
    <RectButton style={styles.deleteButton} onPress={() => removeMedication(id)}>
      <Icon name="delete" size={24} color="white" />
      <Text style={styles.deleteText}>Удалить</Text>
    </RectButton>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.content}>
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color="#007AFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Лекарства</Text>
      </View>
      <ScrollView>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'active' && styles.activeTab]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              Активные
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'scheduled' && styles.activeTab]}
            onPress={() => setActiveTab('scheduled')}
          >
            <Text
              style={[styles.tabText, activeTab === 'scheduled' && styles.activeTabText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              Планы
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'finished' && styles.activeTab]}
            onPress={() => setActiveTab('finished')}
          >
            <Text
              style={[styles.tabText, activeTab === 'finished' && styles.activeTabText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              Завершенные
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'active' &&
          activeCourses.map(c => {
          const { done, total } = getCourseProgress(c.id);
          return (
            <View key={c.id} style={styles.courseItem}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>{c.name}</Text>
                <Text style={styles.courseSubtitle}>
                  {c.dosage} • с {formatDate(c.startDate)} по {formatDate(c.endDate)}
                </Text>
                <Text style={styles.courseProgress}>
                  {done}/{total} выполнено
                </Text>
              </View>
              <View style={styles.courseActions}>
                <TouchableOpacity
                  style={styles.courseButton}
                  onPress={() => stopCourse(c.id)}
                >
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          );
          })}

        {activeTab === 'scheduled' &&
          scheduledCourses.map(c => {
            const { done, total } = getCourseProgress(c.id);
            return (
              <View key={c.id} style={styles.courseItem}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseTitle}>{c.name}</Text>
                  <Text style={styles.courseSubtitle}>
                    {c.dosage} • с {formatDate(c.startDate)} по {formatDate(c.endDate)}
                  </Text>
                  <Text style={styles.courseProgress}>
                    {done}/{total} выполнено
                  </Text>
                </View>
                <View style={styles.courseActions}>
                  <TouchableOpacity
                    style={styles.courseButton}
                    onPress={() => deleteCourse(c.id)}
                  >
                    <Icon name="delete" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

        {activeTab === 'finished' &&
          finishedCourses.map(c => {
            const { done, total } = getCourseProgress(c.id);
            return (
              <View key={c.id} style={styles.finishedCourseItem}>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle}>{c.name}</Text>
                <Text style={styles.courseSubtitle}>
                  {c.dosage} • с {formatDate(c.startDate)} по {formatDate(c.endDate)}
                </Text>
                <Text style={styles.courseProgress}>
                  {done}/{total} выполнено
                </Text>
              </View>
              <View style={styles.courseActions}>
                <TouchableOpacity
                  style={styles.courseButton}
                  onPress={() => repeatCourse(c)}
                >
                  <Icon name="refresh" size={20} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.courseButton}
                  onPress={() => deleteCourse(c.id)}
                >
                  <Icon name="delete" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          );
          })}

        <Text style={styles.sectionTitle}>Список лекарств</Text>
        {medications.map(m => (
          <Swipeable
            key={m.id}
            ref={(ref) => {
              if (ref) {
                medicationRowRefs.current.set(m.id, ref);
              }
            }}
            renderLeftActions={() => renderLeftActions(m.id)}
            renderRightActions={() => renderRightActions(m.id)}
            onSwipeableOpen={() => closeOtherRows(m.id)}
            friction={2}
            overshootLeft={false}
            overshootRight={false}
          >
            <View style={styles.listItem}>
              <View style={styles.listInfo}>
                <Text
                  style={styles.listText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {m.name}
                </Text>
                {!!m.dosage && (
                  <Text style={styles.listText}>{m.dosage}</Text>
                )}
              </View>
            </View>
          </Swipeable>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={startAdd}>
          <Text style={styles.addButtonText}>Добавить</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
      <Animated.View style={[styles.fab, { transform: [{ scale: fabPressAnim }] }]}>
        <TouchableOpacity
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
          onPress={startAdd}
          onPressIn={() => {
            Animated.spring(fabPressAnim, {
              toValue: 0.85,
              useNativeDriver: true,
              speed: 50,
              bounciness: 0,
            }).start();
          }}
          onPressOut={() => {
            Animated.spring(fabPressAnim, {
              toValue: 1,
              useNativeDriver: true,
              speed: 20,
              bounciness: 8,
            }).start();
          }}
          activeOpacity={1}
        >
          <Icon name="plus" size={30} color="white" />
        </TouchableOpacity>
      </Animated.View>
      <Modal transparent animationType="slide" visible={modalVisible}>
        <TouchableWithoutFeedback onPress={clearForm}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {form.id ? 'Редактировать' : 'Добавить'} лекарство
                </Text>
                <TextInput
                  placeholder="Название"
                  placeholderTextColor="#666"
                  style={styles.input}
                  value={form.name}
                  maxLength={35}
                  onChangeText={name => setForm(prev => ({ ...prev, name }))}
                />
                <TextInput
                  placeholder="Дозировка"
                  placeholderTextColor="#666"
                  style={styles.input}
                  value={form.dosage}
                  keyboardType="default"
                  maxLength={35}
                  onChangeText={dosage =>
                    setForm(prev => ({ ...prev, dosage }))
                  }
                />
                <TouchableOpacity style={styles.addButton} onPress={save}>
                  <Text style={styles.addButtonText}>
                    {form.id ? 'Сохранить' : 'Добавить'}
                  </Text>
                </TouchableOpacity>
                {form.id && (
                  <TouchableOpacity style={styles.addButton} onPress={clearForm}>
                    <Text style={styles.addButtonText}>Отмена</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Medications;
