import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Calculator, Download, Plus, Minus, FileText, Lock, Banknote, CreditCard, CheckCircle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [exportPeriod, setExportPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'

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

  const reopenShift = async () => {
    toast.loading("Reabriendo Turno...", { id: 'close' });
    const { error } = await supabase.from('daily_shifts').update({
       closed_at: null,
       final_cash_counted: 0,
       final_card_calculated: 0,
       final_cash_calculated: 0,
       difference: 0,
       notes: null
    }).eq('date_opened', todayDate);

    if (!error) {
      setShift({ ...shift, closed_at: null, final_cash_counted: 0, difference: 0 });
      setPhysicalCashCounter('');
      toast.success("Caja reabierta. Ya puedes seguir vendiendo.", { id: 'close' });
    } else {
      toast.error("Error al intentar reabrir turno.", { id: 'close' });
    }
  };

  // EXPORTACIONES NATIVAS A EXCEL (.xlsx)
  const getFilteredData = (dataArray, dateField) => {
    if (exportPeriod === 'all') return dataArray;
    const now = new Date();
    return dataArray.filter(item => {
      const itemDate = new Date(item[dateField]);
      if (exportPeriod === 'today') return itemDate.toDateString() === now.toDateString();
      if (exportPeriod === 'week') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= lastWeek;
      }
      if (exportPeriod === 'month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const exportShiftsExcel = () => {
     let allShifts = shift ? [shift, ...historyShifts] : historyShifts;
     allShifts = getFilteredData(allShifts, 'date_opened');
     
     if(allShifts.length === 0){ toast.error("No hay cierres en el rango seleccionado"); return; }
     
     const exportData = allShifts.map(s => ({
       'Fecha Contable': s.date_opened,
       'Fondo Inicial (€)': Number(s.initial_cash),
       'Ventas TPV Tarjeta (€)': Number(s.final_card_calculated),
       'Ventas Metálico (€)': Number(s.final_cash_calculated),
       'Gastos Anotados (€)': Number(s.total_expenses),
       'Cálculo Informático (€)': Number(s.final_cash_calculated),
       'Dinero Contado Físico (€)': Number(s.final_cash_counted),
       'Descuadre (€)': Number(s.difference),
       'Notas Adicionales': s.notes || ''
     }));

     const worksheet = XLSX.utils.json_to_sheet(exportData);
     const workbook = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(workbook, worksheet, "Arqueos Diarios");
     XLSX.writeFile(workbook, `Arqueos_Lockers_${exportPeriod}_${todayDate}.xlsx`);
     toast.success("Excel Descargado", {icon: '📗'});
  };

  const exportTicketsExcel = async () => {
    toast.loading("Generando Excel de Tickets...", { id: 'export' });
    const { data } = await supabase.from('luggage').select('*').eq('status', 'completed').order('check_out_time', { ascending: false });
    if (!data) { toast.error("Error descargando BD", { id: 'export' }); return; }
    
    let filteredData = getFilteredData(data, 'check_out_time');
    if(filteredData.length === 0){ toast.error("No hay tickets cobrados en este rango", { id: 'export' }); return; }
    
    const exportData = filteredData.map(d => ({
       'ID Ticket': d.ticket_id,
       'Fecha y Hora Ingreso': new Date(d.check_in_time).toLocaleString('es-ES'),
       'Fecha y Hora Cobro': new Date(d.check_out_time).toLocaleString('es-ES'),
       'Identidad Cliente': d.client_name || 'Anónimo',
       'Bultos Pequeños (Unid)': d.small_bags,
       'Bultos Gigantes (Unid)': d.large_bags,
       'Método de Pago Final': d.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta (TPV)',
       'Importe Total (€)': Number(d.total_paid)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trazabilidad Tickets");
    XLSX.writeFile(workbook, `Facturas_Lockers_${exportPeriod}_${todayDate}.xlsx`);
    toast.success("Listado Completo Descargado en Excel", { id: 'export', icon: '📃' });
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
             Cuenta el dinero físico que hay en el cajón y escríbelo para que el sistema compruebe si sobra o falta respecto a las ventas:
           </p>
           <input type="number" step="0.01" className="form-input" style={{fontSize: '1.5rem', textAlign: 'center', marginBottom:'1rem', background: isClosed ? 'var(--bg-color)' : 'var(--surface-color)'}} placeholder="0.00 €" value={isClosed ? (shift.final_cash_counted || 0).toFixed(2) : physicalCashCounter} onChange={e => setPhysicalCashCounter(e.target.value)} disabled={isClosed} />
           
           {!isClosed ? (
             <button onClick={closeShift} className="btn btn-primary" style={{ background: '#10b981', width: '100%' }}>Bloquear y Cerrar Turno</button>
           ) : (
             <>
               <div style={{ textAlign: 'center', padding: '1rem', background: shift.difference === 0 ? 'var(--success-light)' : 'var(--danger-light)', borderRadius: '8px', color: shift.difference === 0 ? '#065f46' : '#7f1d1d', fontWeight: 'bold' }}>
                 {shift.difference === 0 ? '¡CAJA CUADRADA A 0.00€!' : `DESCUADRE DE ${shift.difference > 0 ? '+' : ''}${shift.difference.toFixed(2)}€`}
                 <div style={{fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8}}>Ventas TPV Registradas: {totalCardToday.toFixed(2)}€</div>
               </div>
               
               <button onClick={reopenShift} className="btn-outline" style={{ width: '100%', marginTop: '1rem', color: 'var(--warning)', borderColor: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap:'0.5rem' }}>
                 <RefreshCw size={16} /> Reabrir Caja por Error
               </button>
             </>
           )}
        </div>
      </section>

      {/* HISTORIAL Y EXPORTACIÓN (COLUMNA 2) */}
      <section className="glass-panel animate-fade-in" style={{ animationDelay: '0.2s', padding: '2rem' }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '2rem', flexWrap:'wrap', gap:'1rem'}}>
          <h2 className="panel-title" style={{margin:0}}>
             <Download size={24}/> Exportación para Gestor (.xlsx)
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
             
             <select className="form-input" style={{padding: '0.4rem', width: 'auto'}} value={exportPeriod} onChange={e => setExportPeriod(e.target.value)}>
                <option value="today">Solo Hoy</option>
                <option value="week">Últimos 7 Días</option>
                <option value="month">Este Mes</option>
                <option value="all">Todo el Histórico</option>
             </select>

             <button className="btn-outline" onClick={exportShiftsExcel} style={{padding: '0.5rem 1rem', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--success)', borderColor: 'var(--success)'}}><FileText size={16}/> Resumen Cierres</button>
             <button className="btn-outline" onClick={exportTicketsExcel} style={{padding: '0.5rem 1rem', fontSize:'0.85rem', display:'flex', alignItems:'center', gap:'0.5rem', color:'var(--accent-color)', borderColor: 'var(--accent-color)'}}><FileText size={16}/> Todos los Tickets</button>
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
                   <th style={{padding:'0.5rem'}}>Ventas Tarjeta TPV</th>
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
