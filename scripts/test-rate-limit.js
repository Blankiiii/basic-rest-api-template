const url = "http://localhost:3000/api/v1/hello";

let count = 0;

const interval = setInterval(async () => {
    count++;
    const currentCount = count;
    
    if (count > 21) {
        clearInterval(interval);
        return;
    }

    try {
        const response = await fetch(url);

        const data = await response.json();
        
        console.log(`request ${currentCount}/21: Status ${response.status} | Data:`, data);
    } catch (error) {
        console.error(`request ${currentCount}/21 failed:`, error.message);
    }
}, 2);
