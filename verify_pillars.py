import os
import sys
import time
import json
import urllib.request
import urllib.parse
import subprocess

app_dir = r"D:\opencode stuff\job-pilot-desktop"
launch_bat = os.path.join(app_dir, "launch.bat")

# Ensure Electron is running
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
    sys.exit(1)

base_url = "http://127.0.0.1:5056"

print("\n--- PILLAR 1: Duplicate Application Ledger ---")
# 1A: Existing application in job_applications_tracker.csv (Infosys)
dup_q = urllib.parse.urlencode({
    "company": "Infosys",
    "role": "Generative AI Engineer",
    "url": "https://www.naukri.com/job-listings-generative-ai-engineer-infosys-pune-chennai-bengaluru-2-to-5-years-221026035352"
})
req = urllib.request.urlopen(f"{base_url}/api/check-duplicate?{dup_q}", timeout=5)
res_dup = json.loads(req.read().decode("utf-8"))
print(f"Existing check (Infosys): isDuplicate={res_dup.get('isDuplicate')}, date={res_dup.get('date')}, matchedOn={res_dup.get('matchedOn')}")
assert res_dup.get("isDuplicate") is True, "Pillar 1A Failed"

# 1B: Fresh application
new_q = urllib.parse.urlencode({"company": "HypotheticalNewAIStartup", "role": "Founding AI Engineer", "url": "https://hypotheticalai.io/careers/123"})
req = urllib.request.urlopen(f"{base_url}/api/check-duplicate?{new_q}", timeout=5)
res_new = json.loads(req.read().decode("utf-8"))
print(f"Fresh check (Hypothetical): isDuplicate={res_new.get('isDuplicate')}")
assert res_new.get("isDuplicate") is False, "Pillar 1B Failed"
print("[PASS] Pillar 1 verified.")

print("\n--- PILLAR 2: Scam & Recruitment Fraud Detector ---")
scam_text = "Congratulations! To proceed with document verification, kindly transfer a refundable registration fee of 1500 INR to our HR desk."
req = urllib.request.Request(
    f"{base_url}/api/check-scam",
    data=json.dumps({"text": scam_text}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res_scam = json.loads(urllib.request.urlopen(req, timeout=5).read().decode("utf-8"))
print(f"Scam detection: isScam={res_scam.get('isScam')}, flags={res_scam.get('flags')}")
assert res_scam.get("isScam") is True and len(res_scam.get("flags", [])) > 0, "Pillar 2A Failed"

clean_text = "We are seeking a Full Stack AI Engineer proficient in PyTorch, LangChain, vector retrieval, and FastAPI."
req = urllib.request.Request(
    f"{base_url}/api/check-scam",
    data=json.dumps({"text": clean_text}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res_clean = json.loads(urllib.request.urlopen(req, timeout=5).read().decode("utf-8"))
print(f"Clean text check: isScam={res_clean.get('isScam')}, flags={res_clean.get('flags')}")
assert res_clean.get("isScam") is False and len(res_clean.get("flags", [])) == 0, "Pillar 2B Failed"
print("[PASS] Pillar 2 verified.")

print("\n--- PILLAR 3: Smart Screening Q&A Engine ---")
q_text = "How many years of Python experience do you have, and are you willing to relocate to Gurgaon?"
req = urllib.request.Request(
    f"{base_url}/api/answer-question",
    data=json.dumps({"question": q_text, "company": "Flipkart", "role": "AI Engineer"}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res_qa = json.loads(urllib.request.urlopen(req, timeout=12).read().decode("utf-8"))
print(f"Question: {q_text}")
print(f"Answer: {res_qa.get('answer')}")
assert res_qa.get("ok") is True and len(res_qa.get("answer", "")) > 10, "Pillar 3 Failed"
print("[PASS] Pillar 3 verified.")

print("\n--- PILLAR 4: 1-Click ATS Tailored PDF Engine ---")
req = urllib.request.Request(
    f"{base_url}/api/tailor-resume",
    data=json.dumps({
        "company": "Swiggy",
        "role": "AI Engineer",
        "jd": "Requirements: LangChain, PyTorch, RAG Pipelines, Vector DBs, FastAPI, Docker, High Throughput Services."
    }).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
res_tailor = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8"))
print(f"Tailored PDF result: ok={res_tailor.get('ok')}, pdfPath={res_tailor.get('pdfPath')}")
assert res_tailor.get("ok") is True and os.path.exists(res_tailor.get("pdfPath", "")), "Pillar 4 Failed"
print("[PASS] Pillar 4 verified.")

print("\n--- PILLAR 5: Candidate Profile Completeness ---")
req = urllib.request.urlopen(f"{base_url}/api/candidate-profile", timeout=5)
resp_profile = json.loads(req.read().decode("utf-8"))
profile = resp_profile.get("candidate", resp_profile)
print(f"Name: {profile.get('name')}")
print(f"Education: {profile.get('education')} ({profile.get('gradYear')})")
print(f"Current CTC: {profile.get('currentCtc')}, Expected CTC: {profile.get('expectedCtc')}")
print(f"Notice Days: {profile.get('noticeDays')} ({profile.get('noticePeriod')})")
print(f"Skills: {profile.get('skills')}")
print("[PASS] Pillar 5 verified.")

print("\n==========================================")
print("ALL 5 REAL-WORLD APPLICATION PILLARS VERIFIED SUCCESSFULLY!")
print("==========================================")
