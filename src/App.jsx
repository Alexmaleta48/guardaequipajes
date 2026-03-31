import { useState, useEffect, useMemo } from 'react';
import './App.css';
import { Backpack, Briefcase, Clock, Plus, Package, AlertTriangle, CreditCard, Banknote, RefreshCcw, Search, MessageCircle, Lock } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';

const PRICE_SMALL = 4;
const PRICE_LARGE = 6;
const HOURS_INCLUDED = 6;
const EXTRA_HOUR_RATE = 0.50;
const SECURITY_PIN = import.meta.env.VITE_MASTER_PIN || '1234';

function App() {
  // 1. SECURITY / DEVICE AUTHORIZATION
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('lockers_device_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');

  // 2. CORE STATE
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 3. FORM STATE
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [smallBags, setSmallBags] = useState(0);
  const [largeBags, setLargeBags] = useState(0);
  const [ticketId, setTicketId] = useState('');
  
  // 4. UI STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [checkoutModal, setCheckoutModal] = useState(null);
  
  // Timer for hours calculation
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data from Supabase if authorized
  const fetchData = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        toast.error("Falta url de Supabase (.env)");
        setIsLoading(false);
        return;
      }
      
      const { data: activeLuggage, error: err1 } = await supabase.from('luggage').select('*').eq('status', 'active');
      if (err1) throw err1;
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const { data: todayHistory, error: err2 } = await supabase
        .from('luggage')
        .select('*')
        .eq('status', 'completed')
        .gte('check_out_time', todayStart.toISOString());
      if (err2) throw err2;
      
      const formattedActive = activeLuggage.map(item => ({
        ...item,
        ticketId: item.ticket_id,
        clientName: item.client_name,
        clientPhone: item.client_phone || '',
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
    } catch (error) {
      console.error(error);
      toast.error("Error cargando base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAuthorized]);

  // LOGIN HANDLER
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === SECURITY_PIN) {
      localStorage.setItem('lockers_device_auth', 'true');
      setIsAuthorized(true);
      toast.success("Dispositivo verificado", { icon: '🔐' });
    } else {
      toast.error("PIN Incorrecto");
      setPinInput('');
    }
  };

  // WHATSAPP URL GENERATOR
  const openWhatsApp = (phone, ticketStr, bagsCount) => {
    const text = `¡Hola! 👋 Tus ${bagsCount} maletas están a salvo en *Guardaequipajes Elche*.%0A%0A Tu código de recogida es: *${ticketStr}*%0A%0ATienes 6 horas incluidas. ¡Te esperamos!`;
    const cleanPhone = phone.replace(/\D/g, ''); 
    // Por si ponen número sin prefijo español, añadimos 34:
    const finalPhone = cleanPhone.length === 9 && cleanPhone.startsWith('6') ? `34${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
  };

  // CHECK-IN
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (smallBags === 0 && largeBags === 0) return;
    
    const id = ticketId || Math.floor(1000 + Math.random() * 9000).toString();
    const newName = clientName || `Cliente #${id}`;
    
    const tempItem = {
      id: "temp-" + Date.now(),
      ticketId: id,
      clientName: newName,
      clientPhone: clientPhone,
      smallBags,
      largeBags,
      checkInTime: Date.now(),
      status: 'active'
    };
    
    setInventory([tempItem, ...inventory]);
    setClientName('');
    setClientPhone('');
    setSmallBags(0);
    setLargeBags(0);
    setTicketId('');
    
    toast.loading("Guardando check-in...", { id: 'save' });

    try {
      const { data, error } = await supabase.from('luggage').insert([{
          ticket_id: id,
          client_name: newName,
          client_phone: tempItem.clientPhone, // Se necesita añadir esto en la DB si queremos que persista (pero para el MVP basta local al checkin)
          small_bags: smallBags,
          large_bags: largeBags,
          status: 'active'
      }]).select();
        
      if (error) throw error;
      
      setInventory(prev => prev.map(item => item.id === tempItem.id ? {
        ...tempItem,
        id: data[0].id,
      } : item));
      
      toast.success("¡Check-in listo!", { id: 'save' });

      // Preguntar por enviar WhatsApp
      if (tempItem.clientPhone.trim().length > 5) {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>¿Enviar ticket digital por WhatsApp?</span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-success" style={{ padding: '4px 8px', borderRadius: '4px' }} onClick={() => {
                toast.dismiss(t.id);
                openWhatsApp(tempItem.clientPhone, tempItem.ticketId, tempItem.smallBags + tempItem.largeBags);
              }}>Enviar Ticket</button>
              <button style={{ background: '#eee', padding: '4px 8px', borderRadius: '4px' }} onClick={() => toast.dismiss(t.id)}>Omitir</button>
            </div>
          </div>
        ), { duration: 10000 });
      }

    } catch (error) {
       console.error(error);
       toast.error("Error remoto, pero guardado en visor", { id: 'save' });
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
    
    const historyItem = { ...item, status: 'completed', checkOutTime: Date.now(), totalPaid: totalPrice, paymentMethod };
    setHistory([historyItem, ...history]);
    setInventory(inventory.filter(i => i.id !== item.id));
    setCheckoutModal(null);
    toast.loading("Procesando pago...", { id: 'pay' });

    try {
       if (!item.id.toString().startsWith("temp-")) {
          const { error } = await supabase.from('luggage').update({ 
              status: 'completed', check_out_time: new Date().toISOString(), total_paid: totalPrice, payment_method: paymentMethod
          }).eq('id', item.id);
          if (error) throw error;
       }
       toast.success("Cobro completado y guardado", { id: 'pay' });
    } catch(err) {
       console.error(err);
       toast.error("Error guardando cobro online", { id: 'pay' });
    }
  };

  // SEARCH FILTER
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.clientPhone && item.clientPhone.includes(searchQuery))
    );
  }, [inventory, searchQuery]);


  // 🔑 AUTH SCREEN (No Access)
  if (!isAuthorized) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Toaster />
        <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Lock size={48} color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1.5rem' }}>Dispositivo No Autorizado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Introduce el PIN maestro para dar acceso permanente a este mostrador de Elche.
          </p>
          <form onSubmit={handlePinSubmit}>
            <input 
              type="password" 
              className="form-input" 
              placeholder="****" 
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5rem', marginBottom: '1rem' }}
              value={pinInput} onChange={e => setPinInput(e.target.value)} autoFocus
            />
            <button className="btn btn-primary" type="submit">Vincular Dispositivo (Una vez)</button>
          </form>
        </div>
      </div>
    );
  }

  // 🌍 MAIN APP RENDER
  const today = new Date().setHours(0,0,0,0);
  const todaysHistory = history.filter(h => h.checkOutTime >= today);
  const totalRevenue = todaysHistory.reduce((sum, item) => sum + item.totalPaid, 0);

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
          <div className="stat-title">Caja Tickets Finalizados</div>
          <div className="stat-value">{totalRevenue.toFixed(2)} €</div>
          <div className="stat-trend" style={{ color: totalRevenue > 24 ? 'var(--success)' : 'var(--text-secondary)' }}>
            Objetivo PE Cubierto: {totalRevenue > 24 ? 'Sí 🚀' : 'Faltan ' + (24 - totalRevenue).toFixed(2) + '€'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Clientela de Hoy</div>
          <div className="stat-value">{todaysHistory.length}</div>
          <div className="stat-trend">Registrados al salir del local</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Por Finalizar (Ocupación)</div>
          <div className="stat-value">
            {inventory.reduce((sum, item) => sum + item.smallBags + item.largeBags, 0)} <span style={{fontSize: '1rem', color: '#666'}}>bultos</span>
          </div>
          <div className="stat-trend" style={{ color: 'var(--accent-color)' }}>Repartido en {inventory.length} reservas activas</div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* CHECK-IN Form */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start' }}>
          <h2 className="panel-title"><Plus size={24} /> Nueva Reserva</h2>
          <form onSubmit={handleCheckIn}>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Tícket Identificador</label>
                <input type="text" className="form-input" placeholder="Ej. B-01" value={ticketId} onChange={e => setTicketId(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Nombre del Cliente</label>
                <input type="text" className="form-input" placeholder="Opcional" value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <MessageCircle size={16} color="#25D366" />
                WhatsApp para enviar código (Opcional)
              </label>
              <input type="tel" className="form-input" placeholder="Ej. 600 12 34 56" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
            </div>

            <label className="form-label" style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Bultos a facturar</label>
            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Mochilas / Pequeñas</span>
                <span className="counter-subtitle">{PRICE_SMALL} € / 6h</span>
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
                <span className="counter-subtitle">{PRICE_LARGE} € / 6h</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setLargeBags(Math.max(0, largeBags - 1))} disabled={largeBags === 0}>-</button>
                <span className="counter-value">{largeBags}</span>
                <button type="button" className="counter-btn" onClick={() => setLargeBags(largeBags + 1)}>+</button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={smallBags === 0 && largeBags === 0}>
              <Plus size={20} /> Bloquear Maleta e Iniciar Tiempo
            </button>
          </form>
        </section>

        {/* ACTIVE Dashboard */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="panel-title" style={{ margin: 0 }}><Clock size={24} /> Monitoreo de Tarjetas</h2>
            <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Buscar por Tícket, Nombre o WhatsApp..." 
                style={{ paddingLeft: '2.5rem', borderRadius: '2rem' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading && inventory.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>Cargando datos seguros de la red...</div>
          ) : filteredInventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>{inventory.length === 0 ? "El almacén está vacío. Acepta tu primer cliente del día." : "No hay resultados para tu búsqueda."}</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {filteredInventory.map(item => {
                const { formatted, isWarning, isDanger } = calculateTimeInfo(item.checkInTime);
                const { totalPrice } = calculatePrice(item);
                return (
                  <div key={item.id} className={`luggage-card ${isDanger ? 'danger-state' : isWarning ? 'warning-state' : ''}`}>
                    <div className="card-header">
                      <div className="ticket-tag" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize:'1rem'}}>
                        {item.ticketId}
                      </div>
                      <div className={`card-time ${isDanger ? 'time-danger' : isWarning ? 'time-warning' : ''}`}>
                        {isDanger ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        {formatted}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                       {item.clientName}
                       {item.clientPhone && (
                         <button onClick={() => openWhatsApp(item.clientPhone, item.ticketId, item.smallBags + item.largeBags)} 
                                 title="Reenviar WhatsApp" style={{color: '#25D366'}}>
                           <MessageCircle size={18} />
                         </button>
                       )}
                    </div>
                    
                    <div className="card-items">
                      {item.smallBags > 0 && (
                        <div className="item-badge"><Backpack size={16} /> {item.smallBags}x Mochila</div>
                      )}
                      {item.largeBags > 0 && (
                        <div className="item-badge"><Briefcase size={16} /> {item.largeBags}x Grande</div>
                      )}
                    </div>
                    
                    <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <div>{isDanger && <span className="extra-fee">¡Ticket Vencido!</span>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="estimated-price">{totalPrice.toFixed(2)} €</div>
                        <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', width: 'auto' }} onClick={() => setCheckoutModal(item)}>
                          Dar Salida
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
              <h2 className="modal-title">Check-out (Terminado)</h2>
              <div className="ticket-tag" style={{background: 'var(--text-primary)', color: 'white'}}>{checkoutModal.ticketId}</div>
            </div>
            
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>{checkoutModal.smallBags}x Pequeño [4€/ud]</span>
                <span>{(checkoutModal.smallBags * PRICE_SMALL).toFixed(2)} €</span>
              </div>
              <div className="breakdown-row">
                <span>{checkoutModal.largeBags}x Grande [6€/ud]</span>
                <span>{(checkoutModal.largeBags * PRICE_LARGE).toFixed(2)} €</span>
              </div>
              {calculatePrice(checkoutModal).extraHours > 0 && (
              <div className="breakdown-row" style={{ color: 'var(--danger)', fontWeight: 500 }}>
                <span>Retraso Penalización (+{calculatePrice(checkoutModal).extraHours} horas)</span>
                <span>{(calculatePrice(checkoutModal).extraHoursFees).toFixed(2)} €</span>
              </div>
              )}
              <div className="breakdown-row total">
                <span>Total a Cobrar</span>
                <span>{calculatePrice(checkoutModal).totalPrice.toFixed(2)} €</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Selecciona Medio de Pago Oficial
            </div>
            
            <div className="modal-actions">
              <button className="btn" style={{ backgroundColor: '#22c55e', color: 'white' }} onClick={() => confirmCheckout('cash')}>
                <Banknote size={20} /> Efectivo
              </button>
              <button className="btn btn-primary" onClick={() => confirmCheckout('card')}>
                <CreditCard size={20} /> Tarjeta / TPV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
