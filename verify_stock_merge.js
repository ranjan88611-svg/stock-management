const db = require('./database');

async function runVerification() {
    try {
        console.log('--- Starting Verification ---');

        // Ensure DB is initialized
        await db.initDatabase();

        const testCompany = 'TEST_COMPANY';
        const testTile = 'TEST_TILE';
        const testSize = '10x10';

        // 1. Clean up any previous test data
        console.log('Cleaning up old test data...');
        const stocks = await db.getAllStocks(testCompany);
        for (const stock of stocks) {
            if (stock.tileName === testTile && stock.tileSize === testSize) {
                await db.deleteStock(stock.id);
            }
        }

        // 2. Add initial stock
        console.log('Adding initial stock (10 boxes)...');
        const initialStock = await db.addOrUpdateStock({
            company: testCompany,
            tileName: testTile,
            tileSize: testSize,
            boxCount: 10,
            piecesPerBox: 5,
            location: 'A1',
            pricePerBox: 100,
            pricePerSqft: 10,
            sqftPerBox: 10
        });
        console.log('Initial Stock ID:', initialStock.id);
        console.log('Initial Box Count:', initialStock.boxCount);

        if (initialStock.boxCount !== 10) {
            throw new Error('Initial stock creation failed');
        }

        // 3. Add same stock again (Merge)
        console.log('Adding same stock again (5 boxes)...');
        const updatedStock = await db.addOrUpdateStock({
            company: testCompany,
            tileName: testTile,
            tileSize: testSize,
            boxCount: 5,
            piecesPerBox: 5, // These shouldn't change the existing record's other fields in this simple merge logic
            location: 'A1',
            pricePerBox: 100,
            pricePerSqft: 10,
            sqftPerBox: 10
        });
        console.log('Updated Stock ID:', updatedStock.id);
        console.log('Updated Box Count:', updatedStock.boxCount);

        // 4. Verify
        if (updatedStock.id !== initialStock.id) {
            throw new Error('FAILED: Created a new row instead of merging!');
        }
        if (updatedStock.boxCount !== 15) {
            throw new Error(`FAILED: Box count is ${updatedStock.boxCount}, expected 15`);
        }

        console.log('SUCCESS: Stock merged correctly!');

        // 5. Cleanup
        console.log('Cleaning up...');
        await db.deleteStock(updatedStock.id);
        console.log('Verification complete.');
        process.exit(0);

    } catch (error) {
        console.error('VERIFICATION FAILED:', error);
        process.exit(1);
    }
}

runVerification();
