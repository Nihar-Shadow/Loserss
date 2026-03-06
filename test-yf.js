import yahooFinance from 'yahoo-finance2';

async function test() {
    const query = "COALINDIA";
    const searchRes = await yahooFinance.search(query);
    const resolvedSym = searchRes.quotes[0].symbol;
    console.log("Resolved:", resolvedSym);

    try {
        const historical = await yahooFinance.historical(resolvedSym, {
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
        console.log("Historical length:", historical.length);
    } catch (err) {
        console.error("Historical error:", err.message);
    }

    try {
        const chart = await yahooFinance.chart(resolvedSym, {
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            interval: "1d"
        });
        console.log("Chart length:", chart.quotes.length);
    } catch (err) {
        console.error("Chart error:", err.message);
    }
}
test();
