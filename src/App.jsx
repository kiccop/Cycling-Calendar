import React, { useState, useMemo, useEffect } from 'react';
import { Bell, BellOff, Settings, Calendar, MapPin, Tv, Clock, LayoutGrid, List, RefreshCw, Coffee, Heart } from 'lucide-react';
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
            {race.startTime && (
                <div className="race-meta">
                    <Clock size={16} />
                    <span>Inizio: {race.startTime}</span>
                </div>
            )}
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
    const [viewMode, setViewMode] = useState('upcoming'); // 'today', 'upcoming', 'calendar', 'prestige'
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Advanced Filters State
    const [showWomen, setShowWomen] = useState(true);
    const [showUnder, setShowUnder] = useState(false);
    const [showMinor, setShowMinor] = useState(false);

    const [races, setRaces] = useState(RACE_DATA.map(r => ({ ...r, source: 'Archivio' })));
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const todayStr = new Date().toISOString().split('T')[0];

    const syncData = async () => {
        setIsSyncing(true);
        try {
            const extRaces = await fetchExternalRaces();
            if (extRaces.length > 0) {
                const combined = [...extRaces];
                RACE_DATA.forEach(local => {
                    const normalizedLocal = local.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const matchingExt = combined.find(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedLocal && r.date === local.date);

                    if (!matchingExt) {
                        combined.push({ ...local, source: 'Archivio' });
                    } else {
                        // Enforce local prestige data on synced races
                        if (!matchingExt.category && local.category) matchingExt.category = local.category;
                        if (!matchingExt.startTime && local.startTime) matchingExt.startTime = local.startTime;
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

        // Apply Advanced Filters
        if (!showWomen) {
            list = list.filter(r => !r.isWomen);
        }
        if (!showUnder) {
            list = list.filter(r => !r.isUnder);
        }
        if (!showMinor) {
            // Hide minor races by default or when toggled off
            list = list.filter(r => !r.isMinor);
        }

        if (viewMode === 'today') {
            return list.filter(r => r.date === todayStr);
        } else if (viewMode === 'upcoming') {
            return list.filter(r => r.date >= todayStr).slice(0, 15);
        } else if (viewMode === 'prestige') {
            return list.filter(r => r.category === 'GT' || r.category === 'Monument');
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
                <button
                    className={`tab-btn ${viewMode === 'prestige' ? 'active' : ''}`}
                    onClick={() => setViewMode('prestige')}
                >
                    <Heart size={18} /> Prestigio
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
                {viewMode === 'prestige' && (
                    <div className="calendar-grid prestige-view">
                        <div className="prestige-section">
                            <h2 className="month-title">Grandi Giri 🏆</h2>
                            <div className="race-list">
                                {processedData.filter(r => r.category === 'GT').map(race => (
                                    <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                                ))}
                            </div>
                        </div>

                        <div className="prestige-section">
                            <h2 className="month-title">Le 5 Classiche Monumento 🏛️</h2>
                            <div className="race-list">
                                {processedData.filter(r => r.category === 'Monument').map(race => (
                                    <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                                ))}
                            </div>
                        </div>
                    </div>
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
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>Filtri Gare</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Mostra Gare Donne</span>
                                            <label className="switch">
                                                <input type="checkbox" checked={showWomen} onChange={(e) => setShowWomen(e.target.checked)} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Mostra Gare Under 23</span>
                                            <label className="switch">
                                                <input type="checkbox" checked={showUnder} onChange={(e) => setShowUnder(e.target.checked)} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>Mostra Gare Minori (1.2/2.2)</span>
                                            <label className="switch">
                                                <input type="checkbox" checked={showMinor} onChange={(e) => setShowMinor(e.target.checked)} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div style={{
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    paddingTop: '1.5rem',
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Offri un caffè allo sviluppatore</span>
                                    <button
                                        className="filter-btn"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(255, 196, 0, 0.1)',
                                            borderColor: 'rgba(255, 196, 0, 0.3)',
                                            color: '#ffc400',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                        onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=JSNCEXQNEEC6G', '_blank')}
                                    >
                                        <Coffee size={18} /> Supporta il progetto
                                    </button>
                                </div>
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
