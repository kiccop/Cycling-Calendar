import ICAL from 'ical.js';

const CALENDARS = [
    {
        name: "UCI World Tour & Pro Road",
        url: "https://calendar.google.com/calendar/ical/5c9dc1a627cf55f1653d17573c2df58075d949559ec87e484b0cf90fa78bbf6d%40group.calendar.google.com/public/basic.ics",
        discipline: "road",
        source: "UCI/WT"
    },
    {
        name: "Pro Road (The Inner Ring)",
        url: "https://inrng.com/calendar/pro.ics",
        discipline: "road",
        source: "InRng"
    },
    {
        name: "MTB World Series",
        url: "https://calendar.google.com/calendar/ical/760824b2679724aab827e65330368949559ec87e484b0cf90fa78bbf6d%40group.calendar.google.com/public/basic.ics",
        discipline: "mtb",
        source: "UCI/MTB"
    },
    {
        name: "CX World Calendar",
        url: "https://calendar.google.com/calendar/ical/860824b2679724aab827e65330368949559ec87e484b0cf90fa78bbf6d%40group.calendar.google.com/public/basic.ics",
        discipline: "cx",
        source: "UCI/CX"
    },
    {
        name: "Gravel World Series",
        url: "https://calendar.google.com/calendar/ical/960824b2679724aab827e65330368949559ec87e484b0cf90fa78bbf6d%40group.calendar.google.com/public/basic.ics",
        discipline: "gravel",
        source: "UCI/Gravel"
    }
];

const PROXY = "https://corsproxy.io/?";

const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export const fetchExternalRaces = async () => {
    const allEvents = [];
    const seen = new Set();

    for (const cal of CALENDARS) {
        try {
            // Use a timeout for each fetch to avoid hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(PROXY + encodeURIComponent(cal.url), { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const icsData = await response.text();
            const jcalData = ICAL.parse(icsData);
            const vcalendar = new ICAL.Component(jcalData);
            const vevents = vcalendar.getAllSubcomponents('vevent');

            vevents.forEach(vevent => {
                const event = new ICAL.Event(vevent);
                const name = event.summary;
                const startDate = event.startDate.toJSDate();
                const date = startDate.toISOString().split('T')[0];

                // Extract time if it's not an all-day event
                let startTime = null;
                if (!event.startDate.isDate) {
                    startTime = startDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
                }

                const key = `${normalize(name)}-${date}`;

                const lowName = name.toLowerCase();

                // Tagging logic
                let category = null;
                let isWomen = lowName.includes("women") || lowName.includes("(we)") || lowName.includes(".wwt") || lowName.includes("donne");
                let isUnder = lowName.includes("under 23") || lowName.includes("(mu)") || lowName.includes("u23") || lowName.includes("youth") || lowName.includes("junior");
                let isMinor = lowName.includes("1.2") || lowName.includes("2.2");
                let isItaly = lowName.includes("italiani") || lowName.includes("italiano") || lowName.includes("ita champ");

                // Men Elite detection
                const isProRank = lowName.includes(".wt") || lowName.includes(".pro") || lowName.includes("1.1") || lowName.includes("2.1");
                let isMenElite = !isWomen && !isUnder && (isProRank || cal.discipline !== "road");

                if (lowName.includes("giro d'italia") || lowName.includes("tour de france") || lowName.includes("vuelta a espana")) {
                    category = "GT";
                } else if (
                    lowName.includes("milano-sanremo") ||
                    lowName.includes("fiandre") ||
                    lowName.includes("roubaix") ||
                    lowName.includes("liegi") ||
                    lowName.includes("lombardia") ||
                    lowName.includes("monumento")
                ) {
                    category = "Monument";
                }

                if (!seen.has(key)) {
                    seen.add(key);
                    allEvents.push({
                        id: `ext-${event.uid || Math.random()}`,
                        name: name,
                        discipline: cal.discipline,
                        date: date,
                        startTime: startTime,
                        category: category,
                        isWomen: isWomen,
                        isUnder: isUnder,
                        isMinor: isMinor,
                        isMenElite: isMenElite,
                        isItaly: isItaly,
                        location: event.location || "TBD",
                        tv: ["Eurosport", "Discovery+", isItaly ? "RAI Sport" : ""].filter(Boolean),
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
