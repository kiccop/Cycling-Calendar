import ICAL from 'ical.js';

const CALENDARS = [
    {
        name: "UCI World Tour (InRng)",
        url: "https://calendar.google.com/calendar/ical/5c9dc1a627cf55f1653d17573c2df58075d949559ec87e484b0cf90fa78bbf6d%40group.calendar.google.com/public/basic.ics",
        discipline: "road",
        source: "UCI/InRng"
    },
    {
        name: "Pro Road (Secondary)",
        url: "https://inrng.com/calendar/pro.ics",
        discipline: "road",
        source: "InRng"
    }
];

const PROXY = "https://corsproxy.io/?";

// Simple normalization for deduplication
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export const fetchExternalRaces = async () => {
    const allEvents = [];
    const seen = new Set();

    for (const cal of CALENDARS) {
        try {
            const response = await fetch(PROXY + encodeURIComponent(cal.url));
            if (!response.ok) continue;

            const icsData = await response.text();
            const jcalData = ICAL.parse(icsData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevents = vcalendar.getAllSubcomponents('vevent');

            vevents.forEach(vevent => {
                const event = new ICAL.Event(vevent);
                const name = event.summary;
                const date = event.startDate.toJSDate().toISOString().split('T')[0];
                const key = `${normalize(name)}-${date}`;

                if (!seen.has(key)) {
                    seen.add(key);
                    allEvents.push({
                        id: `ext-${event.uid || Math.random()}`,
                        name: name,
                        discipline: cal.discipline,
                        date: date,
                        location: event.location || "TBD",
                        tv: ["Eurosport", "Discovery+"],
                        status: "Upcoming",
                        source: cal.source,
                        description: event.description || ""
                    });
                }
            });
        } catch (error) {
            console.error(`Error syncing ${cal.name}:`, error);
        }
    }

    return allEvents;
};
