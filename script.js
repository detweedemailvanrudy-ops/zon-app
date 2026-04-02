// --- CONFIGURATIE ---
const SUN_API_URL = "https://api.sunrise-sunset.org/json";
const GEO_API_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";
const REVERSE_GEO_API_URL = "https://nominatim.openstreetmap.org/reverse?format=json";

let currentLat = null;
let currentLon = null;

// --- 1. BIJ OPSTARTEN: CHECK GEHEUGEN ---
window.addEventListener('DOMContentLoaded', () => {
    const savedCity = localStorage.getItem('lastCity');
    const savedLat = localStorage.getItem('lastLat');
    const savedLon = localStorage.getItem('lastLon');

    if (savedCity && savedLat && savedLon) {
        currentLat = parseFloat(savedLat);
        currentLon = parseFloat(savedLon);
        updateLocationDisplay(`🏙️ ${savedCity}`);
        getSunData(currentLat, currentLon);
    }
});

// --- 2. EVENT LISTENERS ---

// Zoeken via formulier (Enter of knop)
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

            saveLocation(cityName, currentLat, currentLon);
            updateLocationDisplay(`🏙️ ${cityName}`);
            getSunData(currentLat, currentLon);
            cityInput.blur(); 
        } else {
            updateStatus("Stad niet gevonden.");
        }
    } catch (error) {
        updateStatus("Fout bij zoeken.");
    }
});

// GPS Knop met Plaatsnaam-herkenning
document.getElementById('btn-gps').addEventListener('click', () => {
    updateStatus("GPS aanvragen...");
    updateLocationDisplay("Locatie zoeken...");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            
            try {
                // Vraag de naam van de plek op bij OpenStreetMap
                const response = await fetch(`${REVERSE_GEO_API_URL}&lat=${currentLat}&lon=${currentLon}`);
                const data = await response.json();
                
                // Zoek naar de meest logische naam in het adres-object
                const addr = data.address;
                const cityName = addr.city || addr.town || addr.village || addr.municipality || "Huidige locatie";

                saveLocation(cityName, currentLat, currentLon);
                updateLocationDisplay(`📍 ${cityName}`);
            } catch (error) {
                updateLocationDisplay(`📍 GPS Coördinaten`);
            }

            getSunData(currentLat, currentLon);
        },
        () => {
            updateStatus("GPS geweigerd.");
            updateLocationDisplay("Geen");
        }
    );
});

// --- 3. KERN LOGICA ---

async function getSunData(lat, lon) {
    updateStatus("Tijden ophalen...");
    try {
        const response = await fetch(`${SUN_API_URL}?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        if (data.status === "OK") {
            updateUI(data.results);
            updateStatus("Gegevens bijgewerkt");
        }
    } catch (error) {
        updateStatus("Fout bij laden zontijden.");
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

    // Begrenzen
    if (nu < start) percentage = 0;
    if (nu > end) percentage = 100;

    // Update balk en zon-icoon
    document.getElementById('progress-bar').style.width = percentage + "%";
    document.getElementById('sun-icon').style.left = percentage + "%";

    // Kleur berekening
    if (percentage > 0 && percentage < 100) {
        const factor = Math.sin((percentage / 100) * Math.PI); 
        const hue = 30 + (170 * factor);
        const light = 25 + (25 * factor);
        document.body.style.background = `linear-gradient(180deg, hsl(${hue}, 70%, ${light}%) 0%, #0f172a 100%)`;
    } else {
        document.body.style.background = "linear-gradient(180deg, #020617 0%, #0f172a 100%)";
    }
}

// --- 4. HELPERS ---

function saveLocation(name, lat, lon) {
    localStorage.setItem('lastCity', name);
    localStorage.setItem('lastLat', lat);
    localStorage.setItem('lastLon', lon);
}

function updateStatus(msg) {
    document.getElementById('status-text').innerText = msg;
}

function updateLocationDisplay(text) {
    document.getElementById('current-location').innerText = text;
}

// Automatische update elke minuut
setInterval(() => {
    if (currentLat && currentLon) {
        getSunData(currentLat, currentLon);
    }
}, 60000);
