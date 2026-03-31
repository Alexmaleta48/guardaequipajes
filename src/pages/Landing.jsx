import { useState } from 'react';
import { Package, MapPin, Clock, ShieldCheck, ArrowRight, Backpack, Briefcase, Globe } from 'lucide-react';

export default function Landing() {
  const [lang, setLang] = useState('en');

  const dict = {
    en: {
      title: "Secure Luggage Storage",
      subtitle: "in",
      city: "Elche City Center",
      desc: "Enjoy the palm groves and the city hands-free. Drop your bags at our secure physical location. No reservation needed.",
      btnMap: "Get Directions",
      feat1Title: "100% Secure & Staffed",
      feat1Desc: "Physical store with staff inside. No automatic lockers that can freeze or break.",
      feat2Title: "6 Hours Included",
      feat2Desc: "Enjoy fixed cheap rates for half a day. Just €0.50 per extra hour if you are late.",
      feat3Title: "Walk-ins Welcome",
      feat3Desc: "No need to book online. Just walk in, leave your bags and pay when you pick them up.",
      pricing: "Simple Pricing",
      small: "Standard Backpack",
      smallPrice: "€4",
      smallDesc: "Per item / Valid for 6 hours.",
      smallL1: "Standard carry-on bags",
      smallL2: "Shopping bags",
      smallL3: "Laptop bags",
      large: "Large Suitcase",
      largePrice: "€6",
      largeDesc: "Per item / Valid for 6 hours.",
      largeL1: "Checked luggage +25kg",
      largeL2: "Baby Strollers",
      largeL3: "XXL Travelers backpacks"
    },
    es: {
      title: "Guardaequipajes Seguro",
      subtitle: "en el",
      city: "Centro de Elche",
      desc: "Disfruta del palmeral y la ciudad sin cargas. Deja tus maletas en nuestro local físico 100% seguro. Sin reservas previas.",
      btnMap: "Ver en el Mapa",
      feat1Title: "100% Seguro y Personal Físico",
      feat1Desc: "Local físico con empleado responsable. Nada de taquillas automáticas rotas o atascadas.",
      feat2Title: "6 Horas Incluidas",
      feat2Desc: "Tarifas económicas fijas por medio día. Solo 0.50€ por hora extra si llegas tarde.",
      feat3Title: "Llega y Guarda",
      feat3Desc: "No necesitas reservar por internet. Entra, deja el peso y pagas tranquilamente a la recogida.",
      pricing: "Precios Transparentes",
      small: "Mochila Estándar",
      smallPrice: "4€",
      smallDesc: "Por bulto / Válido para 6 horas.",
      smallL1: "Maletas de cabina",
      smallL2: "Bolsas de compras",
      smallL3: "Mochilas y maletines",
      large: "Maleta Grande / Especial",
      largePrice: "6€",
      largeDesc: "Por bulto / Válido para 6 horas.",
      largeL1: "Maletas bodega +25kg",
      largeL2: "Carritos de bebé",
      largeL3: "Mochilones de viaje XXL"
    }
  };

  const t = dict[lang];

  return (
    <div style={{ fontFamily: '"Inter", sans-serif', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-color)' }}>
          <Package size={28} />
          Lockers Elche
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            📍 Centro Elche
          </div>
          <button 
             onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
             style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Globe size={16} color="var(--accent-color)" /> {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(to bottom, #f8fafc, white)' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: '1.5rem', color: '#0f172a' }}>
          {t.title} <br /> {t.subtitle} <span style={{ color: 'var(--accent-color)' }}>{t.city}</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          {t.desc}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => window.open('https://maps.google.com/?q=Elche+Centro', '_blank')} style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
            <MapPin size={20} /> {t.btnMap}
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '4rem 2rem', background: 'white', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
             <div style={{ background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
               <ShieldCheck size={32} />
             </div>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.feat1Title}</h3>
             <p style={{ color: 'var(--text-secondary)' }}>{t.feat1Desc}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
               <Clock size={32} />
             </div>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.feat2Title}</h3>
             <p style={{ color: 'var(--text-secondary)' }}>{t.feat2Desc}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
               <Package size={32} />
             </div>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.feat3Title}</h3>
             <p style={{ color: 'var(--text-secondary)' }}>{t.feat3Desc}</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '4rem 2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', fontWeight: 800 }}>{t.pricing}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                <Backpack size={24} /> <span style={{ fontWeight: 600 }}>{t.small}</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t.smallPrice}</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t.smallDesc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> {t.smallL1}</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> {t.smallL2}</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> {t.smallL3}</li>
              </ul>
            </div>

            <div style={{ background: 'var(--accent-color)', color: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(59,130,246,0.3)', transform: 'scale(1.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                <Briefcase size={24} /> <span style={{ fontWeight: 600 }}>{t.large}</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>{t.largePrice}</div>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>{t.largeDesc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> {t.largeL1}</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> {t.largeL2}</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> {t.largeL3}</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '2rem', textAlign: 'center', background: 'white', color: 'var(--text-secondary)', borderTop: '1px solid #eaeaea' }}>
        <p>© {new Date().getFullYear()} Guardaequipajes Elche. All rights reserved.</p>
      </footer>
    </div>
  );
}
