import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication } from '../types';

export interface MedicationsContextValue {
  medications: Medication[];
  loading: boolean;
  fetchMedications: () => Promise<void>;
  createMedication: (payload: Partial<Medication>) => Promise<Medication>;
  updateMedication: (
    id: number,
    payload: Partial<Medication>,
  ) => Promise<Medication>;
  removeMedication: (id: number) => Promise<void>;
}

const MedicationsContext = createContext<MedicationsContextValue | undefined>(
  undefined,
);

export const MedicationsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem('medications');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setMedications(parsed);
          } else {
            setMedications([]);
          }
        } catch (error) {
          console.error('Failed to parse medications:', error);
          setMedications([]);
        }
      } else {
        setMedications([]);
      }
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveMedications = async (items: Medication[]) => {
    setMedications(items);
    await AsyncStorage.setItem('medications', JSON.stringify(items));
  };

  const createMedication = async (
    payload: Partial<Medication>,
  ): Promise<Medication> => {
    const med: Medication = {
      id: Date.now(),
      name: payload.name || '',
      dosage: payload.dosage || '',
      description: payload.description || '',
      created_at: new Date().toISOString(),
    };
    await saveMedications([...medications, med]);
    return med;
  };

  const updateMedication = async (
    id: number,
    payload: Partial<Medication>,
  ): Promise<Medication> => {
    const updated = medications.map(m =>
      m.id === id ? { ...m, ...payload } : m,
    );
    await saveMedications(updated);
    return updated.find(m => m.id === id)!;
  };

  const removeMedication = async (id: number) => {
    const filtered = medications.filter(m => m.id !== id);
    await saveMedications(filtered);
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  return (
    <MedicationsContext.Provider
      value={{
        medications,
        loading,
        fetchMedications,
        createMedication,
        updateMedication,
        removeMedication,
      }}
    >
      {children}
    </MedicationsContext.Provider>
  );
};

export const useMedications = () => {
  const ctx = useContext(MedicationsContext);
  if (!ctx) {
    throw new Error('useMedications must be used within MedicationsProvider');
  }
  return ctx;
};
