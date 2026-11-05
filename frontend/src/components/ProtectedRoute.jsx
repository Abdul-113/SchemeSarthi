import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/userStore';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" replace />;
    }

    return children;
};

export default ProtectedRoute;
