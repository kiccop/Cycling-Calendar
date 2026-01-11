import ICAL from 'ical.js';

const CALENDARS = [
    {
        name: "Road (Inner Ring)",
        url: "https://inrng.com/calendar/pro.ics",
        discipline: "road"
    },
    // Note: Finding direct public ICS for other disciplines can be harder, 
    // but many sites like UCI or CalendarLabs provide them.
    // For demonstration, we'll use these as examples.
];

const PROXY = "https://corsproxy.io/?";

export const fetchExternalRaces = async () => {
    const allEvents = [];

    for (const cal of CALENDARS) {
        try {
            const response = await fetch(PROXY + encodeURIComponent(cal.url));
            if (!response.ok) throw new Error(`Fetch failed for ${cal.name}`);

            const icsData = await response.text();
            const jcalData = ICAL.parse(icsData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevents = vcalendar.getAllSubcomponents('vevent');

            const events = vevents.map(vevent => {
                const event = new ICAL.Event(vevent);
                return {
                    id: `ext-${event.uid || Math.random()}`,
                    name: event.summary,
                    discipline: cal.discipline,
                    date: event.startDate.toJSDate().toISOString().split('T')[0],
                    location: event.location || "TBD",
                    tv: ["Eurosport", "Discovery+"], // Generic fallback as ICS rarely includes TV info
                    status: "Upcoming",
                    description: event.description || ""
                };
            });

            allEvents.push(...events);
        } catch (error) {
            console.error(`Error syncing ${cal.name}:`, error);
        }
    }

    return allEvents;
};
