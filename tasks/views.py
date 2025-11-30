# This file handles API requests, serves the frontend, 
# fetches tasks from SQLite, saves analyzed tasks, and 
# connects the scoring algorithm with the REST API.

from django.http import HttpResponse
import os
import json
from .scoring import Analyse 
from rest_framework.decorators import api_view
from rest_framework.response import Response
import sqlite3
from datetime import datetime
from django.conf import settings

# Loads and serves the static index.html file from the frontend folder.
# Allows Django to act as a simple backend + frontend server.

def serve_frontend(request):
    html_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "index.html")
    
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    return HttpResponse(html)
# Fetches all previously analyzed tasks from SQLite.
# Converts raw 'deps' JSON string into a Python list of dependencies.
# Returns a clean list of task dictionaries for the analyzer.

def fetch_all_tasks():
    db_path = settings.DATABASES['default']['NAME']
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, req_id, remote_id, title, due_date,
               estimated_hours, importance, created_at, deps
        FROM tasks_raw;
    """)

    rows = cur.fetchall()
    conn.close()

    cols = ["id","req_id","remote_id","title","due_date",
            "estimated_hours","importance","created_at","deps"]

    allTasks = []
    for r in rows:
        obj = dict(zip(cols, r))

        try:
            obj["dependencies"] = json.loads(obj["deps"] or "[]")
        except:
            obj["dependencies"] = []

        obj.pop("deps", None)   # optional: remove raw deps

        allTasks.append(obj)

    return allTasks

# Saves each analyzed task into the SQLite database with a unique req_id.
# Ensures table exists (CREATE TABLE IF NOT EXISTS).
# Stores dependencies as JSON to preserve structure.
# Returns the req_id to track this batch of tasks.

def save_tasks_raw_to_sqlite(analysed_list):
 
    db_path = settings.DATABASES['default']['NAME']

    req_id = datetime.utcnow().isoformat()

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS tasks_raw (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      req_id TEXT,
      remote_id INTEGER,
      title TEXT,
      due_date TEXT,
      estimated_hours REAL,
      importance INTEGER,
      created_at TEXT,
      deps TEXT
    )
    """)

    for obj in analysed_list:
        remote_id = obj.get('id')
        title = obj.get('title') or ''
        due_date = obj.get('due_date')
        est = obj.get('estimated_hours')
        importance = obj.get('importance')
        created_at = obj.get('created_at') or datetime.utcnow().isoformat()
        deps_json = json.dumps(obj.get('dependencies') or [])

        cur.execute(
            "INSERT INTO tasks_raw (req_id, remote_id, title, due_date, estimated_hours, importance, created_at, deps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (req_id, remote_id, title, due_date, est, importance, created_at, deps_json)
        )

    conn.commit()
    conn.close()
    return req_id

# GET endpoint that fetches all stored tasks and runs Smart Balance analysis.
# Useful for quickly testing recommendations without sending new data.

@api_view(['GET'])
def receive_request(request):
    allTasks = fetch_all_tasks()
    print("all tasks:\n\n\n\t->",type(allTasks),type(allTasks[0]),"\n\n")
    newData = {"Tasks":allTasks,"analyseType":"Smart Balance"}
    AnalysedData = Analyse(newData)
    return Response({
        "status": "success",
        "recommendations": AnalysedData[:3]
    })

# POST endpoint that receives task payload from frontend.
# Runs Analyse() to calculate priority order.
# Saves analyzed tasks to SQLite.
# Returns ordered recommendations + status.

@api_view(["POST"])
def receive_data(request):
    payload = request.data
    AnalysedData = Analyse(payload)

    if isinstance(AnalysedData, list):
        try:
            req_id = save_tasks_raw_to_sqlite(AnalysedData)
        except Exception as e:
            return Response({"status": "error", "message": f"Failed to save to DB: {str(e)}"}, status=500)
        return Response({
            "status": "success",
            "data": AnalysedData,
            "recommendations": AnalysedData,
            "cycleStatus": "",
            "req_id": req_id
        })
    else:
        return Response({"status": "success", "data": [], "recommendations": [], "cycleStatus": AnalysedData})
