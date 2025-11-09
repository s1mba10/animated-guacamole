import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicationCourse, Reminder } from '../types';

interface CoursesContextValue {
  courses: MedicationCourse[];
  loading: boolean;
  fetchCourses: () => Promise<void>;
  saveCourse: (course: MedicationCourse) => Promise<void>;
  updateCourse: (id: number, payload: Partial<MedicationCourse>) => Promise<void>;
  removeCourse: (id: number) => Promise<void>;
}

const CoursesContext = createContext<CoursesContextValue | undefined>(undefined);

export const CoursesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<MedicationCourse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('courses');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCourses(parsed);
          } else {
            console.error('Courses data is not an array, resetting to empty array');
            setCourses([]);
          }
        } catch (error) {
          console.error('Failed to parse courses:', error);
          setCourses([]);
        }
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async (items: MedicationCourse[]) => {
    setCourses(items);
    await AsyncStorage.setItem('courses', JSON.stringify(items));
  };

  const saveCourse = async (course: MedicationCourse) => {
    await saveAll([...courses, course]);
  };

  const updateCourse = async (id: number, payload: Partial<MedicationCourse>) => {
    const updated = courses.map(c => (c.id === id ? { ...c, ...payload } : c));
    await saveAll(updated);
  };

  const removeCourse = async (id: number) => {
    const filtered = courses.filter(c => c.id !== id);
    await saveAll(filtered);

    try {
      const storedReminders = await AsyncStorage.getItem('reminders');
      if (storedReminders) {
        try {
          const parsed = JSON.parse(storedReminders);
          if (Array.isArray(parsed)) {
            const updatedReminders = (parsed as Reminder[]).filter(
              (r: Reminder) => r.courseId !== id,
            );
            await AsyncStorage.setItem(
              'reminders',
              JSON.stringify(updatedReminders),
            );
            console.log(`Successfully removed reminders for course ${id}`);
          } else {
            console.error('Reminders data is not an array');
          }
        } catch (parseError) {
          console.error('Failed to parse reminders when removing course:', parseError);
        }
      }
    } catch (e) {
      console.error('Failed to remove reminders for course', id, e);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return (
    <CoursesContext.Provider
      value={{ courses, loading, fetchCourses, saveCourse, updateCourse, removeCourse }}
    >
      {children}
    </CoursesContext.Provider>
  );
};

export const useCourses = () => {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error('useCourses must be used within CoursesProvider');
  return ctx;
};
