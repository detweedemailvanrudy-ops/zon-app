// --- CONFIGURATIE ---
const SUN_API_URL = "https://api.sunrise-sunset.org/json";
const GEO_API_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";

let currentLat = null;
let currentLon = null;

// --- BIJ OPSTARTEN: CHECK LOCALE OPSLAG ---
window.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity');
    const savedLat = localStorage.getItem('lastLat');
    const savedLon = localStorage.getItem('lastLon');

    if (savedCity && savedLat && savedLon) {
        currentLat = parseFloat(savedLat);
        currentLon = parseFloat(savedLon);
        document.getElementById('current-location').innerText = `🏙️ ${savedCity} (onthouden)`;
        getSunData(currentLat, currentLon);
    }
});

// --- EVENT LISTENERS ---

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value;
    if (!city) return;

    updateStatus(`Zoeken naar "${city}"...`);
    
    try {
        const response = await fetch(GEO_API_URL + encodeURIComponent(city));
        const data = await response.json();

        if (data && data.length > 0) {
            currentLat = parseFloat(data[0].lat);
            currentLon = parseFloat(data[0].lon);
            const cityName = data[0].display_name.split(',')[0];

            // OPSLAAN IN LOCALSTORAGE
            localStorage.setItem('lastCity', cityName);
            localStorage.setItem('lastLat', currentLat);
            localStorage.setItem('lastLon', currentLon);

            document.getElementById('current-location').innerText = `🏙️ ${cityName}`;
            getSunData(currentLat, currentLon);
            cityInput.blur(); 
        } else {
            updateStatus("Stad niet gevonden.");
        }
    } catch (error) {
        updateStatus("Fout bij zoeken.");
    }
});

document.getElementById('btn-gps').addEventListener('click', () => {
    updateStatus("GPS aanvragen...");
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            
            // We slaan GPS meestal niet op in localStorage omdat je locatie verandert, 
            // maar je zou het kunnen doen als je dat wilt.
            document.getElementById('current-location').innerText = `📍 GPS Locatie`;
            getSunData(currentLat, currentLon);
        },
        () => updateStatus("GPS geweigerd.")
    );
});

// --- CORE FUNCTIES ---

async function getSunData(lat, lon) {
    updateStatus("Tijden ophalen...");
    try {
        const response = await fetch(`${SUN_API_URL}?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        if (data.status === "OK") {
            updateUI(data.results);
            updateStatus("Klaar");
        }
    } catch (error) {
        updateStatus("Fout bij laden.");
    }
}

function updateUI(results) {
    const sunrise = new Date(results.sunrise);
    const sunset = new Date(results.sunset);
    const solarNoon = new Date(results.solar_noon);
    const options = { hour: '2-digit', minute: '2-digit' };
    
    document.getElementById('sunrise-time').innerText = sunrise.toLocaleTimeString('nl-NL', options);
    document.getElementById('sunset-time').innerText = sunset.toLocaleTimeString('nl-NL', options);
    document.getElementById('solar-noon').innerText = solarNoon.toLocaleTimeString('nl-NL', options);

    updateVisuals(sunrise, sunset);
}

function updateVisuals(start, end) {
    const nu = new Date();
    const totaalDaglicht = end - start;
    const verstreken = nu - start;
    let percentage = (verstreken / totaalDaglicht) * 100;

    if (nu < start) percentage = 0;
    if (nu > end) percentage = 100;

    document.getElementById('progress-bar').style.width = percentage + "%";
    document.getElementById('sun-icon').style.left = percentage + "%";

    if (percentage > 0 && percentage < 100) {
        const factor = Math.sin((percentage / 100) * Math.PI); 
        const hue = 30 + (170 * factor);
        const light = 25 + (25 * factor);
        document.body.style.background = `linear-gradient(180deg, hsl(${hue}, 70%, ${light}%) 0%, #0f172a 100%)`;
    } else {
        document.body.style.background = "linear-gradient(180deg, #020617 0%, #0f172a 100%)";
    }
}

function updateStatus(msg) {
    document.getElementById('status-text').innerText = msg;
}

setInterval(() => {
    if (currentLat && currentLon) {
        getSunData(currentLat, currentLon);
    }
}, 60000);