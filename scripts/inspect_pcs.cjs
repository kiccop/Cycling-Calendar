const https = require('https');
const url = 'https://www.procyclingstats.com/calendar/uci/year-calendar';
https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { if (data.length < 50000) data += chunk; });
    res.on('end', () => {
        console.log(data.substring(data.indexOf('<table'), data.indexOf('</table>') + 8));
    });
});
