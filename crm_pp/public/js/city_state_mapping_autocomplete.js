/**
 * City-State Smart Autocomplete - Simple and Working Version
 * 
 * Features:
 * - Type freely in city field
 * - Get suggestions based on state
 * - State auto-fills when city entered
 */

// City to State mapping
window.cityStateMap = {
    "Port Blair": "Andaman and Nicobar Islands",
    "Adoni": "Andhra Pradesh",
    "Amalapuram": "Andhra Pradesh",
    "Anakapalle": "Andhra Pradesh",
    "Anantapur": "Andhra Pradesh",
    "Vijayawada": "Andhra Pradesh",
    "Visakhapatnam": "Andhra Pradesh",
    "Tirupati": "Andhra Pradesh",
    "Guntur": "Andhra Pradesh",
    "Nellore": "Andhra Pradesh",
    "Kurnool": "Andhra Pradesh",
    "Rajahmundry": "Andhra Pradesh",
    "Kakinada": "Andhra Pradesh",
    "Naharlagun": "Arunachal Pradesh",
    "Pasighat": "Arunachal Pradesh",
    "Guwahati": "Assam",
    "Silchar": "Assam",
    "Dibrugarh": "Assam",
    "Jorhat": "Assam",
    "Tezpur": "Assam",
    "Patna": "Bihar",
    "Gaya": "Bihar",
    "Bhagalpur": "Bihar",
    "Muzaffarpur": "Bihar",
    "Darbhanga": "Bihar",
    "Purnia": "Bihar",
    "Chandigarh": "Chandigarh",
    "Raipur": "Chhattisgarh",
    "Bhilai Nagar": "Chhattisgarh",
    "Bilaspur": "Chhattisgarh",
    "Korba": "Chhattisgarh",
    "Silvassa": "Dadra and Nagar Haveli",
    "Delhi": "Delhi",
    "New Delhi": "Delhi",
    "Panaji": "Goa",
    "Margao": "Goa",
    "Mapusa": "Goa",
    "Ahmedabad": "Gujarat",
    "Surat": "Gujarat",
    "Vadodara": "Gujarat",
    "Rajkot": "Gujarat",
    "Bhavnagar": "Gujarat",
    "Jamnagar": "Gujarat",
    "Gandhinagar": "Gujarat",
    "Anand": "Gujarat",
    "Faridabad": "Haryana",
    "Gurgaon": "Haryana",
    "Rohtak": "Haryana",
    "Panipat": "Haryana",
    "Karnal": "Haryana",
    "Sonipat": "Haryana",
    "Hisar": "Haryana",
    "Shimla": "Himachal Pradesh",
    "Dharamshala": "Himachal Pradesh",
    "Srinagar": "Jammu and Kashmir",
    "Jammu": "Jammu and Kashmir",
    "Ranchi": "Jharkhand",
    "Jamshedpur": "Jharkhand",
    "Dhanbad": "Jharkhand",
    "Bengaluru": "Karnataka",
    "Bangalore": "Karnataka",
    "Mysore": "Karnataka",
    "Mysuru": "Karnataka",
    "Hubli": "Karnataka",
    "Mangalore": "Karnataka",
    "Mangaluru": "Karnataka",
    "Belgaum": "Karnataka",
    "Thiruvananthapuram": "Kerala",
    "Kochi": "Kerala",
    "Kozhikode": "Kerala",
    "Thrissur": "Kerala",
    "Kollam": "Kerala",
    "Kannur": "Kerala",
    "Bhopal": "Madhya Pradesh",
    "Indore": "Madhya Pradesh",
    "Jabalpur": "Madhya Pradesh",
    "Gwalior": "Madhya Pradesh",
    "Ujjain": "Madhya Pradesh",
    "Mumbai": "Maharashtra",
    "Pune": "Maharashtra",
    "Nagpur": "Maharashtra",
    "Thane": "Maharashtra",
    "Nashik": "Maharashtra",
    "Aurangabad": "Maharashtra",
    "Solapur": "Maharashtra",
    "Imphal": "Manipur",
    "Shillong": "Meghalaya",
    "Aizawl": "Mizoram",
    "Kohima": "Nagaland",
    "Bhubaneswar": "Odisha",
    "Cuttack": "Odisha",
    "Rourkela": "Odisha",
    "Pondicherry": "Puducherry",
    "Puducherry": "Puducherry",
    "Ludhiana": "Punjab",
    "Amritsar": "Punjab",
    "Jalandhar": "Punjab",
    "Patiala": "Punjab",
    "Bathinda": "Punjab",
    "Jaipur": "Rajasthan",
    "Jodhpur": "Rajasthan",
    "Kota": "Rajasthan",
    "Bikaner": "Rajasthan",
    "Ajmer": "Rajasthan",
    "Udaipur": "Rajasthan",
    "Chennai": "Tamil Nadu",
    "Coimbatore": "Tamil Nadu",
    "Madurai": "Tamil Nadu",
    "Tiruchirappalli": "Tamil Nadu",
    "Trichy": "Tamil Nadu",
    "Salem": "Tamil Nadu",
    "Tiruppur": "Tamil Nadu",
    "Hyderabad": "Telangana",
    "Warangal": "Telangana",
    "Nizamabad": "Telangana",
    "Agartala": "Tripura",
    "Lucknow": "Uttar Pradesh",
    "Kanpur": "Uttar Pradesh",
    "Ghaziabad": "Uttar Pradesh",
    "Agra": "Uttar Pradesh",
    "Meerut": "Uttar Pradesh",
    "Varanasi": "Uttar Pradesh",
    "Allahabad": "Uttar Pradesh",
    "Prayagraj": "Uttar Pradesh",
    "Noida": "Uttar Pradesh",
    "Greater Noida": "Uttar Pradesh",
    "Dehradun": "Uttarakhand",
    "Haridwar": "Uttarakhand",
    "Roorkee": "Uttarakhand",
    "Kolkata": "West Bengal",
    "Howrah": "West Bengal",
    "Durgapur": "West Bengal",
    "Asansol": "West Bengal",
    "Siliguri": "West Bengal"
};

