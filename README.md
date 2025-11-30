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
git clone <your-repo-url>
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
  [http://127.0.0.1:8000/app/](http://127.0.0.1:8000/api/tasks/app/)

* **Analyze API (POST):**
  [http://127.0.0.1:8000/analyze/](http://127.0.0.1:8000/api/tasks/analyze/)

* **Suggestions (GET):**
  [http://127.0.0.1:8000/suggest/](http://127.0.0.1:8000/api/tasks/suggest/)

---

# **🧠 Algorithm Explanation (300–500 words)**

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
