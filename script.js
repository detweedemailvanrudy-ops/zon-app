// --- CONFIGURATIE ---
const SUN_API_URL = "https://api.sunrise-sunset.org/json";
const GEO_API_URL = "https://nominatim.openstreetmap.org/search?format=json&q=";
const REVERSE_GEO_API_URL = "https://nominatim.openstreetmap.org/reverse?format=json";

let currentLat = null;
let currentLon = null;
let sunTimes = { sunrise: null, sunset: null };

// --- 1. BIJ OPSTARTEN ---
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
    updateClock();
});

// --- 2. DE KLOK & COUNTDOWN ---
function updateClock() {
    const nu = new Date();
    
    // Datum en Tijd bovenin
    const dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    document.getElementById('display-date').innerText = nu.toLocaleDateString('nl-NL', dateOptions);
    document.getElementById('current-time-display').innerText = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (sunTimes.sunrise && sunTimes.sunset) {
        let target, label;
        
        if (nu < sunTimes.sunrise) {
            target = sunTimes.sunrise;
            label = "Tot zonsopkomst";
        } else if (nu < sunTimes.sunset) {
            target = sunTimes.sunset;
            label = "Tot zonsondergang";
        } else {
            // Morgenochtend berekenen
            target = new Date(sunTimes.sunrise.getTime() + 24 * 60 * 60 * 1000);
            label = "Tot volgende opkomst";
        }

        const diff = target - nu;
        const uren = Math.floor(diff / (1000 * 60 * 60));
        const minuten = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        document.getElementById('countdown-label').innerText = label;
        document.getElementById('countdown-timer').innerText = `${uren}u ${minuten}m`;
        
        // Update de zon/maan positie en achtergrond
        updateVisuals(sunTimes.sunrise, sunTimes.sunset);
    }
    requestAnimationFrame(updateClock);
}

// --- 3. EVENT LISTENERS ---
document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cityInput = document.getElementById('city-input');
    const city = cityInput.value;
    if (!city) return;

    updateStatus("Zoeken...");
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
            
            // RESET INPUTVELD
            cityInput.value = "";
            cityInput.blur(); 
        } else {
            updateStatus("Niet gevonden");
        }
    } catch (error) { 
        updateStatus("Fout bij zoeken"); 
    }
});

document.getElementById('btn-gps').addEventListener('click', () => {
    updateStatus("GPS aanvragen...");
    navigator.geolocation.getCurrentPosition(async (position) => {
        currentLat = position.coords.latitude;
        currentLon = position.coords.longitude;
        try {
            const response = await fetch(`${REVERSE_GEO_API_URL}&lat=${currentLat}&lon=${currentLon}`);
            const data = await response.json();
            const addr = data.address;
            const cityName = addr.city || addr.town || addr.village || "Huidige locatie";
            saveLocation(cityName, currentLat, currentLon);
            updateLocationDisplay(`📍 ${cityName}`);
        } catch (error) { 
            updateLocationDisplay(`📍 GPS Locatie`); 
        }
        getSunData(currentLat, currentLon);
    });
});

// --- 4. DATA OPHALEN ---
async function getSunData(lat, lon) {
    try {
        const response = await fetch(`${SUN_API_URL}?lat=${lat}&lng=${lon}&formatted=0`);
        const data = await response.json();
        if (data.status === "OK") {
            const res = data.results;
            sunTimes.sunrise = new Date(res.sunrise);
            sunTimes.sunset = new Date(res.sunset);
            const solarNoon = new Date(res.solar_noon);
            
            const opt = { hour: '2-digit', minute: '2-digit' };
            document.getElementById('sunrise-time').innerText = sunTimes.sunrise.toLocaleTimeString('nl-NL', opt);
            document.getElementById('sunset-time').innerText = sunTimes.sunset.toLocaleTimeString('nl-NL', opt);
            document.getElementById('solar-noon').innerText = solarNoon.toLocaleTimeString('nl-NL', opt);
            
            const hours = Math.floor(res.day_length / 3600);
            const minutes = Math.floor((res.day_length % 3600) / 60);
            document.getElementById('daylight-duration').innerText = `${hours}u ${minutes}m`;
            
            // LAATSTE UPDATE TIJDSTAMP
            const nu = new Date();
            const tijdstip = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            updateStatus(`Laatste update: ${tijdstip}`);
        }
    } catch (error) { 
        updateStatus("Update mislukt"); 
    }
}

// --- 5. VISUALS & NACHT LOGICA ---
function updateVisuals(start, end) {
    const nu = new Date();
    const sunIcon = document.getElementById('sun-icon');
    const progressBar = document.getElementById('progress-bar');
    
    let percentage;
    let isNight = false;

    if (nu < start) {
        // Nacht: voor zonsopkomst
        isNight = true;
        const gisteren = new Date(start.getTime() - 24 * 60 * 60 * 1000); 
        // We schatten de nachtduur even simpel voor de balk-progressie
        const nachtDuur = start - (start.getTime() - (8 * 60 * 60 * 1000));
        percentage = 50; // In de vroege ochtend zetten we hem halverwege of berekenen we verder
    } else if (nu > end) {
        // Nacht: na zonsondergang
        isNight = true;
        const morgenOpkomst = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const nachtTotaal = morgenOpkomst - end;
        const nachtVerstreken = nu - end;
        percentage = (nachtVerstreken / nachtTotaal) * 100;
    } else {
        // Dag
        isNight = false;
        const dagTotaal = end - start;
        const dagVerstreken = nu - start;
        percentage = (dagVerstreken / dagTotaal) * 100;
    }

    percentage = Math.max(0, Math.min(100, percentage));
    progressBar.style.width = percentage + "%";
    sunIcon.style.left = percentage + "%";

    if (isNight) {
        sunIcon.innerText = "🌙";
        progressBar.style.background = "linear-gradient(90deg, #1e293b, #64748b)";
        document.body.style.background = "linear-gradient(180deg, #020617 0%, #1E1B4B 100%)";
    } else {
        sunIcon.innerText = "☀️";
        progressBar.style.background = "linear-gradient(90deg, #FF00FF, #fbbf24)";
        document.body.style.background = getViceColors(percentage);
    }
}

function getViceColors(p) {
    if (p < 20) return "linear-gradient(180deg, #FF8C00 0%, #FDE047 100%)"; // Ochtend
    if (p < 70) return "linear-gradient(180deg, #00D4FF 0%, #1e293b 100%)"; // Middag
    return "linear-gradient(180deg, #FF00FF 0%, #4C1D95 100%)"; // GTA 6 Sunset
}

// HELPERS
function saveLocation(n, lt, ln) { 
    localStorage.setItem('lastCity', n); 
    localStorage.setItem('lastLat', lt); 
    localStorage.setItem('lastLon', ln); 
}
function updateStatus(m) { document.getElementById('status-text').innerText = m; }
function updateLocationDisplay(t) { document.getElementById('current-location').innerText = t; }

setInterval(() => { if (currentLat && currentLon) getSunData(currentLat, currentLon); }, 1800000);