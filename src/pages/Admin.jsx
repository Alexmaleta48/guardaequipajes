import { useState, useEffect, useMemo, useRef } from 'react';
import '../App.css';
import { Backpack, Briefcase, Clock, Plus, Package, AlertTriangle, CreditCard, Banknote, RefreshCcw, Search, MessageCircle, Lock, LayoutDashboard, Camera, X, LogOut, Moon, Sun, Grid, List } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

const PRICE_SMALL = 4;
const PRICE_LARGE = 6;
const HOURS_INCLUDED = 6;
const EXTRA_HOUR_RATE = 0.50;
const MAX_SPACES = 40;

// Seguridad manejada por Supabase Auth + JWT Tokens

function Admin() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [emailInput, setEmailInput] = useState(() => localStorage.getItem('admin_email') || '');
  const [pinInput, setPinInput] = useState('');

  // TEMA OSCURO
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  
  // MODO VISTA RADAR
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [waLang, setWaLang] = useState('en');
  const [smallBags, setSmallBags] = useState(0);
  const [largeBags, setLargeBags] = useState(0);
  const [ticketId, setTicketId] = useState('');
  
  const [photoData, setPhotoData] = useState(null);
  const fileInputRef = useRef(null);
  const [photoModal, setPhotoModal] = useState(null);
  
  const [historyModal, setHistoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [checkoutModal, setCheckoutModal] = useState(null);
  
  // APLICAR TEMA OSCURO HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // CONTROL DE SESIÓN SEGURA SUPABASE
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsAuthorized(true);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthorized(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    if (!isAuthorized) return;
    setIsLoading(true);
    try {
      const { data: activeLuggage, error: err1 } = await supabase.from('luggage').select('*').eq('status', 'active');
      if (err1) throw err1;
      
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      const { data: todayHistory, error: err2 } = await supabase.from('luggage').select('*').eq('status', 'completed').gte('check_out_time', todayStart.toISOString());
      if (err2) throw err2;
      
      setInventory(activeLuggage.map(item => ({
        ...item, ticketId: item.ticket_id, clientName: item.client_name, clientPhone: item.client_phone || '', photoData: item.photo_data || null, smallBags: item.small_bags, largeBags: item.large_bags, checkInTime: new Date(item.check_in_time).getTime()
      })));

      setHistory(todayHistory.map(item => ({
         ...item, id: item.id, ticketId: item.ticket_id, clientName: item.client_name, totalPaid: Number(item.total_paid), paymentMethod: item.payment_method || 'cash', checkOutTime: new Date(item.check_out_time).getTime(), smallBags: item.small_bags, largeBags: item.large_bags
      })));
    } catch (error) {
      console.error(error);
      toast.error("Servidor rechaza conexión RLS");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isAuthorized]);

  const availableSpaces = useMemo(() => {
    const occupied = new Set(inventory.map(i => parseInt(i.ticketId, 10)).filter(n => !isNaN(n)));
    const free = [];
    for (let i = 1; i <= MAX_SPACES; i++) {
      if (!occupied.has(i)) free.push(i.toString());
    }
    return free;
  }, [inventory]);

  useEffect(() => {
    if (availableSpaces.length > 0 && (!ticketId || !availableSpaces.includes(ticketId))) {
      setTicketId(availableSpaces[0]);
    } else if (availableSpaces.length === 0) {
      setTicketId('');
    }
  }, [availableSpaces, ticketId]);


  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes('@')) {
      toast.error("Formato de correo inválido");
      return;
    }

    if (!pinInput || pinInput.length < 6) {
      toast.error("La contraseña debe tener mínimo 6 números/letras.");
      return;
    }

    toast.loading("Verificando firma con Servidor...", { id: 'auth' });
    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.trim(),
      password: pinInput
    });
    
    if (error) {
      toast.error("Contraseña Incorrecta", { id: 'auth' });
      setPinInput('');
    } else {
      toast.success("Búnker Abierto con Éxito", { id: 'auth', icon: '🛡️' });
      localStorage.setItem('admin_email', emailInput.trim());
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast("Módulo Cerrado", { icon: '🔒' });
  };

  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoData(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = (e) => {
    e.stopPropagation();
    setPhotoData(null);
    if(fileInputRef.current) fileInputRef.current.value = '';
  }

  const openWhatsApp = (phone, ticketStr, bagsCount, msgLang = 'en') => {
    let text = msgLang === 'es' 
      ? `¡Hola! 👋 Tus ${bagsCount} bultos están a salvo en *Guardaequipajes Elche*.%0A%0A🔑 Tu Espacio Reservado es: *Nº ${ticketStr}*%0A%0ATienes 6 horas cerradas incluidas, luego suma 0.50€ por hora extra cada bulto. Consérvalo en pantalla. ¡Te esperamos! 😊`
      : `Hello! 👋 Your ${bagsCount} bags are safe at *Luggage Storage Elche*.%0A%0A🔑 Your Reserved Space is: *Nº ${ticketStr}*%0A%0AYou have 6 fixed hours included. After that, it's just €0.50 per extra hour per bag. Show this message later. See you! 😊`;
    
    const cleanPhone = phone.replace(/\D/g, ''); 
    const finalPhone = cleanPhone.length === 9 && cleanPhone.startsWith('6') ? `34${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${finalPhone}?text=${text}`, '_blank');
  };

  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (smallBags === 0 && largeBags === 0) return;
    if (!ticketId || inventory.some(i => i.ticketId === ticketId)) {
      toast.error(`Espacio Invalido o Lleno (40/40)`); return;
    }

    const id = ticketId;
    const newName = clientName || `Turista ${id}`;
    const tempItem = { id: "temp-" + Date.now(), ticketId: id, clientName: newName, clientPhone, photoData, waLang, smallBags, largeBags, checkInTime: Date.now(), status: 'active' };
    
    setInventory([tempItem, ...inventory]);
    setClientName(''); setClientPhone(''); setSmallBags(0); setLargeBags(0); setPhotoData(null);
    toast.loading(`Ocupando estantería #${id}...`, { id: 'save' });

    try {
      const { data, error } = await supabase.from('luggage').insert([{ ticket_id: id, client_name: newName, client_phone: tempItem.clientPhone, photo_data: tempItem.photoData, small_bags: smallBags, large_bags: largeBags, status: 'active' }]).select();
      if (error) throw error;
      
      setInventory(prev => prev.map(item => item.id === tempItem.id ? { ...tempItem, id: data[0].id } : item));
      toast.success(`¡Espacio ${id} Asignado y Subido!`, { id: 'save' });

      if (tempItem.clientPhone.trim().length > 5) {
        toast((t) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span>Enviar billete virtual ({tempItem.waLang === 'en' ? 'Inglés' : 'Español'})</span>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button className="btn-success" style={{ padding: '6px 12px', borderRadius: '4px', border:'none', color:'white', cursor:'pointer' }} onClick={() => {
                toast.dismiss(t.id); openWhatsApp(tempItem.clientPhone, tempItem.ticketId, tempItem.smallBags + tempItem.largeBags, tempItem.waLang);
              }}>WhatsApp</button>
              <button style={{ background: '#eee', padding: '6px 12px', borderRadius: '4px', border:'none', cursor:'pointer' }} onClick={() => toast.dismiss(t.id)}>Saltar</button>
            </div>
          </div>
        ), { duration: 15000 });
      }
    } catch (error) {
       console.error(error); toast.error("Guardado local únicamente por error DB.", { id: 'save' });
    }
  };

  const calculateTimeInfo = (checkInTime) => {
    const diffMs = currentTime - checkInTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinsTotal = Math.floor(diffMs / (1000 * 60));
    const isWarning = diffHours >= (HOURS_INCLUDED - 1) && diffHours < HOURS_INCLUDED;
    const isDanger = diffHours >= HOURS_INCLUDED;
    const formatted = `${Math.floor(diffMinsTotal / 60) > 0 ? Math.floor(diffMinsTotal / 60) + 'h ' : ''}${diffMinsTotal % 60}m`;
    return { diffHours, formatted, isWarning, isDanger };
  };

  const calculatePrice = (item) => {
    const { diffHours } = calculateTimeInfo(item.checkInTime);
    const basePrice = (item.smallBags * PRICE_SMALL) + (item.largeBags * PRICE_LARGE);
    let extraHoursFees = diffHours > HOURS_INCLUDED ? Math.ceil(diffHours - HOURS_INCLUDED) * (item.smallBags + item.largeBags) * EXTRA_HOUR_RATE : 0;
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
          const { error } = await supabase.from('luggage').update({ status: 'completed', check_out_time: new Date().toISOString(), total_paid: totalPrice, payment_method: paymentMethod }).eq('id', item.id);
          if (error) throw error;
       }
       toast.success(`Estante #${item.ticketId} cobrado de forma remota`, { id: 'pay' });
    } catch(err) {
       console.error(err); toast.error("Error sincronizando cobro", { id: 'pay' });
    }
  };

  const togglePaymentMethod = async (item) => {
    const newMethod = item.paymentMethod === 'cash' ? 'card' : 'cash';
    setHistory(history.map(h => h.id === item.id ? { ...h, paymentMethod: newMethod } : h));
    try {
      if (!item.id.toString().startsWith("temp-")) {
        await supabase.from('luggage').update({ payment_method: newMethod }).eq('id', item.id);
      }
      toast.success(`Pago cambiado a ${newMethod === 'cash' ? 'Metálico' : 'Tarjeta'}`);
    } catch(err) {
      toast.error("Error corrigiendo en DB. Token obsoleto.");
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
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Lock size={48} color="var(--accent-color)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Panel de control privado. Validar credenciales Supabase.
          </p>
          <form onSubmit={handlePinSubmit}>
            <input 
              type="email" className="form-input" placeholder="Correo Administrador..." 
              style={{ textAlign: 'center', fontSize: '1rem', marginBottom: '1rem' }}
              value={emailInput} onChange={e => setEmailInput(e.target.value)} required
            />
            <input 
              type="password" className="form-input" placeholder="Contraseña Maestra..." 
              style={{ textAlign: 'center', fontSize: '1.2rem', marginBottom: '1rem' }}
              value={pinInput} onChange={e => setPinInput(e.target.value)} autoFocus
            />
            <button className="btn btn-primary" type="submit">Iniciar Sesión Segura</button>
          </form>
          <div style={{ marginTop: '2.5rem' }}>
             <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>&larr; Visitar el Escaparate Turista</Link>
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
      
      {/* SOLUCIÓN AL CORTE DE FOTO VERTICAL (Fix Modal) */}
      {photoModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setPhotoModal(null)} style={{ zIndex: 9999 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <img src={photoModal} alt="Equipaje" style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius:'10px' }} />
             <button onClick={() => setPhotoModal(null)} style={{ position:'absolute', top:'-15px', right:'-15px', background:'white', color:'black', border:'none', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 10px rgba(0,0,0,0.3)', cursor:'pointer' }}>
               <X size={24} />
             </button>
          </div>
        </div>
      )}

      <header className="header animate-fade-in">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
           <h1>
             <LayoutDashboard color="var(--accent-color)" size={32} />
             Mostrador Seguro
           </h1>
           <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button onClick={() => setIsDark(!isDark)} className="btn-outline" style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }} title={isDark ? "Activar Sol" : "Activar Noche"}>
               {isDark ? <Sun size={16} /> : <Moon size={16} />}
             </button>
             <button onClick={fetchData} className="btn-outline" style={{ padding: '0.4rem', borderRadius: '50%' }} title="Sincronizar Datos">
               <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
             </button>
             <button onClick={handleLogout} className="btn-outline" style={{ padding: '0.4rem', borderRadius: '50%', color: 'var(--danger)', borderColor: 'var(--danger-light)' }} title="Cerrar Búnker Supabase">
               <LogOut size={16} />
             </button>
           </div>
        </div>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
          <Link to="/" className="btn-outline" style={{color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, padding:'0.5rem 1rem'}}>🏠 Web Pública</Link>
        </div>
      </header>

      {/* METRICS OF THE DAY */}
      <section className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card" style={{borderColor: isDark ? '#064e3b' : 'var(--success)', background: isDark ? 'rgba(16,185,129,0.1)' : 'var(--success-light)', color: isDark ? '#34d399' : '#065f46'}}>
          <div className="stat-title" style={{color: isDark ? '#34d399' : '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            Caja Hoy (Facturación)
            <button onClick={() => setHistoryModal(true)} style={{background: isDark ? '#064e3b' : 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #10b981', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold', color: isDark ? 'white' : '#065f46'}}>Ver Historial</button>
          </div>
          <div className="stat-value" style={{color: isDark ? '#10b981' : '#065f46'}}>{totalRevenue.toFixed(2)} €</div>
          <div className="stat-trend" style={{ fontSize: '0.9rem', color: isDark ? '#34d399' : '#065f46', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span>💵 Metálico: {totalCash.toFixed(2)}€</span>
            <span>💳 TPV: {totalCard.toFixed(2)}€</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Clientela Atendida Hoy</div>
          <div className="stat-value">{todaysHistory.length} turistas</div>
          <div className="stat-trend">Verificados en BD</div>
        </div>
        <div className="stat-card" style={{borderColor: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--accent-color)'}}>
          <div className="stat-title">Ocupación Física Tienda</div>
          <div className="stat-value" style={{color: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--text-primary)'}}>
            {MAX_SPACES - availableSpaces.length} / {MAX_SPACES}
          </div>
          <div className="stat-trend" style={{ color: availableSpaces.length === 0 ? 'var(--danger)' : 'var(--accent-color)', fontWeight: 'bold' }}>
            {availableSpaces.length === 0 ? '¡TIENDA LLENA!' : `Quedan ${availableSpaces.length} vacías`}
          </div>
        </div>
      </section>

      <div className="main-layout">
        
        {/* CHECK-IN */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', alignSelf: 'start', padding: '2rem' }}>
          <h2 className="panel-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem'}}>
             <div><Plus size={24} /> Nueva Maleta</div>
             <div style={{position: 'relative'}}>
                <input 
                  type="file" accept="image/*" capture="environment" 
                  ref={fileInputRef} onChange={handlePhotoCapture} style={{display: 'none'}} id="camera-upload"
                />
                {!photoData ? (
                  <label htmlFor="camera-upload" title="Fotos Anti-Robo de Maletas" style={{display: 'flex', alignItems: 'center', gap: '0.4rem', background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', border: '1px solid var(--border-color)'}}>
                     <Camera size={16} /> Hacer Foto Extra
                  </label>
                ) : (
                  <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', border: '2px solid var(--accent-color)' }}>
                     <img src={photoData} alt="Preview" style={{width:'100%', height:'100%', objectFit:'cover', cursor: 'pointer' }} onClick={() => setPhotoModal(photoData)} />
                     <button type="button" onClick={clearPhoto} style={{position:'absolute', top:0, right:0, background:'rgba(0,0,0,0.5)', color:'white', border:'none', width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', opacity: 0, transition:'opacity 0.2s'}} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0}>
                       <X size={16} />
                     </button>
                  </div>
                )}
             </div>
          </h2>
          <form onSubmit={handleCheckIn}>
            <div className="form-group form-row">
              <div>
                <label className="form-label">Maletero Destino</label>
                <select 
                  className="form-input" 
                  style={{ background: isDark ? '#0f172a' : '#f8fafc', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)', cursor: 'pointer' }}
                  value={ticketId} onChange={e => setTicketId(e.target.value)} disabled={availableSpaces.length === 0}
                >
                  {availableSpaces.length === 0 && <option value="">LLENO (0 / 40)</option>}
                  {availableSpaces.map(space => (<option key={space} value={space}>Nº {space}</option>))}
                </select>
              </div>
              <div>
                <label className="form-label">Nombre (Opcional)</label>
                <input type="text" className="form-input" placeholder="Anónimo..." value={clientName} onChange={e => setClientName(e.target.value)} disabled={availableSpaces.length === 0} />
              </div>
            </div>

            <div className="form-group" style={{border: '1px solid var(--border-color)', padding: '1rem', borderRadius:'8px', background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa', opacity: availableSpaces.length === 0 ? 0.5 : 1}}>
              <label className="form-label" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <MessageCircle size={18} color="#25D366" /> 
                WhatsApp para Enviar Alerta
              </label>
              <input type="tel" className="form-input" placeholder="Ej: +34 600 12 34 56" value={clientPhone} onChange={e => setClientPhone(e.target.value)} style={{marginBottom: '0.5rem'}} disabled={availableSpaces.length === 0} />
              
              <div style={{display:'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                 <div style={{flex:1, textAlign:'center', fontSize:'0.8rem', padding:'0.4rem', border: waLang==='en'?'2px solid var(--accent-color)':'1px solid var(--border-color)', borderRadius:'4px', cursor:'pointer', background: waLang==='en'?'var(--accent-light)':'transparent', fontWeight: waLang==='en'?700:400}} onClick={()=>setWaLang('en')}>🇬🇧 Inglés</div>
                 <div style={{flex:1, textAlign:'center', fontSize:'0.8rem', padding:'0.4rem', border: waLang==='es'?'2px solid var(--accent-color)':'1px solid var(--border-color)', borderRadius:'4px', cursor:'pointer', background: waLang==='es'?'var(--accent-light)':'transparent', fontWeight: waLang==='es'?700:400}} onClick={()=>setWaLang('es')}>🇪🇸 Español</div>
              </div>
            </div>

            <label className="form-label" style={{ marginTop: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Cantidad de Bultos</label>
            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Mochilas / Standard</span>
                <span className="counter-subtitle">{PRICE_SMALL} € base</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setSmallBags(Math.max(0, smallBags - 1))} disabled={smallBags === 0 || availableSpaces.length === 0}>-</button>
                <span className="counter-value">{smallBags}</span>
                <button type="button" className="counter-btn" onClick={() => setSmallBags(smallBags + 1)} disabled={availableSpaces.length === 0}>+</button>
              </div>
            </div>

            <div className="counter-group">
              <div className="counter-info">
                <span className="counter-title">Maletas Gigantes</span>
                <span className="counter-subtitle">{PRICE_LARGE} € base</span>
              </div>
              <div className="counter-controls">
                <button type="button" className="counter-btn" onClick={() => setLargeBags(Math.max(0, largeBags - 1))} disabled={largeBags === 0 || availableSpaces.length === 0}>-</button>
                <span className="counter-value">{largeBags}</span>
                <button type="button" className="counter-btn" onClick={() => setLargeBags(largeBags + 1)} disabled={availableSpaces.length === 0}>+</button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', background: availableSpaces.length === 0 ? 'var(--text-secondary)' : 'var(--accent-color)' }} disabled={(smallBags === 0 && largeBags === 0) || availableSpaces.length === 0}>
              <Plus size={20} /> {availableSpaces.length === 0 ? 'Sin Espacio Libre' : 'Ocupar Estante Nª' + (ticketId || '?')}
            </button>
          </form>
        </section>

        {/* ACTIVE DASHBOARD */}
        <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="header" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 className="panel-title" style={{ margin: 0 }}><Clock size={24} /> Radar Visual</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn-outline" onClick={() => setViewMode('map')} style={{background: viewMode === 'map' ? 'var(--accent-light)' : 'transparent', color: viewMode === 'map' ? 'var(--accent-color)' : 'var(--text-secondary)', padding:'0.5rem', borderRadius:'6px' }} title="Plano Estantes"><Grid size={18}/></button>
              <button className="btn-outline" onClick={() => setViewMode('list')} style={{background: viewMode === 'list' ? 'var(--accent-light)' : 'transparent', color: viewMode === 'list' ? 'var(--accent-color)' : 'var(--text-secondary)', padding:'0.5rem', borderRadius:'6px'}} title="Lista Bultos"><List size={18}/></button>
            </div>
            
            <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" className="form-input" placeholder="Busca por Nombre o Número..." 
                style={{ paddingLeft: '2.5rem', borderRadius: '2rem', height: '100%', border: '2px solid var(--border-color)', background: isDark ? '#0f172a' : 'white' }}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading && inventory.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>Cargando Plano...</div>
          ) : (
            <>
              {/* PLANO FÍSICO INTERACTIVO (MAPA) */}
              {viewMode === 'map' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: '0.8rem', padding: '1rem 0' }}>
                  {Array.from({length: MAX_SPACES}, (_, i) => i + 1).map(num => {
                    const slotStr = num.toString();
                    const isOccupied = inventory.find(i => i.ticketId === slotStr);
                    
                    if (isOccupied) {
                       const { isDanger, isWarning } = calculateTimeInfo(isOccupied.checkInTime);
                       const bg = isDanger ? 'var(--danger)' : isWarning ? 'var(--warning)' : 'var(--accent-color)';
                       return (
                         <button key={num} onClick={() => setCheckoutModal(isOccupied)} 
                                 title={`${isOccupied.clientName} - ${isOccupied.smallBags + isOccupied.largeBags} bultos`}
                                 style={{ background: bg, color: 'white', border: 'none', borderRadius: '8px', height: '75px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition:'transform 0.1s' }}
                                 onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                                 onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <span style={{ fontSize: '1.4rem'}}>{num}</span>
                            <span style={{fontSize: '0.7rem', opacity: 0.9, marginTop:'2px' }}>{isOccupied.smallBags + isOccupied.largeBags} bts</span>
                         </button>
                       )
                    } else {
                       return (
                         <button key={num} onClick={() => { setTicketId(slotStr); window.scrollTo({top:0, behavior:'smooth'}) }} 
                                 title="Estante Libre - Click para pre-asignar"
                                 style={{ background: isDark ? '#0f172a' : '#f8fafc', color: 'var(--success)', border: '2px dashed var(--success)', borderRadius: '8px', height: '75px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <span style={{ fontSize: '1.2rem', opacity: 0.6 }}>{num}</span>
                         </button>
                       )
                    }
                  })}
                </div>
              )}

              {/* LISTA TRADICIONAL */}
              {viewMode === 'list' && (
                <>
                  {filteredInventory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
                      <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p>{inventory.length === 0 ? "Local vacío de momento." : "Búsqueda sin resultados."}</p>
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
                            <div style={{ fontWeight: 600, display: 'flex', alignItems:'center', gap: '0.5rem' }}>
                               {item.clientName}
                               
                               <div style={{marginLeft:'auto', display:'flex', gap:'0.5rem'}}>
                                  {item.photoData && (
                                    <button onClick={() => setPhotoModal(item.photoData)} title="Ver Foto" style={{color: 'var(--accent-color)', background:'none', border:'none', cursor:'pointer', padding: 0}}>
                                      <Camera size={20} />
                                    </button>
                                  )}
                                  {item.clientPhone && (
                                    <button onClick={() => openWhatsApp(item.clientPhone, item.ticketId, item.smallBags + item.largeBags, item.waLang || 'en')} title="Alertar Turista" style={{color: '#25D366', background:'none', border:'none', cursor:'pointer', padding: 0}}>
                                      <MessageCircle size={20} />
                                    </button>
                                  )}
                               </div>
                            </div>
                            
                            <div className="card-items">
                              {item.smallBags > 0 && (<div className="item-badge"><Backpack size={16} /> x{item.smallBags} Chica</div>)}
                              {item.largeBags > 0 && (<div className="item-badge"><Briefcase size={16} /> x{item.largeBags} Grand</div>)}
                            </div>
                            
                            <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                              <div>{isDanger && <span className="extra-fee">+6h (Añadido recargo)</span>}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="estimated-price">{totalPrice.toFixed(2)} €</div>
                                <button className="btn btn-primary" style={{ padding: '0.6rem 1rem', width: 'auto' }} onClick={() => setCheckoutModal(item)}>
                                  Desocupar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </div>

      {checkoutModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setCheckoutModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{margin:0}}>Cobra y Libera el Nº {checkoutModal.ticketId}</h2>
              <div className="ticket-tag" style={{background: 'var(--text-primary)', color: 'var(--bg-color)'}}><Clock size={16} style={{display:'inline', verticalAlign:'middle'}}/> Llevan {calculateTimeInfo(checkoutModal.checkInTime).formatted}</div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', flexWrap:'wrap' }}>
               <div style={{ background: 'var(--bg-color)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>👤 {checkoutModal.clientName || 'Turista'}</div>
               {checkoutModal.clientPhone && (
                 <button className="btn-outline" onClick={() => openWhatsApp(checkoutModal.clientPhone, checkoutModal.ticketId, checkoutModal.smallBags + checkoutModal.largeBags, checkoutModal.waLang || 'en')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#25D366', borderColor: '#25D366', borderRadius: '4px', display:'flex', alignItems:'center' }}><MessageCircle size={14} style={{marginRight:'4px'}}/> Whatsapp</button>
               )}
               {checkoutModal.photoData && (
                 <button className="btn-outline" onClick={() => setPhotoModal(checkoutModal.photoData)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: 'var(--text-primary)', borderColor: 'var(--border-color)', borderRadius: '4px', display:'flex', alignItems:'center' }}><Camera size={14} style={{marginRight:'4px'}}/> Ver Foto Maleta</button>
               )}
            </div>

            <div className="price-breakdown">
              <div className="breakdown-row"><span>{checkoutModal.smallBags}x Mochila o similar [4€/6h]</span><span>{(checkoutModal.smallBags * PRICE_SMALL).toFixed(2)} €</span></div>
              <div className="breakdown-row"><span>{checkoutModal.largeBags}x Especial Pesada [6€/6h]</span><span>{(checkoutModal.largeBags * PRICE_LARGE).toFixed(2)} €</span></div>
              {calculatePrice(checkoutModal).extraHours > 0 && (
              <div className="breakdown-row" style={{ color: 'var(--danger)', fontWeight: 500 }}><span>Penalización por +{calculatePrice(checkoutModal).extraHours}h extra</span><span>{(calculatePrice(checkoutModal).extraHoursFees).toFixed(2)} €</span></div>
              )}
              <div className="breakdown-row total"><span>Importe Total</span><span style={{color: 'var(--accent-color)', fontSize: '2rem'}}>{calculatePrice(checkoutModal).totalPrice.toFixed(2)} €</span></div>
            </div>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              El cajón Nº {checkoutModal.ticketId} pasará a estar verde en el mapa para el siguiente.
            </div>
            
            <div className="modal-actions">
              <button className="btn" style={{ backgroundColor: '#22c55e', color: 'white' }} onClick={() => confirmCheckout('cash')}>
                <Banknote size={20} /> Metálico
              </button>
              <button className="btn btn-primary" onClick={() => confirmCheckout('card')}>
                <CreditCard size={20} /> TPV (Card)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL (Auditoría Caja Diaria) */}
      {historyModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setHistoryModal(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Arqueo de Ventas Diario</h2>
              <button onClick={() => setHistoryModal(false)} style={{ background: 'var(--bg-color)', padding: '0.5rem', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>
            
            {todaysHistory.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>El negocio no ha ingresado hoy todavía.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {todaysHistory.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="ticket-tag" style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem' }}>{item.ticketId}</span>
                        {item.clientName || 'Turista Anónimo'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Cobrado a las {new Date(item.checkOutTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, minWidth: '60px', textAlign: 'right' }}>{item.totalPaid.toFixed(2)}€</div>
                      <button 
                        onClick={() => togglePaymentMethod(item)} title="Cambiar si te equivocaste en la caja"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-color)', color: 'var(--text-primary)', cursor: 'pointer', width: '95px', justifyContent: 'center', transition: '0.2s' }}
                      >
                        {item.paymentMethod === 'cash' ? <Banknote size={16} color="#10b981" /> : <CreditCard size={16} color="var(--accent-color)" />}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.paymentMethod === 'cash' ? 'EFECTIVO' : 'TARJETA'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
export default Admin;
