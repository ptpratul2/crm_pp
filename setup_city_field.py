#!/usr/bin/env python3
"""
Run this script to setup city field as Select field for Lead and Opportunity

Usage:
    bench --site [site-name] console < setup_city_field.py

Or from bench console:
    exec(open('apps/crm_pp/setup_city_field.py').read())
"""

import frappe
from frappe.custom.doctype.property_setter.property_setter import make_property_setter

# All cities from the CSV
CITIES = [
    "Port Blair", "Adoni", "Amalapuram", "Anakapalle", "Anantapur", "Bapatla", 
    "Bheemunipatnam", "Bhimavaram", "Bobbili", "Chilakaluripet", "Chirala", 
    "Chittoor", "Dharmavaram", "Eluru", "Gooty", "Gudivada", "Gudur", "Guntakal", 
    "Guntur", "Hindupur", "Jaggaiahpet", "Jammalamadugu", "Kadapa", "Kadiri", 
    "Kakinada", "Kandukur", "Kavali", "Kovvur", "Kurnool", "Macherla", 
    "Machilipatnam", "Madanapalle", "Mandapeta", "Markapur", "Nagari", "Naidupet", 
    "Nandyal", "Narasapuram", "Narasaraopet", "Narsipatnam", "Nellore", "Nidadavole", 
    "Nuzvid", "Ongole", "Palacole", "Palasa Kasibugga", "Parvathipuram", "Pedana", 
    "Peddapuram", "Pithapuram", "Ponnur", "Proddatur", "Punganur", "Puttur", 
    "Rajahmundry", "Rajam", "Rajampet", "Ramachandrapuram", "Rayachoti", "Rayadurg", 
    "Renigunta", "Repalle", "Salur", "Samalkot", "Sattenapalle", "Srikakulam", 
    "Srikalahasti", "Srisailam Project (Right Flank Colony) Township", "Sullurpeta", 
    "Tadepalligudem", "Tadpatri", "Tanuku", "Tenali", "Tirupati", "Tiruvuru", 
    "Tuni", "Uravakonda", "Venkatagiri", "Vijayawada", "Vinukonda", "Visakhapatnam", 
    "Vizianagaram", "Yemmiganur", "Yerraguntla", "Naharlagun", "Pasighat", 
    "Barpeta", "Bongaigaon City", "Dhubri", "Dibrugarh", "Diphu", "Goalpara", 
    "Guwahati", "Jorhat", "Karimganj", "Lanka", "Lumding", "Mangaldoi", "Mankachar", 
    "Margherita", "Mariani", "Marigaon", "Nagaon", "Nalbari", "North Lakhimpur", 
    "Rangia", "Sibsagar", "Silapathar", "Silchar", "Tezpur", "Tinsukia", "Araria", 
    "Arrah", "Arwal", "Asarganj", "Aurangabad", "Bagaha", "Barh", "Begusarai", 
    "Bettiah", "Bhabua", "Bhagalpur", "Buxar", "Darbhanga", "Dehri-on-Sone", 
    "Dumraon", "Forbesganj", "Gaya", "Gopalganj", "Hajipur", "Jamalpur", "Jamui", 
    "Jehanabad", "Katihar", "Kishanganj", "Lakhisarai", "Lalganj", "Madhepura", 
    "Madhubani", "Maharajganj", "Mahnar Bazar", "Makhdumpur", "Maner", "Manihari", 
    "Marhaura", "Masaurhi", "Mirganj", "Mokameh", "Motihari", "Motipur", "Munger", 
    "Murliganj", "Muzaffarpur", "Narkatiaganj", "Naugachhia", "Nawada", "Nokha", 
    "Patna", "Piro", "Purnia", "Rafiganj", "Rajgir", "Ramnagar", "Raxaul Bazar", 
    "Revelganj", "Rosera", "Saharsa", "Samastipur", "Sasaram", "Sheikhpura", 
    "Sheohar", "Sherghati", "Silao", "Sitamarhi", "Siwan", "Sonepur", "Sugauli", 
    "Sultanganj", "Supaul", "Warisaliganj", "Chandigarh", "Ambikapur", "Bhatapara", 
    "Bhilai Nagar", "Bilaspur", "Chirmiri", "Dalli-Rajhara", "Dhamtari", "Durg", 
    "Jagdalpur", "Korba", "Mahasamund", "Manendragarh", "Mungeli", "Naila Janjgir", 
    "Raigarh", "Raipur", "Rajnandgaon", "Sakti", "Tilda Newra", "Silvassa", "Delhi", 
    "New Delhi", "Mapusa", "Margao", "Marmagao", "Panaji", "Adalaj", "Ahmedabad", 
    "Amreli", "Anand", "Anjar", "Ankleshwar", "Bharuch", "Bhavnagar", "Bhuj", 
    "Chhapra", "Deesa", "Dhoraji", "Godhra", "Jamnagar", "Kadi", "Kapadvanj", 
    "Keshod", "Khambhat", "Lathi", "Limbdi", "Lunawada", "Mahesana", "Mahuva", 
    "Manavadar", "Mandvi", "Mangrol", "Mansa", "Mahemdabad", "Modasa", "Morvi", 
    "Nadiad", "Navsari", "Padra", "Palanpur", "Palitana", "Pardi", "Patan", 
    "Petlad", "Porbandar", "Radhanpur", "Rajkot", "Rajpipla", "Rajula", "Ranavav", 
    "Rapar", "Salaya", "Sanand", "Savarkundla", "Sidhpur", "Sihor", "Songadh", 
    "Surat", "Talaja", "Thangadh", "Tharad", "Umbergaon", "Umreth", "Una", "Unjha", 
    "Upleta", "Vadnagar", "Vadodara", "Valsad", "Vapi", "Veraval", "Vijapur", 
    "Viramgam", "Visnagar", "Vyara", "Wadhwan", "Wankaner", "Bahadurgarh", "Bhiwani", 
    "Charkhi Dadri", "Faridabad", "Fatehabad", "Gohana", "Gurgaon", "Hansi", "Hisar", 
    "Jind", "Kaithal", "Karnal", "Ladwa", "Mahendragarh", "Mandi Dabwali", "Narnaul", 
    "Narwana", "Palwal", "Panchkula", "Panipat", "Pehowa", "Pinjore", "Rania", 
    "Ratia", "Rewari", "Rohtak", "Safidon", "Samalkha", "Sarsod", "Shahbad", "Sirsa", 
    "Sohna", "Sonipat", "Taraori", "Thanesar", "Tohana", "Yamunanagar", "Mandi", 
    "Nahan", "Shimla", "Solan", "Sundarnagar", "Anantnag", "Baramula", "Jammu", 
    "Kathua", "Punch", "Rajauri", "Sopore", "Srinagar", "Udhampur", "Adityapur", 
    "Bokaro Steel City", "Chaibasa", "Chatra", "Chirkunda", "Medininagar (Daltonganj)", 
    "Deoghar", "Dhanbad", "Dumka", "Giridih", "Gumia", "Hazaribag", "Jamshedpur", 
    "Jhumri Tilaiya", "Lohardaga", "Madhupur", "Mihijam", "Musabani", "Pakaur", 
    "Patratu", "Phusro", "Ramgarh", "Ranchi", "Sahibganj", "Saunda", "Simdega", 
    "Tenu dam-cum-Kathhara", "Adyar", "Afzalpur", "Arsikere", "Athni", "Bengaluru", 
    "Belagavi", "Ballari", "Chikkamagaluru", "Davanagere", "Gokak", "Hubli-Dharwad", 
    "Karwar", "Kolar", "Lakshmeshwar", "Lingsugur", "Maddur", "Madhugiri", "Madikeri", 
    "Magadi", "Mahalingapura", "Malavalli", "Malur", "Mandya", "Mangaluru", "Manvi", 
    "Mudalagi", "Mudabidri", "Muddebihal", "Mudhol", "Mulbagal", "Mundargi", 
    "Nanjangud", "Nargund", "Navalgund", "Nelamangala", "Pavagada", "Piriyapatna", 
    "Puttur", "Rabkavi Banhatti", "Raayachuru", "Ranebennuru", "Ramanagaram", 
    "Ramdurg", "Ranibennur", "Robertson Pet", "Ron", "Sadalagi", "Sagara", 
    "Sakaleshapura", "Sindagi", "Sanduru", "Sankeshwara", "Saundatti-Yellamma", 
    "Savanur", "Sedam", "Shahabad", "Shahpur", "Shiggaon", "Shikaripur", "Shivamogga", 
    "Surapura", "Shrirangapattana", "Sidlaghatta", "Sindhagi", "Sindhnur", "Sira", 
    "Sirsi", "Siruguppa", "Srinivaspur", "Talikota", "Tarikere", "Tekkalakote", 
    "Terdal", "Tiptur", "Tumkur", "Udupi", "Vijayapura", "Wadi", "Yadgir", "Adoor", 
    "Alappuzha", "Attingal", "Chalakudy", "Changanassery", "Cherthala", 
    "Chittur-Thathamangalam", "Guruvayoor", "Kanhangad", "Kannur", "Kasaragod", 
    "Kayamkulam", "Kochi", "Kodungallur", "Kollam", "Kottayam", "Kozhikode", 
    "Kunnamkulam", "Malappuram", "Mattannur", "Mavelikkara", "Mavoor", "Muvattupuzha", 
    "Nedumangad", "Neyyattinkara", "Nilambur", "Ottappalam", "Palai", "Palakkad", 
    "Panamattom", "Panniyannur", "Pappinisseri", "Paravoor", "Pathanamthitta", 
    "Peringathur", "Perinthalmanna", "Perumbavoor", "Ponnani", "Punalur", "Puthuppally", 
    "Koyilandy", "Shoranur", "Taliparamba", "Thiruvalla", "Thiruvananthapuram", 
    "Thodupuzha", "Thrissur", "Tirur", "Vaikom", "Varkala", "Vatakara", "Mumbai", 
    "Pune", "Nagpur", "Nashik", "Thane", "Chennai", "Coimbatore", "Madurai", "Salem", 
    "Trichy", "Hyderabad", "Warangal", "Kolkata", "Bangalore", "Mysore", "Jaipur", 
    "Jodhpur", "Kota", "Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", 
    "Meerut", "Allahabad", "Bhopal", "Indore", "Gwalior", "Jabalpur"
]

def setup_city_select_field():
    """Setup city field as Select field for Lead and Opportunity"""
    
    try:
        # Sort cities
        cities = sorted(CITIES)
        city_options = "\n".join(cities)
        
        doctypes = ["Lead", "Opportunity"]
        
        for doctype in doctypes:
            print(f"\nSetting up city field for {doctype}...")
            
            # Make city field as Select
            make_property_setter(
                doctype,
                "city",
                "fieldtype",
                "Select",
                "Select",
                validate_fields_for_doctype=False
            )
            
            # Set options
            make_property_setter(
                doctype,
                "city",
                "options",
                city_options,
                "Text",
                validate_fields_for_doctype=False
            )
            
            print(f"✓ Successfully setup city field for {doctype}")
        
        frappe.db.commit()
        print("\n✓ City field setup complete!")
        print("\nNext steps:")
        print("1. Run: bench clear-cache")
        print("2. Refresh your browser")
        print("3. The city field should now be a dropdown with autocomplete")
        
    except Exception as e:
        print(f"✗ Error: {str(e)}")
        frappe.db.rollback()
        import traceback
        traceback.print_exc()

# Run the setup
if __name__ == "__main__":
    setup_city_select_field()
else:
    # When loaded via exec() from console
    setup_city_select_field()



