
async function checkNgrok() {
    console.log('Fetching data...');
    try {
        const response = await fetch('http://172.16.45.33:3000/data/');
        console.log('Response Status:', response.status);

        if (!response.ok) {
            console.error('Request failed with status:', response.status);
            const text = await response.text();
            console.error('Response text:', text);
            return;
        }

        const data = await response.json();
        console.log('Data received:');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

checkNgrok();
