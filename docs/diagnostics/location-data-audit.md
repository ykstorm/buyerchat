# LocationData audit — 2026-04-24

Scope: rows in `LocationData` where `microMarket` ∈ {SBopal, Shela, Bopal}.

## Summary

- Ground-truth items expected: **31**
- Rows currently in DB (incl. duplicated by microMarket): **81**
- Missing (in operator doc but NOT in DB): **0**
- Extra (in DB but NOT in operator doc, excluding 'atm' category): **0**
- Name mismatches (same canonical name typed differently): **0** (normalised comparison)

## Current DB rows by category

### atm
- Axis ATM [Shela]
- Axis ATM [SBopal]
- Bank of Baroda ATM [Shela]
- Bank of Baroda ATM [SBopal]
- HDFC ATM [SBopal]
- HDFC ATM [Shela]
- ICICI ATM [Shela]
- ICICI ATM [SBopal]
- Kotak ATM [SBopal]
- Kotak ATM [Shela]
- SBI ATM [SBopal]
- SBI ATM [Shela]
- Union Bank ATM [Shela]
- Union Bank ATM [SBopal]
- Yes Bank ATM [SBopal]
- Yes Bank ATM [Shela]

### bank
- Axis Bank [Shela]
- Axis Bank [SBopal]
- Bank of Baroda [SBopal]
- Bank of Baroda [Shela]
- HDFC Bank [Shela]
- HDFC Bank [SBopal]
- ICICI Bank [Shela]
- ICICI Bank [SBopal]
- Kotak Bank [SBopal]
- Kotak Bank [Shela]
- SBI [SBopal]
- SBI [Shela]
- Union Bank [Shela]
- Union Bank [SBopal]
- Yes Bank [Shela]
- Yes Bank [SBopal]

### club
- Club O7 [SBopal]
- Club O7 [Shela]
- Gala Gymkhana [SBopal]
- Gala Gymkhana [Shela]
- Karnavati Club [SBopal]
- Karnavati Club [Shela]
- Rajpath Club [Shela]
- Rajpath Club [SBopal]

### hospital
- HCG [Shela] — Oncology specialty
- HCG [SBopal] — Oncology specialty
- Krishna Shalby Hospital [SBopal] — 210-bed NABH accredited
- Krishna Shalby Hospital [Shela] — 210-bed NABH accredited
- Saraswati Hospital [SBopal]
- Saraswati Hospital [Shela]
- Tej Hospital [SBopal]
- Tej Hospital [Shela]

### mall
- DMart Bopal [Bopal]
- DMart Bopal [SBopal]
- Palladium [Shela]
- Palladium [SBopal]
- SoBo Centre [Shela]
- SoBo Centre [SBopal]
- TRP Mall [Shela]
- TRP Mall [SBopal]

### park
- AUDA Sky City [Shela]
- AUDA Sky City [SBopal]
- Electrotherm Park [Shela] — Opened Dec 2025, 11,600 sqmt
- Electrotherm Park [SBopal] — Opened Dec 2025, 11,600 sqmt
- Shaligram Oxygen Park [SBopal] — Opened Jan 2025
- Shaligram Oxygen Park [Shela] — Opened Jan 2025

### school
- Anant National University [SBopal]
- Anant National University [Shela]
- Apollo International School [Shela] — CBSE, KG-12
- Apollo International School [SBopal] — CBSE, KG-12, near Marigold Circle
- DPS Bopal [Bopal] — CBSE, KG-12
- DPS Bopal [SBopal] — CBSE, KG-12, ~0.8km from South Bopal
- MICA [SBopal] — Management institute
- MICA [Shela] — Management institute
- Shanti Asiatic School [SBopal] — CBSE, 1-12
- Shanti Asiatic School [Shela] — CBSE, 1-12, off 200 Ft Ring Road

### temple
- Shri Bhidbhanjan Hanumanji Temple [SBopal]
- Shri Bhidbhanjan Hanumanji Temple [Shela]
- Shri Bhidbhanjan Hanumanji Temple [Bopal]

### transport
- Bopal BRTS [Bopal] — BRTS stop, every 8-12 min
- Bopal BRTS [SBopal] — BRTS stop, every 8-12 min
- Bopal BRTS [Shela] — BRTS stop, every 8-12 min
- Metro Bopal Station [Bopal] — ~1.2km, 2027 expected
- Metro Bopal Station [SBopal] — ~1.2km, 2027 expected
- Metro Bopal Station [Shela] — ~1.2km, 2027 expected
