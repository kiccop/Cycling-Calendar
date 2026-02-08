const https = require('https');

const url = 'https://www.procyclingstats.com/calendar/uci/year-calendar';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        // Very basic regex-based parser for PCS calendar
        // This is fragile but might work for a quick data dump
        const races = [];
        const raceRegex = /<tr[^>]*>.*?<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>.*?<a href="race\/([^"]+)"[^>]*>([^<]+)<\/a>.*?<td[^>]*><span class="icon\s+flag\s+([^"]+)"><\/span><\/td>.*?<td[^>]*>([^<]+)<\/td>/gs;

        let match;
        while ((match = raceRegex.exec(data)) !== null) {
            races.push({
                date: match[1],
                slug: match[2],
                name: match[3],
                country: match[4],
                category: match[5].trim()
            });
        }
        console.log(JSON.stringify(races, null, 2));
    });
}).on('error', (err) => {
    console.error('Error: ' + err.message);
});
