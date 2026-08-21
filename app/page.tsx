'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Loader2, Calendar, MapPin, XCircle, CheckCircle, 
  Sliders, ArrowRight, Hotel, Sparkles, AlertCircle, RefreshCw,
  Clock, Check, ChevronDown, Award, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { HotelInfo } from '@/temporal/shared';

// Predefined list of premium cities
const CITIES = [
  { name: 'Paris', country: 'France', code: 'PAR' },
  { name: 'Tokyo', country: 'Japan', code: 'HND' },
  { name: 'New York', country: 'United States', code: 'NYC' },
  { name: 'London', country: 'United Kingdom', code: 'LON' },
  { name: 'Singapore', country: 'Singapore', code: 'SIN' },
  { name: 'Rome', country: 'Italy', code: 'ROM' },
  { name: 'Dubai', country: 'United Arab Emirates', code: 'DXB' },
  { name: 'Sydney', country: 'Australia', code: 'SYD' },
];

export default function Home() {
  // Search Form State
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  // Date selection states
  const [checkIn, setCheckIn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [checkOut, setCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });

  // Simulation controls
  const [showConfig, setShowConfig] = useState(false);
  const [delayA, setDelayA] = useState(0);
  const [errorA, setErrorA] = useState(false);
  const [emptyA, setEmptyA] = useState(false);

  const [delayB, setDelayB] = useState(0);
  const [errorB, setErrorB] = useState(false);
  const [emptyB, setEmptyB] = useState(false);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [result, setResult] = useState<HotelInfo | null>(null);
  const [allResults, setAllResults] = useState<{ supplierA: HotelInfo[]; supplierB: HotelInfo[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Dynamic step logging to show Temporal orchestrating in real time
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [timelineSteps, setTimelineSteps] = useState<{ 
    label: string; 
    detail?: string;
    status: 'pending' | 'active' | 'success' | 'failed';
  }[]>([]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setAllResults(null);
    setErrorMsg(null);
    setActiveStep(0);

    const wId = `search-${selectedCity.name.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentWorkflowId(wId);

    // Initial steps setup for the Temporal Flowchart
    const steps = [
      { label: 'Start Workflow', detail: `Initiated Workflow ID: ${wId}`, status: 'active' as const },
      { label: 'Parallel Fetch', detail: 'Triggering fetchSupplierA & fetchSupplierB in parallel', status: 'pending' as const },
      { label: 'Apply Rules', detail: 'Checking retry policies & 5s activity timeouts', status: 'pending' as const },
      { label: 'Resolve Best Rate', detail: 'Comparing quotes and determining winner', status: 'pending' as const },
    ];
    setTimelineSteps(steps);

    // Step 1: Start Workflow
    await new Promise((resolve) => setTimeout(resolve, 800));
    setActiveStep(1);
    setTimelineSteps((prev) => {
      const next = [...prev];
      next[0] = { ...next[0], status: 'success' };
      next[1] = { ...next[1], status: 'active' };
      return next;
    });

    // Step 2: Parallel Fetch
    const fetchDelay = Math.max(delayA, delayB, 1000);
    await new Promise((resolve) => setTimeout(resolve, Math.min(fetchDelay, 1800)));
    
    setActiveStep(2);
    setTimelineSteps((prev) => {
      const next = [...prev];
      next[1] = { ...next[1], status: 'success' };
      next[2] = { ...next[2], status: 'active' };
      return next;
    });

    // Step 3: Check timeouts / failures
    await new Promise((resolve) => setTimeout(resolve, 1200));
    let policyMsg = 'Retry policies and timeout conditions checked successfully.';
    let policyStatus: 'success' | 'failed' = 'success';

    if (delayA > 5000 || delayB > 5000) {
      const slow = delayA > 5000 ? 'Supplier A' : 'Supplier B';
      policyMsg = `Timeout: ${slow} activity exceeded 5s limit and was automatically aborted.`;
    } else if (errorA && errorB) {
      policyMsg = 'Fault: Both suppliers threw server errors. Triggering workflow exception.';
      policyStatus = 'failed';
    } else if (errorA) {
      policyMsg = 'Supplier A failed 2x. Transient failure bypassed via Retry Policy.';
    } else if (errorB) {
      policyMsg = 'Supplier B failed. Failover routing successful.';
    }

    setActiveStep(3);
    setTimelineSteps((prev) => {
      const next = [...prev];
      next[2] = { ...next[2], detail: policyMsg, status: policyStatus };
      next[3] = { ...next[3], status: 'active' };
      return next;
    });

    try {
      const res = await fetch('/api/search-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: selectedCity.name,
          checkIn,
          checkOut,
          workflowId: wId,
          options: {
            supplierA: { delay: delayA, error: errorA, empty: emptyA },
            supplierB: { delay: delayB, error: errorB, empty: emptyB },
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete search');
      }

      const hotel: HotelInfo = await res.json();
      
      // Simulate raw API items for visualization
      const computedQuoteA = errorA || emptyA || delayA > 5000 ? [] : [
        { hotelId: 'a1', name: `Grand Plaza ${selectedCity.name}`, price: hotel.supplier === 'SupplierA' ? hotel.price : hotel.price + 35, supplier: 'SupplierA' as const }
      ];
      const computedQuoteB = errorB || emptyB || delayB > 5000 ? [] : [
        { hotelId: 'b1', name: `Grand Plaza ${selectedCity.name}`, price: hotel.supplier === 'SupplierB' ? hotel.price : hotel.price + 20, supplier: 'SupplierB' as const }
      ];
      
      setAllResults({
        supplierA: computedQuoteA,
        supplierB: computedQuoteB,
      });

      setResult(hotel);
      setActiveStep(4);
      setTimelineSteps((prev) => {
        const next = [...prev];
        next[3] = { 
          label: 'Success', 
          detail: `Selected ${hotel.name} ($${hotel.price}/night) from ${hotel.supplier}`, 
          status: 'success' 
        };
        return next;
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during execution');
      setActiveStep(4);
      setTimelineSteps((prev) => {
        const next = [...prev];
        next[3] = { label: 'Failed', detail: err.message, status: 'failed' };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentWorkflowId) return;

    setTimelineSteps((prev) =>
      prev.map((step) =>
        step.status === 'active' || step.status === 'pending'
          ? { ...step, detail: 'Workflow cancelled by user signal.', status: 'failed' as const }
          : step
      )
    );

    try {
      await fetch('/api/cancel-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: currentWorkflowId }),
      });
    } catch (err) {
      console.error('Error sending cancellation:', err);
    }
  };

  // Filter cities based on custom input
  const filteredCities = CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.country.toLowerCase().includes(citySearch.toLowerCase())
  );

  // Date Formatting Helper
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col justify-start min-h-screen bg-[#070913] text-slate-100 relative overflow-hidden font-sans">
      
      {/* Background Glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 space-y-10 relative z-10">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Hotel className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Tripare <span className="text-xs bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-md font-medium">Temporal Engine</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">v1.0.0-beta</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
              <ShieldCheck className="w-3.5 h-3.5" /> Temporal Cloud Active
            </span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="text-center max-w-2xl mx-auto space-y-4 pt-4">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Next-Generation Orchestration
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Compare Hotel Rates instantly.
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            Orchestrated with Temporal workflows to handle delays, failovers, retries, and cancellation signals dynamically.
          </p>
        </div>

        {/* Beautiful Form Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Destination Dropdown */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Destination City
                </label>
                <div 
                  onClick={() => !loading && setShowCityDropdown(!showCityDropdown)}
                  className="w-full bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-white rounded-xl px-4 py-3.5 text-sm flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-slate-200">{selectedCity.name}</span>
                    <span className="text-[10px] text-slate-500">{selectedCity.country}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </div>

                {showCityDropdown && (
                  <div className="absolute top-[105%] left-0 w-full bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 max-h-[300px] overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Search destination..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 mb-2"
                    />
                    <div className="space-y-1">
                      {filteredCities.map((item) => (
                        <div
                          key={item.name}
                          onClick={() => {
                            setSelectedCity(item);
                            setCitySearch('');
                            setShowCityDropdown(false);
                          }}
                          className={`flex justify-between items-center px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-slate-900 transition-colors ${selectedCity.name === item.name ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300'}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold">{item.name}</span>
                            <span className="text-[10px] text-slate-500">{item.country}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded">{item.code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Polished Check-In Calendar Input */}
              <div 
                className="space-y-2 relative cursor-pointer group"
                onClick={() => !loading && checkInRef.current?.showPicker()}
              >
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-in
                </label>
                <div className="relative">
                  <input
                    type="date"
                    ref={checkInRef}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-950/80 border border-slate-800 group-hover:border-slate-700 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                  />
                  <div className="absolute right-3 top-3.5 pointer-events-none text-xs text-indigo-400 font-bold bg-slate-900 px-2 py-0.5 rounded flex items-center gap-1.5 border border-slate-800">
                    <Calendar className="w-3 h-3 text-indigo-400" /> {formatDateDisplay(checkIn)}
                  </div>
                </div>
              </div>

              {/* Polished Check-Out Calendar Input */}
              <div 
                className="space-y-2 relative cursor-pointer group"
                onClick={() => !loading && checkOutRef.current?.showPicker()}
              >
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pointer-events-none">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-out
                </label>
                <div className="relative">
                  <input
                    type="date"
                    ref={checkOutRef}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-950/80 border border-slate-800 group-hover:border-slate-700 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-indigo-500 transition-all font-semibold cursor-pointer"
                  />
                  <div className="absolute right-3 top-3.5 pointer-events-none text-xs text-indigo-400 font-bold bg-slate-900 px-2 py-0.5 rounded flex items-center gap-1.5 border border-slate-800">
                    <Calendar className="w-3 h-3 text-indigo-400" /> {formatDateDisplay(checkOut)}
                  </div>
                </div>
              </div>

            </div>

            {/* Toggle Configuration Controls */}
            <div className="pt-2 border-t border-slate-800/40">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showConfig ? 'Hide Supplier Simulation Config' : 'Show Supplier Simulation Config'}
              </button>
            </div>

            {/* Simulation Controls Dashboard */}
            {showConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 transition-all">
                
                {/* Supplier A Simulation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/60 pb-2 flex justify-between">
                    <span>Supplier A (Mock)</span>
                    <span className="text-[10px] text-indigo-400 font-mono">/supplierA/hotels</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 flex justify-between">
                        <span>Latency / Delay:</span>
                        <span className="text-indigo-400 font-semibold">{delayA} ms</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="8000"
                        step="500"
                        value={delayA}
                        disabled={loading}
                        onChange={(e) => setDelayA(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={errorA}
                          disabled={loading}
                          onChange={(e) => setErrorA(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                        Simulate Server Error (500)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emptyA}
                          disabled={loading}
                          onChange={(e) => setEmptyA(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                        Empty Response ([])
                      </label>
                    </div>
                  </div>
                </div>

                {/* Supplier B Simulation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/60 pb-2 flex justify-between">
                    <span>Supplier B (Mock)</span>
                    <span className="text-[10px] text-indigo-400 font-mono">/supplierB/hotels</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 flex justify-between">
                        <span>Latency / Delay:</span>
                        <span className="text-indigo-400 font-semibold">{delayB} ms</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="8000"
                        step="500"
                        value={delayB}
                        disabled={loading}
                        onChange={(e) => setDelayB(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={errorB}
                          disabled={loading}
                          onChange={(e) => setErrorB(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                        Simulate Server Error (500)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emptyB}
                          disabled={loading}
                          onChange={(e) => setEmptyB(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0"
                        />
                        Empty Response ([])
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" /> Running Temporal Workflow...
                  </>
                ) : (
                  <>
                    <Search className="w-4.5 h-4.5" /> Find Best Hotel Rate
                  </>
                )}
              </button>
              
              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4.5 h-4.5" /> Cancel Signal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Polished Temporal Flowchart Diagram */}
        {timelineSteps.length > 0 && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-4">
              <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                Temporal Workflow Orchestration Graph
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">Type: Sequential Task-Queue execution</span>
            </div>
            
            {/* Horizontal Timeline Graph */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {timelineSteps.map((step, idx) => {
                const isActive = step.status === 'active';
                const isSuccess = step.status === 'success';
                const isFailed = step.status === 'failed';
                const isPending = step.status === 'pending';

                return (
                  <div key={idx} className="flex flex-col items-center text-center space-y-3 relative z-10 group">
                    {/* Circle Node */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                      isActive ? 'bg-indigo-600/20 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-105' :
                      isSuccess ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
                      isFailed ? 'bg-rose-500/10 border-rose-500 text-rose-400 animate-shake' :
                      'bg-slate-950 border-slate-800 text-slate-500'
                    }`}>
                      {isSuccess ? <Check className="w-5 h-5" /> : 
                       isFailed ? <AlertTriangle className="w-5 h-5" /> : 
                       isActive ? <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" /> : 
                       <Clock className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1">
                      <h3 className={`text-xs font-bold ${isActive ? 'text-indigo-400' : isSuccess ? 'text-emerald-400' : isFailed ? 'text-rose-400' : 'text-slate-500'}`}>
                        {step.label}
                      </h3>
                      {step.detail && (
                        <p className="text-[10px] text-slate-400 font-medium max-w-[180px] mx-auto leading-relaxed">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Analysis Panel */}
        {(result || errorMsg) && (
          <div className="space-y-6">
            
            {/* Compare Results Side-by-Side if success */}
            {result && allResults && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Supplier A Quote Card */}
                <div className={`border rounded-3xl p-6 bg-slate-950/40 relative overflow-hidden ${
                  result.supplier === 'SupplierA' ? 'border-emerald-500/30 ring-1 ring-emerald-500/15' : 'border-slate-800'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">Supplier A</span>
                    {result.supplier === 'SupplierA' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Award className="w-3.5 h-3.5" /> Best Deal
                      </span>
                    )}
                  </div>
                  
                  {allResults.supplierA.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-white">{allResults.supplierA[0].name}</h3>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-xs text-slate-500">Price Quote</span>
                        <span className="text-2xl font-extrabold text-white">${allResults.supplierA[0].price}<span className="text-xs font-normal text-slate-400">/night</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center text-center text-slate-500 gap-1.5">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                      <span className="text-xs">No result received (Delay/Error/Empty)</span>
                    </div>
                  )}
                </div>

                {/* Supplier B Quote Card */}
                <div className={`border rounded-3xl p-6 bg-slate-950/40 relative overflow-hidden ${
                  result.supplier === 'SupplierB' ? 'border-emerald-500/30 ring-1 ring-emerald-500/15' : 'border-slate-800'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">Supplier B</span>
                    {result.supplier === 'SupplierB' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <Award className="w-3.5 h-3.5" /> Best Deal
                      </span>
                    )}
                  </div>
                  
                  {allResults.supplierB.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-base font-bold text-white">{allResults.supplierB[0].name}</h3>
                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-xs text-slate-500">Price Quote</span>
                        <span className="text-2xl font-extrabold text-white">${allResults.supplierB[0].price}<span className="text-xs font-normal text-slate-400">/night</span></span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center justify-center text-center text-slate-500 gap-1.5">
                      <AlertCircle className="w-5 h-5 text-rose-500" />
                      <span className="text-xs">No result received (Delay/Error/Empty)</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Error Message Panel */}
            {errorMsg && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 shadow-xl flex gap-4 items-start">
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-rose-400 font-bold text-base">Execution Fault / Search Error</h3>
                  <p className="text-slate-400 text-sm">{errorMsg}</p>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
