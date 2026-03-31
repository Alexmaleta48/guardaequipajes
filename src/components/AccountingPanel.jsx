import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Calculator, Download, Plus, Minus, FileText, Lock, Banknote, CreditCard, CheckCircle } from 'lucide-react';

export default function AccountingPanel({ isDark, totalCashToday, totalCardToday }) {
  const [shift, setShift] = useState(null);
  const [movements, setMovements] = useState([]);
  const [historyShifts, setHistoryShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formularios
  const [initialCashInput, setInitialCashInput] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseReason, setExpenseReason] = useState('');
  const [physicalCashCounter, setPhysicalCashCounter] = useState('');

  const getLocalDate = () => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzOffset)).toISOString().split('T')[0];
  };
  const todayDate = getLocalDate();

  const loadData = async () => {
    setLoading(true);
    try {
      // Intentar cargar turno de hoy
      let { data: shiftData, error: shiftErr } = await supabase.from('daily_shifts')
         .select('*').eq('date_opened', todayDate).maybeSingle();
      
      if (!shiftData) {
        // Crear turno en blanco si es el primer inicio de caja del día
        const { data: newShift, error: createErr } = await supabase.from('daily_shifts')
           .insert([{ date_opened: todayDate, initial_cash: 0 }]).select().single();
        if (!createErr) shiftData = newShift;
      }
      setShift(shiftData);
      if (shiftData) setInitialCashInput(shiftData.initial_cash.toString());

      // Gastos menores
      const { data: movs } = await supabase.from('cash_movements').select('*').eq('shift_date', todayDate);
      if (movs) setMovements(movs);

      // Cierres anteriores
      const { data: history } = await supabase.from('daily_shifts').select('*').neq('date_opened', todayDate).order('date_opened', { ascending: false });
      if (history) setHistoryShifts(history);

    } catch (err) {
      console.error(err);
      toast.error("Error al cargar contabilidad", { id: 'acc' });
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const totalExpenses = movements.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const calculatedDrawerCash = (shift?.initial_cash || 0) + totalCashToday - totalExpenses;

  const updateInitialCash = async () => {
    const val = parseFloat(initialCashInput) || 0;
    const { error } = await supabase.from('daily_shifts').update({ initial_cash: val }).eq('date_opened', todayDate);
    if (!error) {
      setShift({ ...shift, initial_cash: val });
      toast.success("Fondo de caja guardado");
    } else {
      toast.error("Error al guardar fondo");
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!expenseAmount || !expenseReason) return;
    const val = parseFloat(expenseAmount);
    if (val <= 0) return;

    const { data, error } = await supabase.from('cash_movements')
       .insert([{ shift_date: todayDate, amount: val, reason: expenseReason }]).select();
    
    if (!error && data) {
      setMovements([...movements, data[0]]);
      setExpenseAmount(''); setExpenseReason('');
      toast.success("Gasto restado de la caja");
    } else {
      toast.error("No se pudo anotar gasto");
    }
  };

  const closeShift = async () => {
    if (physicalCashCounter === '') { toast.error("Por favor, introduce cuánto dinero cuentas con las manos en el cajón físico.", { id: 'close' }); return; }
    
    const physical = parseFloat(physicalCashCounter);
    const difference = physical - calculatedDrawerCash;

    toast.loading("Realizando Cierre Informático...", { id: 'close' });
    const { error } = await supabase.from('daily_shifts').update({
       closed_at: new Date().toISOString(),
       final_cash_counted: physical,
       final_card_calculated: totalCardToday,
       final_cash_calculated: calculatedDrawerCash,
       total_expenses: totalExpenses,
       difference: difference,
       notes: difference !== 0 ? `Descuadre de ${difference.toFixed(2)}€` : 'Cuadre Perfecto'
    }).eq('date_opened', todayDate);

    if (!error) {
      setShift({ ...shift, closed_at: new Date().toISOString(), final_cash_counted: physical, difference, final_card_calculated: totalCardToday });
      toast.success(difference === 0 ? "¡Cierre Perfecto al céntimo! 🎉" : `Cierre guardado. Diferencia: ${difference.toFixed(2)}€`, { id: 'close', duration: 4000 });
    } else {
      toast.error("Error en base de datos al cerrar", { id: 'close' });
    }
  };

  // EXPORTACIONES A CSV PARA EL ASESOR FISCAL (Excel)
  const downloadCSV = (content, filename) => {
    const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportShiftsCSV = () => {
     let csv = "Fecha de Caja,Fondo Inicial,Ventas Tarjeta TPV,Ventas Efectivo,Gastos Anotados,Cálculo Final Informático,Dinero Contado Cierre,Descuadre,Notas\n";
     const allShifts = shift ? [shift, ...historyShifts] : historyShifts;
     allShifts.forEach(s => {
        csv += `${s.date_opened},${s.initial_cash},${s.final_card_calculated},${s.final_cash_calculated},${s.total_expenses},${s.final_cash_calculated},${s.final_cash_counted},${s.difference},"${s.notes || ''}"\n`;
     });
     downloadCSV(csv, `Cierres_Caja_${todayDate}.csv`);
  };

  const exportTicketsCSV = async () => {
    toast.loading("Recopilando facturas...", { id: 'export' });
    const { data } = await supabase.from('luggage').select('*').eq('status', 'completed').order('check_out_time', { ascending: false });
    if (!data) { toast.error("Error descargando", { id: 'export' }); return; }
    
    let csv = "Ticket ID,Fecha Ingreso,Fecha Cobro,Cliente,Bultos Pequeños,Bultos Grandes,Total Cobrado (€),Método de Pago\n";
    data.forEach(d => {
       csv += `"${d.ticket_id}","${new Date(d.check_in_time).toLocaleString('es-ES')}","${new Date(d.check_out_time).toLocaleString('es-ES')}","${d.client_name || 'Anónimo'}",${d.small_bags},${d.large_bags},${d.total_paid},${d.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}\n`;
    });
    toast.success("CSV Generado con éxito", { id: 'export' });
    downloadCSV(csv, `Todos_Los_Tickets_${todayDate}.csv`);
  };

  if (loading) return <div style={{textAlign: 'center', padding: '4rem'}}>Sincronizando caja fuerte...</div>;

  const isClosed = !!shift?.closed_at;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
      
      {/* CUADRE DIARIO Y GASTOS (COLUMNA 1) */}
      <section className="glass-panel animate-fade-in" style={{ padding: '2rem' }}>
        <h2 className="panel-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
           <span><Calculator size={24}/> Turno Hoy</span>
           {isClosed && <span style={{background: 'var(--success)', color:'white', fontSize:'0.7rem', padding:'0.2rem 0.6rem', borderRadius:'20px'}}>CERRADO</span>}
        </h2>

        {!isClosed && (
          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ fontWeight: 'bold' }}>Fondo de Caja del Cajón Físico</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input type="number" step="0.01" className="form-input" value={initialCashInput} onChange={e => setInitialCashInput(e.target.value)} placeholder="Ej: 50.00" />
              <button className="btn btn-outline" style={{width:'auto'}} onClick={updateInitialCash} disabled={isClosed}>Guardar</button>
            </div>
          </div>
        )}

        <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}><Minus size={16} style={{color:'var(--danger)', display:'inline'}} /> Gastos Menores Hoy</h3>
          {movements.length === 0 ? <p style={{fontSize:'0.85rem', color:'var(--text-secondary)'}}>Sin gastos anotados.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.85rem' }}>
              {movements.map(m => (
                <li key={m.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', padding: '0.5rem 0' }}>
                  <span>{m.reason}</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>-{Number(m.amount).toFixed(2)}€</span>
                </li>
              ))}
            </ul>
          )}
          
          {!isClosed && (
            <form onSubmit={addExpense} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <input type="text" className="form-input" style={{padding:'0.4rem', fontSize:'0.85rem'}} placeholder="Ej: Rollo tickets" value={expenseReason} onChange={e => setExpenseReason(e.target.value)} />
              <input type="number" step="0.01" className="form-input" style={{padding:'0.4rem', fontSize:'0.85rem', width: '80px'}} placeholder="€" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
              <button type="submit" className="btn btn-outline" style={{padding:'0.4rem', width:'auto', color:'var(--danger)', borderColor:'var(--danger)'}}><Plus size={16}/></button>
            </form>
          )}
        </div>

        {/* BOTÓN MAGICO CIERRE DE CAJA */}
        <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1.5rem' }}>
           <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}><CheckCircle size={16} style={{display:'inline'}} /> Arqueo Ciego Final</h3>
           <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
             Cuenta el dinero en billetes y monedas que tienes dentro del cajón ahora mismo sin mirar y escríbelo aquí para comprobar si cuadra matemáticamente:
           </p>
           <input type="number" step="0.01" className="form-input" style={{fontSize: '1.5rem', textAlign: 'center', marginBottom:'1rem', background: isClosed ? 'var(--bg-color)' : 'var(--surface-color)'}} placeholder="0.00 €" value={isClosed ? (shift.final_cash_counted || 0).toFixed(2) : physicalCashCounter} onChange={e => setPhysicalCashCounter(e.target.value)} disabled={isClosed} />
           
           {!isClosed ? (
             <button onClick={closeShift} className="btn btn-primary" style={{ background: '#10b981', width: '100%' }}>Bloquear y Cerrar Turno</button>
           ) : (
             <div style={{ textAlign: 'center', padding: '1rem', background: shift.difference === 0 ? 'var(--success-light)' : 'var(--danger-light)', borderRadius: '8px', color: shift.difference === 0 ? '#065f46' : '#7f1d1d', fontWeight: 'bold' }}>
               {shift.difference === 0 ? '¡CAJA CUADRADA A 0.00€!' : `DESCUADRE DE ${shift.difference > 0 ? '+' : ''}${shift.difference.toFixed(2)}€`}
               <div style={{fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8}}>Ventas TPV Registradas: {totalCardToday.toFixed(2)}€</div>
             </div>
           )}
        </div>
      </section>

      {/* HISTORIAL Y EXPORTACIÓN (COLUMNA 2) */}
      <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', padding: '2rem' }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '2rem', flexWrap:'wrap', gap:'1rem'}}>
          <h2 className="panel-title" style={{margin:0}}>
             <Download size={24}/> Exportación para Gestoría
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn-outline" onClick={exportShiftsCSV} style={{padding: '0.5rem 1rem', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--text-primary)'}}><FileText size={16}/> Todos los Cierres (Días)</button>
             <button className="btn-outline" onClick={exportTicketsCSV} style={{padding: '0.5rem 1rem', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--text-primary)'}}><FileText size={16}/> Todos los Tickets (Individual)</button>
          </div>
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Auditoría Matemática Informática Módulo Hoy:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr', gap: '1rem', background: 'var(--bg-color)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border-color)'}}>
          <div>Fondo Inicial de Caja:</div><div style={{textAlign:'right', fontWeight:'bold'}}>{(shift?.initial_cash || 0).toFixed(2)} €</div>
          <div><Banknote size={16} style={{display:'inline', verticalAlign:'middle'}}/> Ingresos Ventas (Efectivo):</div><div style={{textAlign:'right', fontWeight:'bold', color:'var(--success)'}}>+{totalCashToday.toFixed(2)} €</div>
          <div><Minus size={16} style={{display:'inline', verticalAlign:'middle'}}/> Gastos Menores / Compras:</div><div style={{textAlign:'right', fontWeight:'bold', color:'var(--danger)'}}>-{totalExpenses.toFixed(2)} €</div>
          <div style={{borderTop:'2px solid var(--text-secondary)', paddingTop:'0.5rem', fontWeight:'bold', color:'var(--accent-color)'}}>DEBERÍA HABER FÍSICAMENTE:</div><div style={{borderTop:'2px solid var(--text-secondary)', paddingTop:'0.5rem', textAlign:'right', fontWeight:'bold', color:'var(--accent-color)', fontSize:'1.2rem'}}>{calculatedDrawerCash.toFixed(2)} €</div>
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Días Anteriores (Histórico Cierres)</h3>
        {historyShifts.length === 0 ? <p style={{color:'var(--text-secondary)', fontSize:'0.9rem'}}>No hay días de cierre archivados.</p> : (
          <div style={{overflowX: 'auto'}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
               <thead>
                 <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                   <th style={{padding:'0.5rem'}}>Fecha</th>
                   <th style={{padding:'0.5rem'}}>Base Recaudada TPV</th>
                   <th style={{padding:'0.5rem'}}>Ingreso Efectivo Total</th>
                   <th style={{padding:'0.5rem'}}>Cuadre Final</th>
                 </tr>
               </thead>
               <tbody>
                 {historyShifts.map(h => (
                   <tr key={h.date_opened} style={{ borderBottom: '1px solid var(--border-color)' }}>
                     <td style={{padding:'0.5rem', fontWeight:'bold'}}>{h.date_opened}</td>
                     <td style={{padding:'0.5rem'}}>{h.final_card_calculated} €</td>
                     <td style={{padding:'0.5rem'}}>{h.final_cash_calculated} €</td>
                     <td style={{padding:'0.5rem'}}>
                        {h.difference === 0 
                          ? <span style={{color:'var(--success)', fontWeight:'bold'}}>0.00€ (PERFECTO)</span> 
                          : <span style={{color:'var(--danger)', fontWeight:'bold'}}>Descuadre {h.difference}€</span>}
                     </td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
