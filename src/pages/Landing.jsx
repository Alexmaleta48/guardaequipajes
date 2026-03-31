import { useState } from 'react';
import { Package, MapPin, Clock, ShieldCheck, ArrowRight, Backpack, Briefcase } from 'lucide-react';

export default function Landing() {
  return (
    <div style={{ fontFamily: '"Inter", sans-serif', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #eaeaea' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-color)' }}>
          <Package size={28} />
          Lockers Elche
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          📍 City Center, Elche
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ padding: '4rem 2rem', textAlign: 'center', background: 'linear-gradient(to bottom, #f8fafc, white)' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.1, marginBottom: '1.5rem', color: '#0f172a' }}>
          Secure Luggage Storage <br /> in <span style={{ color: 'var(--accent-color)' }}>Elche City Center</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Enjoy the palm groves and the city hands-free. Drop your bags at our secure physical location. No reservation needed.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => window.open('https://maps.google.com/?q=Elche+Centro', '_blank')} style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
            <MapPin size={20} /> Get Directions
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
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>100% Secure & Staffed</h3>
             <p style={{ color: 'var(--text-secondary)' }}>Physical store with staff inside. No automatic lockers that can freeze or break.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
               <Clock size={32} />
             </div>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>6 Hours Included</h3>
             <p style={{ color: 'var(--text-secondary)' }}>Enjoy fixed cheap rates for half a day. Just €0.50 per extra hour if you are late.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
             <div style={{ background: 'var(--bg-secondary)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-color)' }}>
               <Package size={32} />
             </div>
             <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Walk-ins Welcome</h3>
             <p style={{ color: 'var(--text-secondary)' }}>No need to book online. Just walk in, leave your bags and pay when you pick them up.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '4rem 2rem', background: 'var(--bg-secondary)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', fontWeight: 800 }}>Simple Pricing</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Small */}
            <div style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                <Backpack size={24} /> <span style={{ fontWeight: 600 }}>Standard Backpack</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>€4</div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Per item / Valid for 6 hours.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> Standard carry-on bags</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> Shopping bags</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="var(--accent-color)" /> Laptop bags</li>
              </ul>
            </div>

            {/* Large */}
            <div style={{ background: 'var(--accent-color)', color: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 20px 40px rgba(59,130,246,0.3)', transform: 'scale(1.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'rgba(255,255,255,0.8)' }}>
                <Briefcase size={24} /> <span style={{ fontWeight: 600 }}>Large Suitcase</span>
              </div>
              <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>€6</div>
              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>Per item / Valid for 6 hours.</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> Checked luggage +25kg</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> Baby Strollers</li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ArrowRight size={16} color="white" /> XXL Travelers backpacks</li>
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
