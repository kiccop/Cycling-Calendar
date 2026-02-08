import React, { useState, useMemo, useEffect } from 'react';
import { Bell, BellOff, Settings, Calendar, MapPin, Tv, Clock, LayoutGrid, List, RefreshCw, Coffee, Heart, X } from 'lucide-react';
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
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <div className={`race-badge ${getBadgeClass(race.discipline)}`}>
                    {race.discipline}
                </div>
                {race.isItaly && (
                    <div className="race-badge" style={{
                        background: 'linear-gradient(90deg, #009246 0%, #009246 33%, #ffffff 33%, #ffffff 66%, #ce2b37 66%, #ce2b37 100%)',
                        color: race.discipline === 'cx' ? '#fff' : '#000',
                        fontWeight: 'bold',
                        border: '1px solid rgba(255,255,255,0.2)',
                        textShadow: '0 0 2px rgba(0,0,0,0.5)'
                    }}>
                        🇮🇹 ITA
                    </div>
                )}
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

    // Advanced Filters State with Persistence
    const [showWomen, setShowWomen] = useState(() => JSON.parse(localStorage.getItem('filter_women') ?? 'true'));
    const [showUnder, setShowUnder] = useState(() => JSON.parse(localStorage.getItem('filter_under') ?? 'false'));
    const [showMenElite, setShowMenElite] = useState(() => JSON.parse(localStorage.getItem('filter_men_elite') ?? 'true'));
    const [showMinor, setShowMinor] = useState(() => JSON.parse(localStorage.getItem('filter_minor') ?? 'false'));
    const [showEurope, setShowEurope] = useState(() => JSON.parse(localStorage.getItem('filter_europe') ?? 'true'));
    const [showAmerica, setShowAmerica] = useState(() => JSON.parse(localStorage.getItem('filter_america') ?? 'true'));
    const [showAfrica, setShowAfrica] = useState(() => JSON.parse(localStorage.getItem('filter_africa') ?? 'true'));
    const [showAsia, setShowAsia] = useState(() => JSON.parse(localStorage.getItem('filter_asia') ?? 'true'));
    const [showOceania, setShowOceania] = useState(() => JSON.parse(localStorage.getItem('filter_oceania') ?? 'true'));

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('filter_women', JSON.stringify(showWomen));
        localStorage.setItem('filter_under', JSON.stringify(showUnder));
        localStorage.setItem('filter_men_elite', JSON.stringify(showMenElite));
        localStorage.setItem('filter_minor', JSON.stringify(showMinor));
        localStorage.setItem('filter_europe', JSON.stringify(showEurope));
        localStorage.setItem('filter_america', JSON.stringify(showAmerica));
        localStorage.setItem('filter_africa', JSON.stringify(showAfrica));
        localStorage.setItem('filter_asia', JSON.stringify(showAsia));
        localStorage.setItem('filter_oceania', JSON.stringify(showOceania));
    }, [showWomen, showUnder, showMenElite, showMinor, showEurope, showAmerica, showAfrica, showAsia, showOceania]);

    const [races, setRaces] = useState(() => RACE_DATA.map(r => ({ ...r, source: 'Archivio' })));
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
        if (!showWomen) list = list.filter(r => !r.isWomen);
        if (!showUnder) list = list.filter(r => !r.isUnder);
        if (!showMenElite) list = list.filter(r => !r.isMenElite);
        if (!showMinor) list = list.filter(r => !r.isMinor);

        // Apply Tour Filters
        list = list.filter(r => {
            if (!r.uciTour) return true;
            if (r.uciTour === 'Europe Tour' && !showEurope) return false;
            if (r.uciTour === 'America Tour' && !showAmerica) return false;
            if (r.uciTour === 'Africa Tour' && !showAfrica) return false;
            if (r.uciTour === 'Asia Tour' && !showAsia) return false;
            if (r.uciTour === 'Oceania Tour' && !showOceania) return false;
            return true;
        });

        if (viewMode === 'today') {
            return list.filter(r => r.date === todayStr);
        } else if (viewMode === 'upcoming') {
            return list.filter(r => r.date >= todayStr).slice(0, 15);
        } else if (viewMode === 'prestige') {
            return list.filter(r => r.category === 'GT' || r.category === 'Monument' || r.category === 'Major');
        }
        return list;
    }, [filter, viewMode, races, todayStr, showWomen, showUnder, showMenElite, showMinor, showEurope, showAmerica, showAfrica, showAsia, showOceania]);

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
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {lastSync && (
                            <div className="sync-status">
                                Sincronizzato: {lastSync.toLocaleTimeString('it-IT')}
                            </div>
                        )}
                        <div className="sync-status" style={{ color: 'var(--accent-primary)' }}>
                            {processedData.length} Gare Visualizzate
                        </div>
                    </div>
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
                    >
                        {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
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
                {[
                    { id: 'today', label: 'Oggi', icon: Clock },
                    { id: 'upcoming', label: 'Prossimi', icon: LayoutGrid },
                    { id: 'calendar', label: 'Calendario', icon: List },
                    { id: 'prestige', label: 'Prestigio', icon: Heart },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${viewMode === tab.id ? 'active' : ''}`}
                        onClick={() => setViewMode(tab.id)}
                    >
                        <tab.icon size={18} /> <span className="hide-mobile">{tab.label}</span>
                    </button>
                ))}
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
                <AnimatePresence mode="popLayout">
                    {viewMode === 'calendar' ? (
                        Object.keys(groupedByMonth || {}).map(month => (
                            <div key={month} className="month-section">
                                <h2 className="month-title">{month}</h2>
                                <div className="race-grid">
                                    {groupedByMonth[month].map(race => (
                                        <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="race-grid">
                            {processedData.map(race => (
                                <RaceCard key={race.id} race={race} isToday={race.date === todayStr} />
                            ))}
                            {processedData.length === 0 && (
                                <div className="empty-state">
                                    <p>Nessuna gara trovata per questi filtri.</p>
                                </div>
                            )}
                        </div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="modal-content glass-panel"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Configurazione</h2>
                                <button className="close-btn" onClick={() => setShowSettings(false)}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <section>
                                        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-road)', marginBottom: '1rem' }}>Preferenze</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>Notifiche push gare live</span>
                                                <label className="switch">
                                                    <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </section>

                                    <section style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-road)', marginBottom: '1rem' }}>Filtri Categoria</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { label: 'Uomini Elite (UCI WT/Pro)', value: showMenElite, setter: setShowMenElite },
                                                { label: 'Gare Donne (WWT/WE)', value: showWomen, setter: setShowWomen },
                                                { label: 'Under 23 / Youth', value: showUnder, setter: setShowUnder },
                                                { label: 'Gare Minori (1.2/2.2)', value: showMinor, setter: setShowMinor },
                                            ].map(f => (
                                                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{f.label}</span>
                                                    <label className="switch">
                                                        <input type="checkbox" checked={f.value} onChange={(e) => f.setter(e.target.checked)} />
                                                        <span className="slider"></span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-road)', marginBottom: '1rem' }}>Circuiti Continentali</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {[
                                                { label: 'Europe Tour', value: showEurope, setter: setShowEurope },
                                                { label: 'America Tour', value: showAmerica, setter: setShowAmerica },
                                                { label: 'Africa Tour', value: showAfrica, setter: setShowAfrica },
                                                { label: 'Asia Tour', value: showAsia, setter: setShowAsia },
                                                { label: 'Oceania Tour', value: showOceania, setter: setShowOceania },
                                            ].map(t => (
                                                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{t.label}</span>
                                                    <label className="switch">
                                                        <input type="checkbox" checked={t.value} onChange={(e) => t.setter(e.target.checked)} />
                                                        <span className="slider"></span>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px' }}>
                                            <div style={{ background: 'rgba(255,196,0,0.1)', padding: '0.75rem', borderRadius: '50%', color: '#ffc400' }}>
                                                <Coffee size={20} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Supporta il progetto</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Offri un caffè allo sviluppatore</div>
                                            </div>
                                            <button
                                                className="filter-btn"
                                                style={{ background: '#ffc400', color: '#000', border: 'none', fontWeight: 800, padding: '0.4rem 0.8rem' }}
                                                onClick={() => window.open('https://www.paypal.com/donate/?hosted_button_id=JSNCEXQNEEC6G', '_blank')}
                                            >
                                                DONA
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="filter-btn active"
                                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', fontWeight: '800' }}
                                    onClick={() => setShowSettings(false)}
                                >
                                    SALVA E CHIUDI
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
