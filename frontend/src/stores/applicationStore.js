import { create } from 'zustand';
import { mockApplications, mockRecommendations } from '../api/mockData';

export const useApplicationStore = create((set) => ({
  applications: mockApplications,
  recommendations: mockRecommendations,
  activeDiagnosis: null,
  
  setActiveDiagnosis: (appId) => set((state) => ({
    activeDiagnosis: state.applications.find(a => a.id === appId) || null
  })),
  
  clearDiagnosis: () => set({ activeDiagnosis: null }),
  
  updateApplicationProgress: (appId, progress) => set((state) => ({
    applications: state.applications.map(app => 
      app.id === appId ? { ...app, progress } : app
    )
  }))
}));
