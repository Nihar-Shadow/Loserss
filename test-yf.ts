import yahooFinance from 'yahoo-finance2';

yahooFinance.setGlobalConfig({
    fetchOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }
});

async function test() {
    try {
        const historical = await yahooFinance.chart("NMDC.NS", {
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            interval: "1d"
        });
        console.log("Historical success:", historical.quotes.length);
    } catch (err) {
        console.error("Historical error:", err.message);
    }
}
test();