// Build reverse mapping: State -> [Cities]
window.stateCitiesMap = {};
Object.keys(window.cityStateMap).forEach(city => {
    const state = window.cityStateMap[city];
    if (!window.stateCitiesMap[state]) {
        window.stateCitiesMap[state] = [];
    }
    window.stateCitiesMap[state].push(city);
});

// Sort cities within each state
Object.keys(window.stateCitiesMap).forEach(state => {
    window.stateCitiesMap[state].sort();
});

// Function to map city to state (with case-insensitive matching)
function mapCityToState(city) {
    if (!city) return '';
    
    // Try exact match first
    if (window.cityStateMap[city]) {
        return window.cityStateMap[city];
    }
    
    // Try case-insensitive match
    const cityLower = city.toLowerCase().trim();
    for (const [key, value] of Object.entries(window.cityStateMap)) {
        if (key.toLowerCase() === cityLower) {
            return value;
        }
    }
    
    return '';
}

// Setup autocomplete using datalist (native HTML5 autocomplete)
function setupCityAutocomplete(frm) {
    const cityField = frm.fields_dict.city;
    if (!cityField || !cityField.$input) return;
    
    // Create datalist element
    const datalistId = `city-datalist-${frm.doctype}`;
    let datalist = document.getElementById(datalistId);
    
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = datalistId;
        document.body.appendChild(datalist);
    }
    
    // Set the datalist to the input
    cityField.$input.attr('list', datalistId);
    
    // Update datalist options based on state
    function updateDatalist() {
        datalist.innerHTML = '';
        let cities = Object.keys(window.cityStateMap).sort();
        
        // Filter by state if selected
        if (frm.doc.state && window.stateCitiesMap[frm.doc.state]) {
            cities = window.stateCitiesMap[frm.doc.state];
            console.log(`Filtered to ${cities.length} cities for ${frm.doc.state}`);
        }
        
        // Add options to datalist
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            datalist.appendChild(option);
        });
        
        console.log(`Updated datalist with ${cities.length} cities`);
    }
    
    // Initial update
    updateDatalist();
    
    // Update when state changes
    frm.fields_dict.state.$input.on('change', function() {
        updateDatalist();
    });
    
    console.log('✓ City autocomplete setup complete');
}

// Client Script for Lead
frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        setupCityAutocomplete(frm);
    },
    
    state: function(frm) {
        // Clear city if it doesn't belong to new state
        if (frm.doc.city && frm.doc.state) {
            const cityState = mapCityToState(frm.doc.city);
            if (cityState && cityState !== frm.doc.state) {
                frm.set_value('city', '');
            }
        }
    },
    
    city: function(frm) {
        // Auto-fill/update state when city is entered or changed
        if (frm.doc.city) {
            const state = mapCityToState(frm.doc.city);
            if (state) {
                // Only update if the state is different (to avoid infinite loops)
                if (frm.doc.state !== state) {
                    console.log(`Auto-updating state: ${state} for city: ${frm.doc.city}`);
                    frm.set_value('state', state);
                }
            }
        }
    }
});

// Client Script for Opportunity
frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {
        setupCityAutocomplete(frm);
    },
    
    state: function(frm) {
        // Clear city if it doesn't belong to new state
        if (frm.doc.city && frm.doc.state) {
            const cityState = mapCityToState(frm.doc.city);
            if (cityState && cityState !== frm.doc.state) {
                frm.set_value('city', '');
            }
        }
    },
    
    city: function(frm) {
        // Auto-fill/update state when city is entered or changed
        if (frm.doc.city) {
            const state = mapCityToState(frm.doc.city);
            if (state) {
                // Only update if the state is different (to avoid infinite loops)
                if (frm.doc.state !== state) {
                    console.log(`Auto-updating state: ${state} for city: ${frm.doc.city}`);
                    frm.set_value('state', state);
                }
            }
        }
    }
});

console.log('✓ City-State autocomplete loaded successfully');
console.log(`✓ ${Object.keys(window.cityStateMap).length} cities loaded`);
console.log(`✓ ${Object.keys(window.stateCitiesMap).length} states loaded`);
