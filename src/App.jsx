import { useState, useEffect } from 'react';
import './App.css';
import { Backpack, Briefcase, Clock, Plus, Package, CheckCircle2, AlertTriangle, LogOut, Search, CreditCard, Banknote } from 'lucide-react';

// Precios base
const PRICE_SMALL = 4;
const PRICE_LARGE = 6;
const HOURS_INCLUDED = 6;
const EXTRA_HOUR_RATE = 0.50;

function App() {
  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem('luggage_inventory');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('luggage_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [clientName, setClientName] = useState('');
  const [smallBags, setSmallBags] = useState(0);
  const [largeBags, setLargeBags] = useState(0);
  const [ticketId, setTicketId] = useState('');
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [checkoutModal, setCheckoutModal] = useState(null);
  
  // Update time every minute to calculate elapsed hours
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Only needs to update every minute
    return () => clearInterval(interval);
  }, []);

  // Save to localstorage
  useEffect(() => {
    localStorage.setItem('luggage_inventory', JSON.stringify(inventory));
    localStorage.setItem('luggage_history', JSON.stringify(history));
  }, [inventory, history]);

  // Handle new check-in
  const handleCheckIn = (e) => {
    e.preventDefault();
    if (smallBags === 0 && largeBags === 0) return;
    
    // Generate simple ID if none provided
    const id = ticketId || Math.floor(1000 + Math.random() * 9000).toString();
    
    const newItem = {
      id: Date.now().toString(),
      ticketId: id,
      clientName: clientName || `Cliente #${id}`,
      smallBags,
      largeBags,
      checkInTime: Date.now(),
      status: 'active'
    };
    
    setInventory([newItem, ...inventory]);
    
    // Reset form
    setClientName('');
    setSmallBags(0);
    setLargeBags(0);
    setTicketId('');
  };

  // Helper to calculate time info
  const calculateTimeInfo = (checkInTime) => {
    const diffMs = currentTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinsTotal = Math.floor(diffMs / (1000 * 60));
    
    const displayHours = Math.floor(diffMinsTotal / 60);
    const displayMins = diffMinsTotal % 60;
    
    const isWarning = diffHours >= (HOURS_INCLUDED - 1) && diffHours < HOURS_INCLUDED;
    const isDanger = diffHours >= HOURS_INCLUDED;
    
    // Basic formatting: 3h 15m
    const formatted = `${displayHours > 0 ? displayHours + 'h ' : ''}${displayMins}m`;
    
    return { diffHours, formatted, isWarning, isDanger };
  };

  // Calculate prices
  const calculatePrice = (item) => {
    const { diffHours } = calculateTimeInfo(item.checkInTime);
    
    const basePrice = (item.smallBags * PRICE_SMALL) + (item.largeBags * PRICE_LARGE);
    
    let extraHoursFees = 0;
    if (diffHours > HOURS_INCLUDED) {
      // Calculate extra hours (rounded up)
      const extraHrs = Math.ceil(diffHours - HOURS_INCLUDED);
      const totalPieces = item.smallBags + item.largeBags;
      extraHoursFees = extraHrs * totalPieces * EXTRA_HOUR_RATE;
    }
    
    return {
      basePrice,
      extraHoursFees,
      totalPrice: basePrice + extraHoursFees,
      extraHours: diffHours > HOURS_INCLUDED ? Math.ceil(diffHours - HOURS_INCLUDED) : 0
    };
  };

  // Process checkout
  const confirmCheckout = (paymentMethod) => {
    if (!checkoutModal) return;
    
    const item = checkoutModal;
    const { totalPrice } = calculatePrice(item);
    
    // Update history
    const historyItem = {
      ...item,
      status: 'completed',
      checkOutTime: Date.now(),
      totalPaid: totalPrice,
      paymentMethod
    };
    
    setHistory([historyItem, ...history]);
    
    // Remove from inventory
    setInventory(inventory.filter(i => i.id !== item.id));
    
    // Close modal
    setCheckoutModal(null);
  };

  // Today's Stats
  const today = new Date().setHours(0,0,0,0);
  const todaysHistory = history.filter(h => h.checkOutTime >= today);
  const totalRevenue = todaysHistory.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalClients = todaysHistory.length;

  return (
    <div className="app-container">
      <header className="header animate-fade-in">
        <h1>
          <Package className="text-accent" color="var(--accent-color)" size={32} />
          Lockers Elche OS
        </h1>
        <div className="ticket-tag" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card">
          <div className="stat-title">Ingresos de Hoy</div>
          <div className="stat-value">{totalRevenue.toFixed(2)} €</div>
          <div className="stat-trend" style={{ color: totalRevenue > 24 ? 'var(--success)' : 'var(--text-secondary)' }}>
            Objetivo P.E.: 24.00 €
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Clientes Finalizados</div>
          <div className="stat-value">{totalClients}</div>
          <div className="stat-trend">Meta realista: 10-15/día</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Maletas Almacenadas</div>
          <div className="stat-value">
            {inventory.reduce((sum, item) => sum + item.smallBags + item.largeBags, 0)}
          </div>
          <div className="stat-trend" style={{ color: 'var(--accent-color)' }}>Ocupación actual</div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* CHECK-IN Form */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start' }}>
          <h2 className="panel-title">
            <Plus size={24} /> Nuevo Check-in
          </h2>
          
          <form onSubmit={handleCheckIn}>
            <div className="form-group">
              <label className="form-label">Identificador / Etiqueta</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. T-105" 
                value={ticketId}
                onChange={e => setTicketId(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Nombre del Cliente (Opcional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ej. Juan de Airbnb..."
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>

            <label className="form-label" style={{ marginTop: '1.5rem' }}>Equipaje a guardar</label>
            
            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Mochilas / Pequeñas</span>
                <span className="counter-subtitle">{PRICE_SMALL} € / 6 horas</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setSmallBags(Math.max(0, smallBags - 1))} disabled={smallBags === 0}>-</button>
                <span className="counter-value">{smallBags}</span>
                <button type="button" className="counter-btn" onClick={() => setSmallBags(smallBags + 1)}>+</button>
              </div>
            </div>

            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Maletas Grandes</span>
                <span className="counter-subtitle">{PRICE_LARGE} € / 6 horas</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setLargeBags(Math.max(0, largeBags - 1))} disabled={largeBags === 0}>-</button>
                <span className="counter-value">{largeBags}</span>
                <button type="button" className="counter-btn" onClick={() => setLargeBags(largeBags + 1)}>+</button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '1rem' }}
              disabled={smallBags === 0 && largeBags === 0}
            >
              <Plus size={20} /> Registrar Entrada
            </button>
          </form>
        </section>

        {/* ACTIVE LUGGAGE Dashboard */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="header" style={{ marginBottom: '1.5rem' }}>
            <h2 className="panel-title" style={{ margin: 0 }}>
              <Clock size={24} /> Equipaje en Tienda ({inventory.length})
            </h2>
          </div>

          {inventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>No hay maletas guardadas en este momento.</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {inventory.map(item => {
                const { formatted, isWarning, isDanger } = calculateTimeInfo(item.checkInTime);
                const { totalPrice } = calculatePrice(item);
                
                return (
                  <div key={item.id} className={`luggage-card ${isDanger ? 'danger-state' : isWarning ? 'warning-state' : ''}`}>
                    <div className="card-header">
                      <div className="ticket-tag">{item.ticketId}</div>
                      <div className={`card-time ${isDanger ? 'time-danger' : isWarning ? 'time-warning' : ''}`}>
                        {isDanger ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        {formatted}
                      </div>
                    </div>
                    
                    <div style={{ fontWeight: 600 }}>{item.clientName}</div>
                    
                    <div className="card-items">
                      {item.smallBags > 0 && (
                        <div className="item-badge">
                          <Backpack size={16} /> x{item.smallBags}
                        </div>
                      )}
                      {item.largeBags > 0 && (
                        <div className="item-badge">
                          <Briefcase size={16} /> x{item.largeBags}
                        </div>
                      )}
                    </div>
                    
                    <div className="card-footer">
                      <div>
                        {isDanger && <span className="extra-fee">Penalización</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="estimated-price">{totalPrice.toFixed(2)} €</div>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '0.5rem 1rem', width: 'auto' }}
                          onClick={() => setCheckoutModal(item)}
                        >
                          Salida
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* CHECKOUT MODAL */}
      {checkoutModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setCheckoutModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title">Check-out de Maletas</h2>
              <div className="ticket-tag">{checkoutModal.ticketId}</div>
            </div>
            
            <p style={{ color: 'var(--text-secondary)' }}>Cliente: {checkoutModal.clientName}</p>
            
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>
                  {checkoutModal.smallBags}x Mochilas
                </span>
                <span>{(checkoutModal.smallBags * PRICE_SMALL).toFixed(2)} €</span>
              </div>
              <div className="breakdown-row">
                <span>
                  {checkoutModal.largeBags}x Maletas Grandes
                </span>
                <span>{(checkoutModal.largeBags * PRICE_LARGE).toFixed(2)} €</span>
              </div>
              
              {calculatePrice(checkoutModal).extraHours > 0 && (
              <div className="breakdown-row" style={{ color: 'var(--danger)', fontWeight: 500 }}>
                <span>
                  Horas Extra (+{calculatePrice(checkoutModal).extraHours}h)
                </span>
                <span>{(calculatePrice(checkoutModal).extraHoursFees).toFixed(2)} €</span>
              </div>
              )}
              
              <div className="breakdown-row total">
                <span>Total a Cobrar</span>
                <span>{calculatePrice(checkoutModal).totalPrice.toFixed(2)} €</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              ¿Cómo va a realizar el pago el cliente?
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setCheckoutModal(null)}>
                Cancelar
              </button>
              <button className="btn" style={{ backgroundColor: '#22c55e', color: 'white' }} onClick={() => confirmCheckout('cash')}>
                <Banknote size={20} /> Efectivo
              </button>
              <button className="btn btn-primary" onClick={() => confirmCheckout('card')}>
                <CreditCard size={20} /> Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
