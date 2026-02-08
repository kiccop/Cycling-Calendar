import json
import requests
from bs4 import BeautifulSoup
from procyclingstats import Race
import time
import sys

import subprocess

def fetch_pcs_calendar(year=2026):
    circuits = [
        ("1", "WorldTour"),
        ("26", "ProSeries"),
        ("13", "Europe Tour"),
        ("24", "Women WorldTour"),
        ("16", "Women Elite"),
        ("18", "America Tour"),
        ("12", "Asia Tour")
    ]
    
    all_races = []
    seen_urls = set()
    
    for circuit_id, circuit_name in circuits:
        url = f"https://www.procyclingstats.com/races.php?s=year-calendar&year={year}&circuit={circuit_id}"
        print(f"Fetching {circuit_name}: {url}")
        
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        cmd = ["curl.exe", "-s", "-L", "-A", ua, "-H", "Referer: https://google.com/", url]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            if result.returncode != 0: continue
            html_content = result.stdout
        except: continue

        soup = BeautifulSoup(html_content, 'html.parser')
        table = soup.find('table', {'class': 'basic'})
        if not table:
            print(f"Table not found for {circuit_name}")
            continue

        rows = table.find('tbody').find_all('tr')
        print(f"Found {len(rows)} races in {circuit_name}")
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 5: continue
            
            date_str = cols[0].text.strip()
            race_link = cols[2].find('a')
            if not race_link: continue
            
            race_url = race_link['href']
            if race_url in seen_urls: continue
            seen_urls.add(race_url)
            
            race_name = race_link.text.strip()
            category = cols[4].text.strip()
            
            # Map date to YYYY-MM-DD
            try:
                day_month = date_str.split(' - ')[0] if ' - ' in date_str else date_str
                # PCS date is usually DD.MM or DD.MM - DD.MM
                parts = [p.strip() for p in day_month.split('.')]
                d = parts[0].zfill(2)
                m = parts[1].zfill(2)
                iso_date = f"{year}-{m}-{d}"
            except:
                iso_date = f"{year}-01-01"

            is_women = "women" in race_name.lower() or "WWT" in category or "W.WT" in category or "W.Pro" in category or circuit_id in ["24", "16"]
            is_under = "U23" in race_name or "(MU)" in race_name or "Under 23" in race_name
            
            is_pro_rank = "UWT" in category or "Pro" in category or "1.1" in category or "2.1" in category
            is_minor = "1.2" in category or "2.2" in category
            is_men_elite = not is_women and not is_under and (is_pro_rank or is_minor)

            race_obj = {
                "id": f"pcs-{len(all_races)}",
                "name": race_name,
                "discipline": "road",
                "date": iso_date,
                "category": category,
                "location": "TBD",
                "tv": ["Eurosport", "Discovery+"],
                "status": "Upcoming",
                "isWomen": is_women,
                "isUnder": is_under,
                "isMinor": is_minor,
                "isMenElite": is_men_elite,
                "source": f"PCS ({category})"
            }
            
            if any(it in race_name.lower() or it in race_url.lower() for it in ["italy", "italiano", "italiani", "lombardia", "sanremo", "tirreno", "adria", "ita"]):
                 race_obj["isItaly"] = True
                 race_obj["location"] = "Italy"
                 if "RAI Sport" not in race_obj["tv"]: race_obj["tv"].append("RAI Sport")

            all_races.append(race_obj)
            
    return all_races

if __name__ == "__main__":
    year = 2026
    if len(sys.argv) > 1:
        year = int(sys.argv[1])
        
    all_races = fetch_pcs_calendar(year)
    
    # Save to JSON
    output_file = f"src/data/pcs_races_{year}.json"
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_races, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully saved {len(all_races)} races to {output_file}")
