import React, { useState, useMemo, useEffect } from 'react';
import { Bell, BellOff, Settings, Calendar, MapPin, Tv, Clock, LayoutGrid, List, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RACE_DATA, DISCIPLINES } from './data';
import { fetchExternalRaces } from './services/CalendarSyncService';

const RaceCard = ({ race, isToday }) => {
    const getBadgeClass = (discipline) => {
        switch (discipline) {
            case 'road': return 'badge-road';
            case 'mtb': return 'badge-mtb';
            case 'cx': return 'badge-cx';
            case 'gravel': return 'badge-gravel';
            default: return '';
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5 }}
            className={`race-card glass-panel ${isToday ? 'highlight-today' : ''}`}
        >
            {isToday && (
                <div className="live-indicator">
                    <span className="dot"></span> ON AIR / OGGI
                </div>
            )}
            <div className={`race-badge ${getBadgeClass(race.discipline)}`}>
                {race.discipline}
            </div>
            <h3 className="race-title">{race.name}</h3>
            <div className="race-meta">
                <Calendar size={16} />
                <span>{new Date(race.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="race-meta">
                <MapPin size={16} />
                <span>{race.location}</span>
            </div>
            <div className="tv-info">
                <Tv size={18} />
                <span>Su: {race.tv.join(', ')}</span>
            </div>
            {race.source && (
                <div className="source-tag">Fonte: {race.source}</div>
            )}
        </motion.div>
    );
};

export default function App() {
    const [filter, setFilter] = useState('all');
    const [viewMode, setViewMode] = useState('upcoming'); // 'today', 'upcoming', 'calendar'
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [races, setRaces] = useState(RACE_DATA.map(r => ({ ...r, source: 'Archivio' })));
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const syncData = async () => {
        setIsSyncing(true);
        try {
            const extRaces = await fetchExternalRaces();
            if (extRaces.length > 0) {
                // Merge, and prioritize external data for current year
                const combined = [...extRaces];
                RACE_DATA.forEach(local => {
                    // Only keep local if not found in external
                    const normalizedLocal = local.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (!combined.some(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedLocal && r.date === local.date)) {
                        combined.push({ ...local, source: 'Mock' });
                    }
                });
                setRaces(combined);
                setLastSync(new Date());
            }
        } catch (e) {
            console.error("Sync failed", e);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        syncData();
    }, []);

    const processedData = useMemo(() => {
        let list = [...races].sort((a, b) => new Date(a.date) - new Date(b.date));

        if (filter !== 'all') {
            list = list.filter(r => r.discipline === filter);
        }

        if (viewMode === 'today') {
            return list.filter(r => r.date === todayStr);
        } else if (viewMode === 'upcoming') {
            return list.filter(r => r.date >= todayStr);
        }
        return list;
    }, [filter, viewMode, races, todayStr]); // Added races and todayStr to dependencies

    const groupedByMonth = useMemo(() => {
        if (viewMode !== 'calendar') return null;
        const groups = {};
        processedData.forEach(race => {
            const month = new Date(race.date).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
            if (!groups[month]) groups[month] = [];
            groups[month].push(race);
        });
        return groups;
    }, [processedData, viewMode]);

    return (
        <div className="app-container">
            <header>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="logo">Cycling Calendar</div>
                    {lastSync && (
                        <div className="sync-status">
                            Sincronizzato: {lastSync.toLocaleTimeString('it-IT')}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        className={`filter-btn ${isSyncing ? 'syncing-anim' : ''}`}
                        onClick={syncData}
                        title="Sincronizza ora"
                        disabled={isSyncing}
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        className="filter-btn"
                        onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                        <span className="hide-mobile">{notificationsEnabled ? 'Notifiche ON' : 'Notifiche OFF'}</span>
                    </button>
                    <button
                        className="filter-btn"
                        onClick={() => setShowSettings(true)}
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            <div className="view-tabs">
                <button
                    className={`tab-btn ${viewMode === 'today' ? 'active' : ''}`}
                    onClick={() => setViewMode('today')}
                >
                    <Clock size={18} /> Oggi
                </button>
                <button
                    className={`tab-btn ${viewMode === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setViewMode('upcoming')}
                >
                    <LayoutGrid size={18} /> Prossimi
                </button>
                <button
                    className={`tab-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                    onClick={() => setViewMode('calendar')}
                >
                    <List size={18} /> Calendario
                </button>
            </div>

            <div className="filters-bar">
                {DISCIPLINES.map(d => (
                    <button
                        key={d.id}
                        className={`filter-btn ${filter === d.id ? 'active' : ''}`}
                        onClick={() => setFilter(d.id)}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            <main>
                {viewMode === 'today' && processedData.length === 0 && (
                    <div className="empty-state glass-panel">
                        Nessuna gara in programma per oggi.
                    </div>
                )}

                {viewMode === 'calendar' ? (
                    <div className="calendar-view">
                        {Object.entries(groupedByMonth).map(([month, races]) => (
                            <div key={month} className="month-section">
                                <h2 className="month-title">{month}</h2>
                                <div className="race-grid">
                                    {races.map(race => (
                                        <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div layout className="race-grid">
                        <AnimatePresence mode='popLayout'>
                            {processedData.map(race => (
                                <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content glass-panel"
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 style={{ marginBottom: '1.5rem' }}>Configurazione</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Notifiche push gare live</span>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationsEnabled}
                                            onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Avvisi cambi programmazione TV</span>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Seleziona quali specialità desideri ricevere sul tuo dispositivo.
                                </p>
                                <button
                                    className="filter-btn active"
                                    style={{ width: '100%', marginTop: '1rem' }}
                                    onClick={() => setShowSettings(false)}
                                >
                                    Salva Impostazioni
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
