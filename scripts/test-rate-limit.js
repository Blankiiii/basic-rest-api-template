const url = "http://localhost:3000/api/v1/hello";

let count = 0;

const interval = setInterval(async () => {
    count++;
    const currentCount = count;
    
    if (count >= 100) {
        clearInterval(interval);
    }

    try {
        const response = await fetch(url);
        console.log(`Anfrage ${currentCount}/20: Status ${response.status}`);
    } catch (error) {
        console.error(`Anfrage ${currentCount}/20 fehlgeschlagen:`, error.message);
    }
}, 2); // Alle 2 Millisekunden
