import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert("Şifreler birbiriyle eşleşmiyor!");
      return;
    }

    try {
      await authAPI.register({ ad: name, eposta: email, sifre: password });
      alert("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
      navigate('/login'); // Kayıt sonrası giriş ekranına yönlendir
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert(error.response?.data?.error || "Kayıt sırasında bir hata oluştu.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand-primary mb-2">
          {/* Pollify Logo İkonu */}
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-brand-dark tracking-tight">
          Pollify'a Katılın
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Hemen hesap oluşturun ve anketlere katılmaya başlayın
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-xl sm:px-10">
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Ad Soyad Alanı */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="Ahmet Yılmaz"
                />
              </div>
            </div>

            {/* E-posta Alanı */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-posta adresi
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="ornek@mail.com"
                />
              </div>
            </div>

            {/* Şifre Alanı */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Şifre
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Şifre Tekrar Alanı */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Şifreyi Onayla
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors"
              >
                Hesap Oluştur
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{' '}
              <Link to="/login" className="font-medium text-brand-primary hover:text-brand-primary/80">
                Giriş yapın
              </Link>
            </p>
            <Link to="/" className="mt-3 inline-block text-sm font-medium text-gray-500 hover:text-brand-primary">
              Anasayfa'ya Dön
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
