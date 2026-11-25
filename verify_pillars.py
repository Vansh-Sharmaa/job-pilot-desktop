import os
import sys
import time
import json
import urllib.request
import urllib.parse
import urllib.error

app_dir = r"D:\opencode stuff\job-pilot-desktop"
launch_bat = os.path.join(app_dir, "launch.bat")
token_file = os.path.join(app_dir, "extension", "bridge-token.json")

bridge_token = ""
if os.path.exists(token_file):
    try:
        with open(token_file, "r", encoding="utf-8") as f:
            bridge_token = json.load(f).get("token", "")
    except Exception:
        pass

auth_headers = {"X-JobPilot-Token": bridge_token} if bridge_token else {}

def api_get(url):
    req = urllib.request.Request(url, headers=auth_headers)
    return urllib.request.urlopen(req, timeout=10)

def api_post(url, data_dict):
    data = json.dumps(data_dict).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", **auth_headers})
    return urllib.request.urlopen(req, timeout=20)

def run_all_pillars():
    # Ensure Electron is running
    alive = False
    try:
        req = urllib.request.urlopen("http://127.0.0.1:5056/api/status", timeout=2)
        alive = json.loads(req.read().decode("utf-8")).get("ok", False)
    except Exception:
        alive = False

    if not alive:
        print("[INIT] Launching Electron app via launch.bat...")
        os.system(f'start "" "{launch_bat}"')
        for attempt in range(12):
            time.sleep(1)
            try:
                req = urllib.request.urlopen("http://127.0.0.1:5056/api/status", timeout=2)
                if json.loads(req.read().decode("utf-8")).get("ok", False):
                    print(f"[INIT] App connected successfully after {attempt + 1}s.")
                    alive = True
                    break
            except Exception:
                pass

    if not alive:
        print("[ERROR] Could not connect to JobPilot on port 5056.")
        return False

    base_url = "http://127.0.0.1:5056"

    print("\n--- PILLAR 1: Duplicate Application Ledger ---")
    dup_q = urllib.parse.urlencode({
        "company": "Infosys",
        "role": "Generative AI Engineer",
        "url": "https://www.naukri.com/job-listings-generative-ai-engineer-infosys-pune-chennai-bengaluru-2-to-5-years-221026035352"
    })
    req = api_get(f"{base_url}/api/check-duplicate?{dup_q}")
    res_dup = json.loads(req.read().decode("utf-8"))
    print(f"Existing check (Infosys): isDuplicate={res_dup.get('isDuplicate')}, date={res_dup.get('date')}, matchedOn={res_dup.get('matchedOn')}")
    assert res_dup.get("isDuplicate") is True, "Pillar 1A Failed"

    new_q = urllib.parse.urlencode({"company": "HypotheticalNewAIStartup", "role": "Founding AI Engineer", "url": "https://hypotheticalai.io/careers/123"})
    req = api_get(f"{base_url}/api/check-duplicate?{new_q}")
    res_new = json.loads(req.read().decode("utf-8"))
    print(f"Fresh check (Hypothetical): isDuplicate={res_new.get('isDuplicate')}")
    assert res_new.get("isDuplicate") is False, "Pillar 1B Failed"
    print("[PASS] Pillar 1 verified.")

    print("\n--- PILLAR 2: Scam & Recruitment Fraud Detector ---")
    scam_text = "Congratulations! To proceed with document verification, kindly transfer a refundable registration fee of 1500 INR to our HR desk."
    res_scam = json.loads(api_post(f"{base_url}/api/check-scam", {"text": scam_text}).read().decode("utf-8"))
    print(f"Scam detection: isScam={res_scam.get('isScam')}, flags={res_scam.get('flags')}")
    assert res_scam.get("isScam") is True and len(res_scam.get("flags", [])) > 0, "Pillar 2A Failed"

    clean_text = "We are seeking a Full Stack AI Engineer proficient in PyTorch, LangChain, vector retrieval, and FastAPI."
    res_clean = json.loads(api_post(f"{base_url}/api/check-scam", {"text": clean_text}).read().decode("utf-8"))
    print(f"Clean text check: isScam={res_clean.get('isScam')}, flags={res_clean.get('flags')}")
    assert res_clean.get("isScam") is False and len(res_clean.get("flags", [])) == 0, "Pillar 2B Failed"
    print("[PASS] Pillar 2 verified.")

    print("\n--- PILLAR 3: Smart Screening Q&A Engine ---")
    q_text = "How many years of Python experience do you have, and are you willing to relocate to Gurgaon?"
    res_qa = json.loads(api_post(f"{base_url}/api/answer-question", {
        "question": q_text,
        "company": "Flipkart",
        "role": "AI Engineer"
    }).read().decode("utf-8"))
    print(f"Question: {q_text}")
    print(f"Answer: {res_qa.get('answer')}")
    assert res_qa.get("ok") is True and len(res_qa.get("answer", "")) > 10, "Pillar 3 Failed"
    print("[PASS] Pillar 3 verified.")

    print("\n--- PILLAR 4: 1-Click ATS Tailored PDF Engine ---")
    res_tailor = json.loads(api_post(f"{base_url}/api/tailor-resume", {
        "company": "Swiggy",
        "role": "AI Engineer",
        "jd": "Requirements: LangChain, PyTorch, RAG Pipelines, Vector DBs, FastAPI, Docker, High Throughput Services."
    }).read().decode("utf-8"))
    print(f"Tailored PDF result: ok={res_tailor.get('ok')}, pdfPath={res_tailor.get('pdfPath')}")
    assert res_tailor.get("ok") is True and os.path.exists(res_tailor.get("pdfPath", "")), "Pillar 4 Failed"
    print("[PASS] Pillar 4 verified.")

    print("\n--- PILLAR 5: Candidate Profile Completeness ---")
    resp_profile = json.loads(api_get(f"{base_url}/api/candidate-profile").read().decode("utf-8"))
    profile = resp_profile.get("candidate", resp_profile)
    print(f"Name: {profile.get('name')}")
    print(f"Education: {profile.get('education')} ({profile.get('gradYear')})")
    print(f"College: {profile.get('college')}")
    print(f"Current CTC: {profile.get('currentCtc')}, Expected CTC: {profile.get('expectedCtc')}")
    print(f"Notice Days: {profile.get('noticeDays')} ({profile.get('noticePeriod')})")
    print(f"Skills: {profile.get('skills')}")
    assert profile.get("college") == "Graphic Era Hill University", "Pillar 5 College mismatch"
    print("[PASS] Pillar 5 verified.")

    print("\n==========================================")
    print("ALL 5 REAL-WORLD APPLICATION PILLARS VERIFIED SUCCESSFULLY!")
    print("==========================================")
    return True

if __name__ == '__main__':
    ok = run_all_pillars()
    if not ok:
        sys.exit(1)
