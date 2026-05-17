import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HomePage = () => {
  const { kullanici, logout } = useAuth();
  const navigate = useNavigate();
  const [anketKodu, setAnketKodu] = useState('');
  const [kodHatasi, setKodHatasi] = useState('');
  const displayName = kullanici?.ad || kullanici?.isim || 'Kullanıcı';
  const isAdmin = kullanici?.rol === 'admin';

  const handleJoinSurvey = (e) => {
    e.preventDefault();
    setKodHatasi('');

    const trimmedCode = anketKodu.trim();
    if (!trimmedCode) {
      setKodHatasi('Lütfen anket kodunu girin.');
      return;
    }

    const code = trimmedCode.includes('/s/')
      ? trimmedCode.split('/s/').pop().split(/[?#]/)[0]
      : trimmedCode;

    navigate(`/s/${encodeURIComponent(code)}`);
  };

  return (
    <main className="min-h-screen bg-brand-bg font-sans text-brand-dark">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary text-white shadow-sm">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-tight text-brand-dark">Pollify</p>
              <p className="text-xs font-medium text-gray-500">Modern anket deneyimi</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-gray-600 sm:inline">
              Hoş geldiniz, {displayName}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
            >
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <span className="mb-4 inline-flex w-fit rounded-full bg-brand-primary/10 px-3 py-1 text-sm font-semibold text-brand-primary">
            Tek ekranda tek soru
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
            Pollify
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-gray-600">
            Kullanıcının zamanına saygı duyan, mobil odaklı ve interaktif bir veri toplama deneyimi.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/admin/surveys/new')}
                className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
              >
                Anket Oluştur
              </button>
            )}
            <a
              href="#ankete-katil"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-brand-primary hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
            >
              Ankete Katıl
            </a>
          </div>

          <form
            id="ankete-katil"
            onSubmit={handleJoinSurvey}
            className="mt-6 max-w-xl rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <label htmlFor="anket-kodu" className="block text-sm font-semibold text-gray-700">
              Anket kodu
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="anket-kodu"
                type="text"
                value={anketKodu}
                onChange={(e) => setAnketKodu(e.target.value)}
                placeholder="Anket kodunu girin"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm placeholder-gray-400 focus:border-brand-primary focus:outline-none focus:ring-brand-primary"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-accent/90 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2"
              >
                Katıl
              </button>
            </div>
            {kodHatasi && (
              <p className="mt-2 text-sm font-medium text-red-600">{kodHatasi}</p>
            )}
          </form>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-brand-primary">01</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Akıcı deneyim</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-brand-accent">02</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Mobil öncelikli</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-brand-primary">03</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">Güçlü veri yapısı</p>
            </div>
          </div>
        </div>

        <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-brand-accent" />
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Uygulama hakkında</p>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-brand-dark">
            Pollify nedir?
          </h2>

          <div className="mt-6 space-y-5 text-base leading-8 text-gray-600">
            <p>
              Klasik, sayfalarca süren ve kullanıcıyı sıkan hantal anket formlarını unutun.
              Pollify; kullanıcı deneyimini merkeze alan, mobil odaklı ve yeni nesil bir
              interaktif veri toplama platformudur.
            </p>
            <p>
              Amacımız, insanların fikirlerini paylaşırken yorulmayacağı, tıpkı sosyal medyada
              gezinir gibi akıcı ve hızlı bir deneyim sunmaktır. Geleneksel "aşağı kaydırmalı"
              formlar yerine, "tek ekranda tek soru" mantığıyla çalışan yenilikçi arayüzümüz
              sayesinde, anket doldurmak bir angarya olmaktan çıkıp keyifli bir etkileşime dönüşür.
            </p>
            <p>
              Araştırmacılar, öğrenciler ve markalar için tasarlandı. Pollify, saniyeler içinde
              yayına alınabilen anketler, detaylı istatistikler ve modern tasarımıyla arka planda
              güçlü bir veri mimarisi sunarken; ön yüzde kullanıcının zamanına saygı duyan, hızlı,
              dinamik ve akılda kalıcı anket dünyasının en modern yüzüdür.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
};

export default HomePage;
