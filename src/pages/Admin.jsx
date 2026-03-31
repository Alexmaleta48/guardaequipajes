import { useState, useEffect, useMemo } from 'react';
import '../App.css';
import { Backpack, Briefcase, Clock, Plus, Package, AlertTriangle, CreditCard, Banknote, RefreshCcw, Search, MessageCircle, Lock, LayoutDashboard } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const PRICE_SMALL = 4;
const PRICE_LARGE = 6;
const HOURS_INCLUDED = 6;
const EXTRA_HOUR_RATE = 0.50;
const SECURITY_PIN = import.meta.env.VITE_MASTER_PIN || '1234';
const MAX_SPACES = 40;

function Admin() {
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('lockers_device_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');

  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [waLang, setWaLang] = useState('en');
  const [smallBags, setSmallBags] = useState(0);
  const [largeBags, setLargeBags] = useState(0);
  const [ticketId, setTicketId] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [checkoutModal, setCheckoutModal] = useState(null);
  
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL) {
        toast.error("Falta url de Supabase (.env)");
        setIsLoading(false); return;
      }
      
      const { data: activeLuggage, error: err1 } = await supabase.from('luggage').select('*').eq('status', 'active');
      if (err1) throw err1;
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const { data: todayHistory, error: err2 } = await supabase.from('luggage').select('*').eq('status', 'completed').gte('check_out_time', todayStart.toISOString());
      if (err2) throw err2;
      
      setInventory(activeLuggage.map(item => ({
        ...item, ticketId: item.ticket_id, clientName: item.client_name, clientPhone: item.client_phone || '', smallBags: item.small_bags, largeBags: item.large_bags, checkInTime: new Date(item.check_in_time).getTime()
      })));

      setHistory(todayHistory.map(item => ({
         ...item, totalPaid: Number(item.total_paid), paymentMethod: item.payment_method || 'efectivo', checkOutTime: new Date(item.check_out_time).getTime()
      })));
    } catch (error) {
      console.error(error);
      toast.error("Error cargando base de datos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isAuthorized]);

  // CALCULAR ESPACIOS DISPONIBLES (1-40)
  const availableSpaces = useMemo(() => {
    const occupied = new Set(inventory.map(i => parseInt(i.ticketId, 10)).filter(n => !isNaN(n)));
    const free = [];
    for (let i = 1; i <= MAX_SPACES; i++) {
      if (!occupied.has(i)) free.push(i.toString());
    }
    return free;
  }, [inventory]);

  // Si se libera un espacio o al inicio, auto-asignar el más bajo
  useEffect(() => {
    if (availableSpaces.length > 0 && (!ticketId || !availableSpaces.includes(ticketId))) {
      setTicketId(availableSpaces[0]);
    } else if (availableSpaces.length === 0) {
      setTicketId('');
    }
  }, [availableSpaces, ticketId]);


  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === SECURITY_PIN) {
      localStorage.setItem('lockers_device_auth', 'true');
      setIsAuthorized(true);
      toast.success("Dispositivo de trabajo validado", { icon: '🔐' });
    } else {
      toast.error("PIN Incorrecto");
      setPinInput('');
    }
  };

  const openWhatsApp = (phone, ticketStr, bagsCount, msgLang = 'en') => {
    let text = '';
    if (msgLang === 'es') {
      text = `¡Hola! 👋 Tus ${bagsCount} bultos están a salvo en *Guardaequipajes Elche*.%0A%0A🔑 Tu Espacio Reservado es: *Nº ${ticketStr}*%0A%0ATienes 6 horas cerradas incluidas, luego suma 0.50€ por hora extra cada bulto. Consérvalo en pantalla. ¡Te esperamos! 😊`;
    } else {
       text = `Hello! 👋 Your ${bagsCount} bags are safe at *Luggage Storage Elche*.%0A%0A🔑 Your Reserved Space is: *Nº ${ticketStr}*%0A%0AYou have 6 fixed hours included. After that, it's just €0.50 per extra hour per bag. Show this message later. See you! 😊`;
    }
    const cleanPhone = phone.replace(/\D/g, ''); 
    const finalPhone = cleanPhone.length === 9 && cleanPhone.startsWith('6') ? `34${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (smallBags === 0 && largeBags === 0) return;
    if (!ticketId) {
      toast.error("El local está lleno (40/40) o falta indicar espacio numérico.");
      return;
    }
    
    // Si meten uno manual y está pillado
    if (inventory.some(i => i.ticketId === ticketId)) {
      toast.error(`El espacio ${ticketId} ya está ocupado.`);
      return;
    }

    const id = ticketId;
    const newName = clientName || `Turista ${id}`;
    
    const tempItem = { id: "temp-" + Date.now(), ticketId: id, clientName: newName, clientPhone, waLang, smallBags, largeBags, checkInTime: Date.now(), status: 'active' };
    
    setInventory([tempItem, ...inventory]);
    setClientName(''); setClientPhone(''); setSmallBags(0); setLargeBags(0); 
    // TicketId se actualizará solo en el useEffect con el siguiente libre
    toast.loading(`Ocupando estantería #${id}...`, { id: 'save' });

    try {
      const { data, error } = await supabase.from('luggage').insert([{ ticket_id: id, client_name: newName, client_phone: tempItem.clientPhone, small_bags: smallBags, large_bags: largeBags, status: 'active' }]).select();
      if (error) throw error;
      
      setInventory(prev => prev.map(item => item.id === tempItem.id ? { ...tempItem, id: data[0].id } : item));
      toast.success(`¡Espacio ${id} Asignado!`, { id: 'save' });

      if (tempItem.clientPhone.trim().length > 5) {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>Enviar billete digital por WhatsApp ({tempItem.waLang === 'en' ? 'Inglés' : 'Español'})</span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-success" style={{ padding: '6px 12px', borderRadius: '4px', border:'none', color:'white', cursor:'pointer' }} onClick={() => {
                toast.dismiss(t.id);
                openWhatsApp(tempItem.clientPhone, tempItem.ticketId, tempItem.smallBags + tempItem.largeBags, tempItem.waLang);
              }}>Enviar a cliente</button>
              <button style={{ background: '#eee', padding: '6px 12px', borderRadius: '4px', border:'none', cursor:'pointer' }} onClick={() => toast.dismiss(t.id)}>Omitir</button>
            </div>
          </div>
        ), { duration: 15000 });
      }

    } catch (error) {
       console.error(error);
       toast.error("Problema remoto, pero forzado guardado local temporalmente.", { id: 'save' });
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
    return { basePrice, extraHoursFees, totalPrice: basePrice + extraHoursFees, extraHours: diffHours > HOURS_INCLUDED ? Math.ceil(diffHours - HOURS_INCLUDED) : 0 };
  };

  const confirmCheckout = async (paymentMethod) => {
    if (!checkoutModal) return;
    const item = checkoutModal;
    const { totalPrice } = calculatePrice(item);
    
    const historyItem = { ...item, status: 'completed', checkOutTime: Date.now(), totalPaid: totalPrice, paymentMethod };
    setHistory([historyItem, ...history]);
    setInventory(inventory.filter(i => i.id !== item.id));
    setCheckoutModal(null);
    toast.loading(`Liberando estantería #${item.ticketId}...`, { id: 'pay' });

    try {
       if (!item.id.toString().startsWith("temp-")) {
          const { error } = await supabase.from('luggage').update({ 
              status: 'completed', check_out_time: new Date().toISOString(), total_paid: totalPrice, payment_method: paymentMethod
          }).eq('id', item.id);
          if (error) throw error;
       }
       toast.success(`Estante #${item.ticketId} libre de nuevo`, { id: 'pay' });
    } catch(err) {
       console.error(err);
       toast.error("Error sincronizando cobro online", { id: 'pay' });
    }
  };

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => 
      item.ticketId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.clientPhone && item.clientPhone.includes(searchQuery))
    );
  }, [inventory, searchQuery]);

  if (!isAuthorized) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Toaster />
        <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Lock size={48} color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1.5rem' }}>Mostrador Bloqueado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Esta pantalla es privada para la gestión del local de Elche. Ponga el PIN para validar su dispositivo de turno.
          </p>
          <form onSubmit={handlePinSubmit}>
            <input 
              type="password" className="form-input" placeholder="****" 
              style={{ textAlign: 'center', fontSize: '2rem', letterSpacing: '0.5rem', marginBottom: '1rem' }}
              value={pinInput} onChange={e => setPinInput(e.target.value)} autoFocus
            />
            <button className="btn btn-primary" type="submit">Vincular Cajero (1 única vez)</button>
          </form>
          <div style={{ marginTop: '2rem' }}>
             <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>&larr; Volver a la web para Turistas</Link>
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().setHours(0,0,0,0);
  const todaysHistory = history.filter(h => h.checkOutTime >= today);
  const totalRevenue = todaysHistory.reduce((sum, item) => sum + item.totalPaid, 0);
  const totalCash = todaysHistory.filter(h => h.paymentMethod === 'cash').reduce((sum, item) => sum + item.totalPaid, 0);
  const totalCard = todaysHistory.filter(h => h.paymentMethod === 'card').reduce((sum, item) => sum + item.totalPaid, 0);

  return (
    <div className="app-container" style={{maxWidth: '1400px'}}>
      <Toaster position="top-center" />
      
      <header className="header animate-fade-in">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <h1>
             <LayoutDashboard className="text-accent" color="var(--accent-color)" size={32} />
             Mostrador Inteligente · Lockers Elche
           </h1>
           <button onClick={fetchData} className="btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Sincronizar Cloud">
             <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
           </button>
        </div>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
          <Link to="/" className="btn-outline" style={{color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, padding:'0.5rem 1rem'}}>🏠 Web Turistas</Link>
          <div className="ticket-tag" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </header>

      {/* METRICS OF THE DAY */}
      <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card" style={{borderColor:'var(--success)', background:'var(--success-light)', color: '#065f46'}}>
          <div className="stat-title" style={{color: '#065f46'}}>Caja Cierre Total (Facturación)</div>
          <div className="stat-value">{totalRevenue.toFixed(2)} €</div>
          <div className="stat-trend" style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span>💵 Metálico: {totalCash.toFixed(2)}€</span>
            <span>💳 TPV: {totalCard.toFixed(2)}€</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Clientela Atendida Hoy</div>
          <div className="stat-value">{todaysHistory.length} turistas</div>
          <div className="stat-trend">Registrados a su salida oficial</div>
        </div>
        <div className="stat-card" style={{borderColor: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--accent-color)'}}>
          <div className="stat-title">Ocupación Física de la Tienda</div>
          <div className="stat-value" style={{color: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--text-primary)'}}>
            {MAX_SPACES - availableSpaces.length} / {MAX_SPACES}
          </div>
          <div className="stat-trend" style={{ color: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--accent-color)', fontWeight: 'bold' }}>
            {availableSpaces.length === 0 ? '¡TIENDA LLENA!' : `Quedan ${availableSpaces.length} estanterías libres`}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* CHECK-IN */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start', padding: '2rem' }}>
          <h2 className="panel-title"><Plus size={24} /> Nueva Maleta</h2>
          <form onSubmit={handleCheckIn}>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Estantería Libre</label>
                <select 
                  className="form-input" 
                  style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)', cursor: 'pointer' }}
                  value={ticketId} 
                  onChange={e => setTicketId(e.target.value)}
                  disabled={availableSpaces.length === 0}
                >
                  {availableSpaces.length === 0 && <option value="">LLENO (0 / 40)</option>}
                  {availableSpaces.map(space => (
                    <option key={space} value={space}>Nº {space}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Nombre (Opcional)</label>
                <input type="text" className="form-input" placeholder="Turista..." value={clientName} onChange={e => setClientName(e.target.value)} disabled={availableSpaces.length === 0} />
              </div>
            </div>

            <div className="form-group" style={{border: '1px solid #e2e8f0', padding: '1rem', borderRadius:'8px', background: '#fafafa', opacity: availableSpaces.length === 0 ? 0.5 : 1}}>
              <label className="form-label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <MessageCircle size={18} color="#25D366" /> 
                WhatsApp para Enviar Código Virtual
              </label>
              <input type="tel" className="form-input" placeholder="Ej: 600 12 34 56" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={{marginBottom: '0.5rem'}} disabled={availableSpaces.length === 0} />
              
              <div style={{display:'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                 <div style={{flex:1, textAlign:'center', fontSize:'0.8rem', padding:'0.4rem', border: waLang==='en'?'2px solid var(--accent-color)':'1px solid #ccc', borderRadius:'4px', cursor:'pointer', background: waLang==='en'?'var(--accent-light)':'#fff', fontWeight: waLang==='en'?700:400}} onClick={()=>setWaLang('en')}>
                    🇬🇧 Airbnb Inglés
                 </div>
                 <div style={{flex:1, textAlign:'center', fontSize:'0.8rem', padding:'0.4rem', border: waLang==='es'?'2px solid var(--accent-color)':'1px solid #ccc', borderRadius:'4px', cursor:'pointer', background: waLang==='es'?'var(--accent-light)':'#fff', fontWeight: waLang==='es'?700:400}} onClick={()=>setWaLang('es')}>
                    🇪🇸 Español
                 </div>
              </div>
            </div>

            <label className="form-label" style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Cantidades de Equipaje</label>
            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Mochilas Pequeñas</span>
                <span className="counter-subtitle">{PRICE_SMALL} € / 6h y +0.50€ extras/h</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setSmallBags(Math.max(0, smallBags - 1))} disabled={smallBags === 0 || availableSpaces.length === 0}>-</button>
                <span className="counter-value">{smallBags}</span>
                <button type="button" className="counter-btn" onClick={() => setSmallBags(smallBags + 1)} disabled={availableSpaces.length === 0}>+</button>
              </div>
            </div>

            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Maletas Grandes</span>
                <span className="counter-subtitle">{PRICE_LARGE} € / 6h y +0.50€ extras/h</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setLargeBags(Math.max(0, largeBags - 1))} disabled={largeBags === 0 || availableSpaces.length === 0}>-</button>
                <span className="counter-value">{largeBags}</span>
                <button type="button" className="counter-btn" onClick={() => setLargeBags(largeBags + 1)} disabled={availableSpaces.length === 0}>+</button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', background: availableSpaces.length === 0 ? 'var(--text-secondary)' : 'var(--accent-color)' }} disabled={(smallBags === 0 && largeBags === 0) || availableSpaces.length === 0}>
              <Plus size={20} /> {availableSpaces.length === 0 ? 'Sin Espacio Libre' : 'Ocupar Estantería y Guardar'}
            </button>
          </form>
        </section>

        {/* ACTIVE DASHBOARD */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="panel-title" style={{ margin: 0 }}><Clock size={24} /> Tráfico Vivo (Local)</h2>
            <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" className="form-input" 
                placeholder="Busca por estantería o nombre..." 
                style={{ paddingLeft: '2.5rem', borderRadius: '2rem', height: '100%', border: '2px solid #e2e8f0' }}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading && inventory.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>Cargando ocupación en tiempo real...</div>
          ) : filteredInventory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>{inventory.length === 0 ? "Todo el local está vacío. Esperando reservas." : "No hay maletas que coincidan con la búsqueda."}</p>
            </div>
          ) : (
            <div className="dashboard-grid">
              {filteredInventory.map(item => {
                const { formatted, isWarning, isDanger } = calculateTimeInfo(item.checkInTime);
                const { totalPrice } = calculatePrice(item);
                return (
                  <div key={item.id} className={`luggage-card ${isDanger ? 'danger-state' : isWarning ? 'warning-state' : ''}`}>
                    <div className="card-header">
                      <div className="ticket-tag" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize:'1.2rem', padding:'0.4rem 1rem'}}>
                        Nº {item.ticketId}
                      </div>
                      <div className={`card-time ${isDanger ? 'time-danger' : isWarning ? 'time-warning' : ''}`}>
                        {isDanger ? <AlertTriangle size={16} /> : <Clock size={16} />}
                        {formatted}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                       {item.clientName}
                       {item.clientPhone && (
                         <button onClick={() => openWhatsApp(item.clientPhone, item.ticketId, item.smallBags + item.largeBags, item.waLang || 'en')} 
                                 title="Forzar Envío WhatsApp" style={{color: '#25D366', background:'none', border:'none', cursor:'pointer'}}>
                           <MessageCircle size={18} />
                         </button>
                       )}
                    </div>
                    
                    <div className="card-items">
                      {item.smallBags > 0 && (
                        <div className="item-badge"><Backpack size={16} /> x{item.smallBags} Mochila</div>
                      )}
                      {item.largeBags > 0 && (
                        <div className="item-badge"><Briefcase size={16} /> x{item.largeBags} Grande</div>
                      )}
                    </div>
                    
                    <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                      <div>{isDanger && <span className="extra-fee">Penalización Activa (+6h)</span>}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="estimated-price">{totalPrice.toFixed(2)} €</div>
                        <button className="btn btn-primary" style={{ padding: '0.6rem 1rem', width: 'auto' }} onClick={() => setCheckoutModal(item)}>
                          Salida y Pago
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

      {checkoutModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setCheckoutModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title">Gestión de Cobro (Salida)</h2>
              <div className="ticket-tag" style={{background: 'var(--text-primary)', color: 'white'}}>Estantería Nº{checkoutModal.ticketId}</div>
            </div>
            
            <div className="price-breakdown">
              <div className="breakdown-row">
                <span>{checkoutModal.smallBags}x Mochila o Pequeño [4€ base]</span>
                <span>{(checkoutModal.smallBags * PRICE_SMALL).toFixed(2)} €</span>
              </div>
              <div className="breakdown-row">
                <span>{checkoutModal.largeBags}x Maleta Grande [6€ base]</span>
                <span>{(checkoutModal.largeBags * PRICE_LARGE).toFixed(2)} €</span>
              </div>
              {calculatePrice(checkoutModal).extraHours > 0 && (
              <div className="breakdown-row" style={{ color: 'var(--danger)', fontWeight: 500 }}>
                <span>Plus Penallización (+{calculatePrice(checkoutModal).extraHours}h fuera de horario)</span>
                <span>{(calculatePrice(checkoutModal).extraHoursFees).toFixed(2)} €</span>
              </div>
              )}
              <div className="breakdown-row total">
                <span>Total Calculado Cobro</span>
                <span style={{color: 'var(--accent-color)', fontSize: '2rem'}}>{calculatePrice(checkoutModal).totalPrice.toFixed(2)} €</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Liberarás la estantería número {checkoutModal.ticketId} para el próximo turista.
            </div>
            
            <div className="modal-actions">
              <button className="btn" style={{ backgroundColor: '#22c55e', color: 'white' }} onClick={() => confirmCheckout('cash')}>
                <Banknote size={20} /> Metálico / Efectivo
              </button>
              <button className="btn btn-primary" onClick={() => confirmCheckout('card')}>
                <CreditCard size={20} /> Datáfono Tarjeta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Admin;
