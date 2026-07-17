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
        console.log(`request ${currentCount}/100: Status ${response.status}`);
    } catch (error) {
        console.error(`request ${currentCount}/100 failed:`, error.message);
    }
}, 2);
