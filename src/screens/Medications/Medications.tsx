import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

  const formatDate = (iso: string) =>
    format(new Date(iso), 'd MMMM', { locale: ru });

  const startEdit = (id: number) => {
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
          <View key={m.id} style={styles.listItem}>
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
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => startEdit(m.id)}
              >
                <Icon name="pencil" size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => removeMedication(m.id)}
              >
                <Icon name="delete" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={startAdd}>
          <Text style={styles.addButtonText}>Добавить</Text>
        </TouchableOpacity>
      </ScrollView>
      </View>
      <TouchableOpacity style={styles.fab} onPress={startAdd}>
        <Icon name="plus" size={30} color="white" />
      </TouchableOpacity>
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
