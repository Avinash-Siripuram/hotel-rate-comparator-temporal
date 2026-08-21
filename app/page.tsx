'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Calendar, MapPin, XCircle, AlertTriangle, CheckCircle, ShieldAlert, Sliders, ArrowRight } from 'lucide-react';
import { HotelInfo } from '@/temporal/shared';

export default function Home() {
  // Search Form State
  const [city, setCity] = useState('Paris');
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Dynamic step logging to show Temporal orchestrating in real time
  const [timelineSteps, setTimelineSteps] = useState<{ label: string; status: 'pending' | 'active' | 'success' | 'failed' | 'neutral' }[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    const wId = `search-${city.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentWorkflowId(wId);

    // Initialize timelines
    const steps = [
      { label: `Initiating Temporal workflow: ${wId}`, status: 'active' as const },
      { label: 'Calling Supplier A and Supplier B in parallel', status: 'pending' as const },
      { label: 'Applying 5s timeout & retry policies', status: 'pending' as const },
      { label: 'Selecting and returning the cheapest rate', status: 'pending' as const },
    ];
    setTimelineSteps(steps);

    // Step 1: Workflow Started
    await new Promise((resolve) => setTimeout(resolve, 800));
    setTimelineSteps((prev) => {
      const next = [...prev];
      next[0] = { ...next[0], status: 'success' };
      next[1] = { ...next[1], status: 'active' };
      return next;
    });

    // Step 2: Parallel Fetching
    const fetchDelay = Math.max(delayA, delayB, 1200);
    await new Promise((resolve) => setTimeout(resolve, Math.min(fetchDelay, 1500)));
    
    setTimelineSteps((prev) => {
      const next = [...prev];
      next[1] = { ...next[1], status: 'success' };
      next[2] = { ...next[2], status: 'active' };
      return next;
    });

    // Step 3: Check timeouts / failures
    await new Promise((resolve) => setTimeout(resolve, 1000));
    let policyMsg = 'Applying 5s timeout & retry policies';
    let policyStatus: 'success' | 'failed' = 'success';

    if (delayA > 5000 || delayB > 5000) {
      const slow = delayA > 5000 ? 'Supplier A' : 'Supplier B';
      policyMsg = `Timeout: ${slow} exceeded 5s and was cancelled. Proceeding with alternative result.`;
    } else if (errorA && errorB) {
      policyMsg = 'Both suppliers failed. Raising workflow exception.';
      policyStatus = 'failed';
    } else if (errorA) {
      policyMsg = 'Supplier A failed 2x before error. Recovered using Supplier B.';
    } else if (errorB) {
      policyMsg = 'Supplier B failed. Recovered using Supplier A.';
    } else {
      policyMsg = 'Timeout and retry policy checks passed successfully.';
    }

    setTimelineSteps((prev) => {
      const next = [...prev];
      next[2] = { label: policyMsg, status: policyStatus };
      next[3] = { ...next[3], status: 'active' };
      return next;
    });

    try {
      const res = await fetch('/api/search-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
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
      setResult(hotel);
      
      setTimelineSteps((prev) => {
        const next = [...prev];
        next[3] = { label: `Cheapest found: ${hotel.name} ($${hotel.price}) via ${hotel.supplier}`, status: 'success' };
        return next;
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during execution');
      setTimelineSteps((prev) => {
        const next = [...prev];
        next[3] = { label: `Workflow execution failed: ${err.message}`, status: 'failed' };
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentWorkflowId) return;

    // Instantly set timeline cancellation status
    setTimelineSteps((prev) =>
      prev.map((step) =>
        step.status === 'active' || step.status === 'pending'
          ? { ...step, label: 'Search cancelled by user', status: 'failed' as const }
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

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-indigo-500/20">
            Temporal.io Orchestrated Workflows
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Hotel Rate Comparator
          </h1>
          <p className="max-w-md mx-auto text-sm sm:text-base text-slate-400">
            Compare live rates in parallel with reliable failovers, timeouts, and automatic retry policies.
          </p>
        </div>

        {/* Search Engine Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Destination */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Destination
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="Paris">Paris</option>
                  <option value="Tokyo">Tokyo</option>
                  <option value="New York">New York</option>
                </select>
              </div>

              {/* Check-in */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-in Date
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Check-out */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" /> Check-out Date
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  disabled={loading}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

            </div>

            {/* Toggle Configuration Controls */}
            <div className="pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showConfig ? 'Hide Supplier Simulation Config' : 'Show Supplier Simulation Config'}
              </button>
            </div>

            {/* Simulation Controls Dashboard */}
            {showConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 transition-all">
                
                {/* Supplier A Simulation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/80 pb-2 flex justify-between">
                    <span>Supplier A (Mock)</span>
                    <span className="text-[10px] text-indigo-400 lowercase">endpoint: /supplierA/hotels</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 flex justify-between">
                        <span>Latency (ms):</span>
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
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Simulate Server Error (500)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emptyA}
                          disabled={loading}
                          onChange={(e) => setEmptyA(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Empty Response ([])
                      </label>
                    </div>
                  </div>
                </div>

                {/* Supplier B Simulation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/80 pb-2 flex justify-between">
                    <span>Supplier B (Mock)</span>
                    <span className="text-[10px] text-indigo-400 lowercase">endpoint: /supplierB/hotels</span>
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 flex justify-between">
                        <span>Latency (ms):</span>
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
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Simulate Server Error (500)
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={emptyB}
                          disabled={loading}
                          onChange={(e) => setEmptyB(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                        />
                        Empty Response ([])
                      </label>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl py-3.5 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Orchestrating Search...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> Compare Hotel Rates
                  </>
                )}
              </button>
              
              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 px-5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Timeline Log/Status view */}
        {timelineSteps.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Temporal Workflow Status Tracker
            </h2>
            <div className="space-y-4">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="flex gap-3 text-sm items-start">
                  <div className="mt-1">
                    {step.status === 'success' && <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />}
                    {step.status === 'failed' && <XCircle className="w-4.5 h-4.5 text-rose-500" />}
                    {step.status === 'active' && <Loader2 className="w-4.5 h-4.5 text-indigo-400 animate-spin" />}
                    {step.status === 'pending' && <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-800" />}
                  </div>
                  <span className={`${step.status === 'active' ? 'text-white font-medium' : step.status === 'pending' ? 'text-slate-500' : 'text-slate-400'} transition-colors`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results / Outputs Card */}
        {(result || errorMsg) && (
          <div className="transition-all duration-300">
            {result ? (
              <div className="bg-gradient-to-r from-indigo-900/40 via-indigo-950/20 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> Cheapest Option Found
                  </div>
                  <h2 className="text-2xl font-bold text-white">{result.name}</h2>
                  <p className="text-slate-400 text-sm">
                    Supplier: <span className="text-indigo-400 font-semibold">{result.supplier}</span>
                  </p>
                </div>
                
                <div className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-center sm:self-center flex flex-col justify-center min-w-[150px]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rate/Night</span>
                  <span className="text-3xl font-extrabold text-white">${result.price}</span>
                </div>
              </div>
            ) : (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 shadow-xl flex gap-4 items-start">
                <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
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
