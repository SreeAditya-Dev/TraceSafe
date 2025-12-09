import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/services/api';

interface User {
    id: string;
    email: string;
    name: string;
    role: 'farmer' | 'driver' | 'retailer' | 'admin';
    phone?: string;
}

interface Profile {
    id?: string;
    agristack_id?: string;
    land?: string;
    crops?: string;
    verified?: boolean;
    [key: string]: unknown;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    quickLogin: (role: string, name?: string) => Promise<void>;
    register: (data: { email: string; password: string; name: string; role: string; phone?: string }) => Promise<void>;
    logout: () => void;
    refreshProfile: () => Promise<void>;
    hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            refreshProfile();
        }
        setIsLoading(false);
    }, []);

    const refreshProfile = async () => {
        try {
            const response = await authAPI.getProfile();
            setUser(response.data.user);
            setProfile(response.data.profile);
        } catch (error) {
            console.error('Failed to refresh profile:', error);
        }
    };

    const login = async (email: string, password: string) => {
        const response = await authAPI.login({ email, password });
        const { user: userData, token: authToken } = response.data;

        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));

        await refreshProfile();
    };

    const quickLogin = async (role: string, name?: string) => {
        const response = await authAPI.quickLogin({ role, name });
        const { user: userData, token: authToken } = response.data;

        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));

        await refreshProfile();
    };

    const register = async (data: { email: string; password: string; name: string; role: string; phone?: string }) => {
        const response = await authAPI.register(data);
        const { user: userData, token: authToken } = response.data;

        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        setProfile(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const hasRole = (role: string | string[]) => {
        if (!user) return false;
        if (Array.isArray(role)) {
            return role.includes(user.role);
        }
        return user.role === role;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                token,
                isLoading,
                isAuthenticated: !!user && !!token,
                login,
                quickLogin,
                register,
                logout,
                refreshProfile,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
