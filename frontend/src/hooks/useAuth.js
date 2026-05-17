import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [kullanici, setKullanici] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const kaydedilen = localStorage.getItem('kullanici');

    const loadUser = async () => {
      if (!token) {
        setYukleniyor(false);
        return;
      }

      if (kaydedilen) {
        try {
          setKullanici(JSON.parse(kaydedilen));
        } catch (_) {
          localStorage.removeItem('kullanici');
        }
      }

      try {
        const res = await authAPI.me();
        localStorage.setItem('kullanici', JSON.stringify(res.data.kullanici));
        setKullanici(res.data.kullanici);
      } catch (_) {
        setKullanici(null);
      } finally {
        setYukleniyor(false);
      }
    };

    loadUser();
  }, []);

  const login = async (eposta, sifre) => {
    const res = await authAPI.login({ eposta, sifre });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('kullanici', JSON.stringify(res.data.kullanici));
    setKullanici(res.data.kullanici);
    return res.data.kullanici;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('kullanici');
    setKullanici(null);
  };

  return (
    <AuthContext.Provider value={{ kullanici, login, logout, yukleniyor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
