const request = require('request');
const jar = request.jar();

function print_help() {
    console.log('Usage: node fetcher <stock symbol> <start period (unix timestamp)> <end period (unix timestamp)>');
    process.exit(128);
}

// check arguments
if (process.argv.length < 5) {
    print_help();
    return;
}

const symbol = process.argv[2];
const period1 = parseInt(process.argv[3]);
const period2 = parseInt(process.argv[4]);

if (isNaN(period1) || isNaN(period2)) {
    print_help();
    return;
}

request(`https://finance.yahoo.com/quote/${symbol}/history`, { jar }, (error, response, body) => {
    if (error) {
        console.error('Failed to fetch \'crumb\' from Yahoo! server:', error.message);
        process.exit(128);
        return;
    }
    
    // search for crumb.
    // FIXME: regex is seems incorrect
    const match = body.match(/"CrumbStore":{"crumb":"([0-9A-Za-z.-]+)"}/);
    
    if (!match || match.length < 2) {
        console.error('Yahoo! server does not respond with a correct format of HTML.', body);
        process.exit(128);
        return;
    }

    // download the CSV
    request(`https://query1.finance.yahoo.com/v7/finance/download/${symbol}`, {
        qs: {
            period1,
            period2,
            interval: '1d',
            events: 'history',
            crumb: match[1]
        },
        jar
    }, (error, response, body) => {
        if (error) {
            console.error('Failed to fetch CSV from Yahoo! server:', error.message);
            process.exit(128);
            return;
        }
        
        // convert to matlab readable format
        const lines = body.split(/\r?\n/g).splice(1);
        
        for (const line of lines) {
            // Date,	Open,	High,	Low	Close,	Adj Close,	Volume
            const data = line.split(',');
            
            const date = new Date(data[0]);
            
            if (isNaN(date.getTime())) {
                continue;
            }
            
            data[0] = date.getFullYear() + ',' + (date.getMonth() + 1) + ',' + date.getDate();
            
            // use stdout to keep data unformatted
            process.stdout.write(data.join(',') + '\n');
        }
        
        process.exit(0);
    });
});
