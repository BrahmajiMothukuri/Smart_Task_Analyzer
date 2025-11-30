# **Task Analyzer — README.md**

## ** Overview**

Task Analyzer is a Django-based backend combined with a lightweight frontend designed to intelligently prioritize tasks using multiple scoring strategies.
It evaluates urgency, impact, effort, deadlines, and dependency chains to produce optimal task ordering across four modes:

* **Fastest Wins**
* **High Impact**
* **Deadline Driven**
* **Smart Balance** (default)

---

# ** Setup Instructions**

### **1. Clone the Repository**

```bash
git clone https://github.com/BrahmajiMothukuri/Smart_Task_Analyzer
cd task-analyzer
```

---

### **2. Create Virtual Environment**

```bash
python -m venv venv
```

Activate it:

* **Windows**

  ```bash
  venv\Scripts\activate
  ```
* **Linux / Mac**

  ```bash
  source venv/bin/activate
  ```

---

### **3. Install Dependencies**

```bash
pip install -r requirements.txt
```

---

### **4. Run Database Migrations**

```bash
python manage.py migrate
```

---

### **5. Start the Django Server**

```bash
python manage.py runserver
```

---

### **6. Access the App**

* **Frontend UI:**
  [http://127.0.0.1:8000/api/tasks/app/](http://127.0.0.1:8000/api/tasks/app/)

* **Analyze API (POST):**
  [http://127.0.0.1:8000/api/tasks/analyze/](http://127.0.0.1:8000/api/tasks/analyze/)

* **Suggestions (GET):**
  [http://127.0.0.1:8000/api/tasks/suggest/](http://127.0.0.1:8000/api/tasks/suggest/)

---

# **🧠 Algorithm Explanation **

The Task Analyzer uses a hybrid scoring and dependency-aware sorting system to determine the best order in which a user should complete tasks. At the core of the algorithm is a `calculate_task_score()` function, which generates a composite score for each task by considering urgency (due date), impact (importance), and time-effort (estimated hours). Urgency is handled by comparing the due date with today’s date, awarding higher scores for overdue tasks or tasks due in the next few days. Importance is heavily weighted (importance × 5) to reflect its influence on prioritization. Very short tasks (<2 hours) also receive bonus points, allowing quick wins to surface higher when appropriate.

After scoring, the system supports four different priority modes:

### **1. Fastest Wins**

This mode sorts tasks by `estimated_hours` in ascending order so that quick tasks appear first. It recursively resolves dependencies using `getFastestWinningTasks()`, ensuring that each prerequisite task is included before the dependent task. This makes it ideal when users want to make rapid progress and build momentum.

### **2. High Impact**

Tasks are sorted by `importance` in descending order. This strategy pushes high-value tasks to the top, even if they are lengthy. Dependencies are included automatically through recursive traversal. The algorithm ensures that completing high-impact tasks does not violate dependency constraints.

### **3. Deadline Driven**

This mode sorts tasks strictly by due date, prioritizing tasks that must be completed soon. The recursive dependency resolver ensures that earlier deadlines are still respected even when dependencies exist.

### **4. Smart Balance (Default)**

The Smart Balance approach uses the overall calculated score (`urgency + importance + quick win factor`) as its comparator. It aims to balance deadline pressure, importance, and estimated effort to produce a well-rounded task plan. The dependency resolver (`getSmartTasks()`) ensures logical order while balancing task characteristics holistically.

### **Cycle Detection**

A key feature is cycle detection in dependencies using DFS. If a cycle is found (e.g., A → B → C → A), the system stops sorting and returns a meaningful error message instead of generating an invalid ordering.

Overall, the algorithm combines multi-factor scoring, four priority strategies, dependency management, and cycle detection into an intelligent and flexible task-prioritization engine.

---

# **🎨 Design Decisions & Trade-offs**

### ✔ **SQLite for simplicity**

Used due to fast prototyping—ideal for local use; can be swapped later for PostgreSQL.

### ✔ **Custom scoring instead of ML**

I avoided machine learning for simplicity, transparency, and full control over outcomes.

### ✔ **Django REST Framework**

DRF structured APIs cleanly with minimal boilerplate.

### ✔ **Separate scoring module**

The scoring logic sits in `scoring.py`, making it reusable, testable, and independent.

### ✔ **Recursive dependency resolver**

Ensures correctness but may be slower for very large graphs (acceptable for typical task sizes).

---

# Time Breakdown (Approximate)

| Task                                    		| Time      |
| ------------------------------------------------------| --------- |
| Learning & understanding Django + REST Framework	| 4-5 hrs   |
| Designing system structure              		| 2 hrs     |
| Building Django backend                 		| 4.5 hrs   |
| Writing scoring algorithms              		| 3-4 hrs   |
| Handling dependencies + cycle detection 		| 3-4 hrs   |
| Frontend UI (HTML/CSS/JS)               		| 3 hr      |
| Debugging & Testing                     		| 2.5 hr    |
| Writing documentation                   		| 20 min    |

**Total ≈ 26 hours**w

---

* ✔ Dependency resolution
* ✔ Cycle detection
* ✔ Multi-mode prioritization
* ✔ Smart Balanced scoring
* ✔ Database persistence of raw tasks
* ✔ Human-readable “remarks” for each task

---

#Future Improvements

* Add React-based frontend
* Add authentication + user profiles
* Store multiple analysis sessions with history
* Add visualization: Gantt charts, dependency graphs
* Add machine-learning based “adaptive prioritization”
* Support drag-and-drop task editing
* Deploy to cloud (Render / Railway / AWS)

---
## 🧪 Unit Test Cases

Below are the official unit test inputs used to validate the Smart Task Analyzer logic.

---

### **📌 Test Case 1 — Dependency Ordering & Smart Priority**
This test ensures:
- No cycle exists  
- Tasks are ordered respecting dependencies  
- Smart algorithm returns valid top results  

**Input:**
```json
[
  {"id":1,"title":"Research","due_date":"2025-11-20","estimated_hours":12,"importance":14,"dependencies":[],"created_at":"2025-11-01T09:00:00.000Z"},
  {"id":2,"title":"QuickBug","due_date":"2025-11-25","estimated_hours":1,"importance":12,"dependencies":[],"created_at":"2025-11-02T10:00:00.000Z"},
  {"id":3,"title":"FeatureA","due_date":"2025-12-01","estimated_hours":8,"importance":10,"dependencies":[1,2],"created_at":"2025-11-03T11:00:00.000Z"},
  {"id":4,"title":"Hotfix","due_date":"2025-11-15","estimated_hours":1,"importance":8,"dependencies":[],"created_at":"2025-11-04T12:00:00.000Z"},
  {"id":5,"title":"Refactor","due_date":"2025-11-30","estimated_hours":5,"importance":6,"dependencies":[1],"created_at":"2025-11-05T13:00:00.000Z"},
  {"id":6,"title":"Documentation","due_date":"2025-12-05","estimated_hours":3,"importance":5,"dependencies":[3],"created_at":"2025-11-06T14:00:00.000Z"},
  {"id":7,"title":"Integration","due_date":"2025-11-22","estimated_hours":6,"importance":4,"dependencies":[3,5],"created_at":"2025-11-07T15:00:00.000Z"},
  {"id":8,"title":"Deploy","due_date":"2025-11-18","estimated_hours":2,"importance":3,"dependencies":[],"created_at":"2025-11-08T16:00:00.000Z"},
  {"id":9,"title":"UXReview","due_date":"2025-11-27","estimated_hours":4,"importance":2,"dependencies":[4],"created_at":"2025-11-09T17:00:00.000Z"},
  {"id":10,"title":"DataMigration","due_date":"2025-12-10","estimated_hours":10,"importance":1,"dependencies":[5,8],"created_at":"2025-11-10T18:00:00.000Z"}
]
```
### **📌 Test Case 2 — Cycle Detection**

Ensures cycle detection works correctly and the analyzer does not proceed with invalid graphs.

**Input 1 (simple 2-node cycle):**
```json
[
  {"id":1,"title":"A","dependencies":[2]},
  {"id":2,"title":"B","dependencies":[1]}
]

[
  {"id":1,"dependencies":[2]},
  {"id":2,"dependencies":[3]},
  {"id":3,"dependencies":[1]}
]


```
Expected:
Cycle must be detected
Analyzer should not return sorted output

### Test Case 3 — Missing Fields & Overdue Handling

Verifies the analyzer does not break when some fields are missing and handles overdue tasks correctly.

**Input:**
```json
[
  {"id":1,"title":"NoDate","estimated_hours":2,"importance":5,"dependencies":[]},
  {"id":2,"title":"NoEst","due_date":"2025-11-28","importance":7,"dependencies":[]},
  {"id":3,"title":"Overdue","due_date":"2025-11-01","estimated_hours":1,"importance":8,"dependencies":[]}
]
```

Expected:

No cycle

Missing values should not cause errors

Overdue task should receive highest urgency score
