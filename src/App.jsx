import { useState, useEffect } from 'react';
import './App.css';
import { Backpack, Briefcase, Clock, Plus, Package, AlertTriangle, CreditCard, Banknote, RefreshCcw } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';

const PRICE_SMALL = 4;
const PRICE_LARGE = 6;
const HOURS_INCLUDED = 6;
const EXTRA_HOUR_RATE = 0.50;

function App() {
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [clientName, setClientName] = useState('');
  const [smallBags, setSmallBags] = useState(0);
  const [largeBags, setLargeBags] = useState(0);
  const [ticketId, setTicketId] = useState('');
  
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [checkoutModal, setCheckoutModal] = useState(null);
  
  // Timer
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data from Supabase
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        toast.error("Configura Supabase en .env.local y Vercel");
        setIsLoading(false);
        return;
      }
      
      // Get all active limits and today's history
      const { data: activeLuggage, error: err1 } = await supabase
        .from('luggage')
        .select('*')
        .eq('status', 'active');
        
      if (err1) throw err1;
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const { data: todayHistory, error: err2 } = await supabase
        .from('luggage')
        .select('*')
        .eq('status', 'completed')
        .gte('check_out_time', todayStart.toISOString());
        
      if (err2) throw err2;
      
      // format to dates since Supabase returns IO strings for timestamptz
      const formattedActive = activeLuggage.map(item => ({
        ...item,
        ticketId: item.ticket_id,
        clientName: item.client_name,
        smallBags: item.small_bags,
        largeBags: item.large_bags,
        checkInTime: new Date(item.check_in_time).getTime()
      }));

      const formattedHistory = todayHistory.map(item => ({
         ...item,
        totalPaid: Number(item.total_paid),
        checkOutTime: new Date(item.check_out_time).getTime()
      }));

      setInventory(formattedActive);
      setHistory(formattedHistory);
      toast.success("Datos sincronizados 😎");
    } catch (error) {
      console.error(error);
      toast.error("Error cargando base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (smallBags === 0 && largeBags === 0) return;
    
    const id = ticketId || Math.floor(1000 + Math.random() * 9000).toString();
    const newName = clientName || `Cliente #${id}`;
    
    // Optimistic UI updates
    const tempItem = {
      id: "temp-" + Date.now(),
      ticketId: id,
      clientName: newName,
      smallBags,
      largeBags,
      checkInTime: Date.now(),
      status: 'active'
    };
    
    setInventory([tempItem, ...inventory]);
    setClientName('');
    setSmallBags(0);
    setLargeBags(0);
    setTicketId('');
    
    toast.loading("Guardando...", { id: 'save' });

    try {
      const { data, error } = await supabase
        .from('luggage')
        .insert([{
          ticket_id: id,
          client_name: newName,
          small_bags: smallBags,
          large_bags: largeBags,
          status: 'active'
        }]).select();
        
      if (error) throw error;
      
      // Replace temp item with real DB item
      setInventory(prev => prev.map(item => item.id === tempItem.id ? {
        ...data[0],
        ticketId: data[0].ticket_id,
        clientName: data[0].client_name,
        smallBags: data[0].small_bags,
        largeBags: data[0].large_bags,
        checkInTime: new Date(data[0].check_in_time).getTime()
      } : item));
      
      toast.success("¡Check-in registrado!", { id: 'save' });
    } catch (error) {
       console.error(error);
       toast.error("Error guardando datos reales", { id: 'save' });
       // We keep the optimistic one if net failed to keep MVP smooth, 
       // but in strict production we could remove it.
    }
  };

  const calculateTimeInfo = (checkInTime) => {
    const diffMs = currentTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinsTotal = Math.floor(diffMs / (1000 * 60));
    const displayHours = Math.floor(diffMinsTotal / 60);
    const displayMins = diffMinsTotal % 60;
    const isWarning = diffHours >= (HOURS_INCLUDED - 1) && diffHours < HOURS_INCLUDED;
    const isDanger = diffHours >= HOURS_INCLUDED;
    const formatted = `${displayHours > 0 ? displayHours + 'h ' : ''}${displayMins}m`;
    return { diffHours, formatted, isWarning, isDanger };
  };

  const calculatePrice = (item) => {
    const { diffHours } = calculateTimeInfo(item.checkInTime);
    const basePrice = (item.smallBags * PRICE_SMALL) + (item.largeBags * PRICE_LARGE);
    
    let extraHoursFees = 0;
    if (diffHours > HOURS_INCLUDED) {
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

  const confirmCheckout = async (paymentMethod) => {
    if (!checkoutModal) return;
    const item = checkoutModal;
    const { totalPrice } = calculatePrice(item);
    
    // optimistic update
    const historyItem = { ...item, status: 'completed', checkOutTime: Date.now(), totalPaid: totalPrice, paymentMethod };
    setHistory([historyItem, ...history]);
    setInventory(inventory.filter(i => i.id !== item.id));
    setCheckoutModal(null);
    toast.loading("Validando pago...", { id: 'pay' });

    try {
       // Only run real backend if it's not a temp item
       if (!item.id.toString().startsWith("temp-")) {
          const { error } = await supabase
            .from('luggage')
            .update({ 
              status: 'completed', 
              check_out_time: new Date().toISOString(),
              total_paid: totalPrice,
              payment_method: paymentMethod
            })
            .eq('id', item.id);
            
          if (error) throw error;
       }
       toast.success("Pago completado", { id: 'pay' });
    } catch(err) {
       console.error(err);
       toast.error("Ups! Error comunicando pago", { id: 'pay' });
    }
  };

  const today = new Date().setHours(0,0,0,0);
  const todaysHistory = history.filter(h => h.checkOutTime >= today);
  const totalRevenue = todaysHistory.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalClients = todaysHistory.length;

  return (
    <div className="app-container">
      <Toaster position="top-center" />
      
      <header className="header animate-fade-in">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <h1>
             <Package className="text-accent" color="var(--accent-color)" size={32} />
             Lockers Elche OS
           </h1>
           <button onClick={fetchData} className="btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Sincronizar BdD">
             <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
           </button>
        </div>
        <div className="ticket-tag" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      {/* STATS */}
      <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card">
          <div className="stat-title">Ingresos de Hoy</div>
          <div className="stat-value">{totalRevenue.toFixed(2)} €</div>
          <div className="stat-trend" style={{ color: totalRevenue > 24 ? 'var(--success)' : 'var(--text-secondary)' }}>
            Objetivo P.E.: 24.00 €
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Clientes Hoy</div>
          <div className="stat-value">{totalClients}</div>
          <div className="stat-trend">Verano: ~20 / Invierno: ~8</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Maletas Almacenadas</div>
          <div className="stat-value">
            {inventory.reduce((sum, item) => sum + item.smallBags + item.largeBags, 0)}
          </div>
          <div className="stat-trend" style={{ color: 'var(--accent-color)' }}>Ocupación actual ({inventory.length} tickets)</div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* CHECK-IN Form */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start' }}>
          <h2 className="panel-title"><Plus size={24} /> Nuevo Check-in</h2>
          <form onSubmit={handleCheckIn}>
            <div className="form-group">
              <label className="form-label">Tícket (Genera auto si vacío)</label>
              <input type="text" className="form-input" placeholder="Ej. T-105" value={ticketId} onChange={e => setTicketId(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Nombre del Cliente (Opcional)</label>
              <input type="text" className="form-input" placeholder="Ej. Juan de Airbnb..." value={clientName} onChange={e => setClientName(e.target.value)} />
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

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={smallBags === 0 && largeBags === 0}>
              <Plus size={20} /> Entrar Maleta
            </button>
          </form>
        </section>

        {/* ACTIVE Dashboard */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="header" style={{ marginBottom: '1.5rem' }}>
            <h2 className="panel-title" style={{ margin: 0 }}><Clock size={24} /> Equipaje en Tienda</h2>
          </div>

          {isLoading && inventory.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>Cargando base de datos...</div>
          ) : inventory.length === 0 ? (
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
                      <div className="ticket-tag" style={{display: 'flex', alignItems: 'center', gap: '0.2rem'}}>
                        {item.ticketId}
                      </div>
                      <div className={`card-time ${isDanger ? 'time-danger' : isWarning ? 'time-warning' : ''}`}>
                        {isDanger ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        {formatted}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600 }}>{item.clientName}</div>
                    
                    <div className="card-items">
                      {item.smallBags > 0 && (
                        <div className="item-badge"><Backpack size={16} /> x{item.smallBags}</div>
                      )}
                      {item.largeBags > 0 && (
                        <div className="item-badge"><Briefcase size={16} /> x{item.largeBags}</div>
                      )}
                    </div>
                    
                    <div className="card-footer">
                      <div>{isDanger && <span className="extra-fee">Penalización extra</span>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="estimated-price">{totalPrice.toFixed(2)} €</div>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', width: 'auto' }} onClick={() => setCheckoutModal(item)}>
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
              <h2 className="modal-title">Check-out</h2>
              <div className="ticket-tag">{checkoutModal.ticketId}</div>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>Cliente: {checkoutModal.clientName}</p>
            
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>{checkoutModal.smallBags}x Mochilas</span>
                <span>{(checkoutModal.smallBags * PRICE_SMALL).toFixed(2)} €</span>
              </div>
              <div className="breakdown-row">
                <span>{checkoutModal.largeBags}x Maletas Grandes</span>
                <span>{(checkoutModal.largeBags * PRICE_LARGE).toFixed(2)} €</span>
              </div>
              {calculatePrice(checkoutModal).extraHours > 0 && (
              <div className="breakdown-row" style={{ color: 'var(--danger)', fontWeight: 500 }}>
                <span>Horas Extra (+{calculatePrice(checkoutModal).extraHours}h x{(checkoutModal.smallBags+checkoutModal.largeBags)} bultos)</span>
                <span>{(calculatePrice(checkoutModal).extraHoursFees).toFixed(2)} €</span>
              </div>
              )}
              <div className="breakdown-row total">
                <span>Total a Cobrar</span>
                <span>{calculatePrice(checkoutModal).totalPrice.toFixed(2)} €</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Registrar facturación
            </div>
            
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setCheckoutModal(null)}>Cancelar</button>
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
