'''
scoring.py
Contains the full priority-scoring engine.
Includes:
- Score calculation (urgency, effort, importance)
- Four sorting strategies
- Dependency resolution
- Cycle detection using DFS

'''
from datetime import date, datetime

# calculate_task_score(task) 
''''
Generates a numerical score for each task based on:
1. Deadline urgency (overdue / near deadline)
2. Task importance (weighted heavily)
3. Estimated hours (quick wins get bonuses)
Score is used in Smart Balance strategy.
'''

def calculate_task_score(task):
    score = 0

    due = task.get("due_date")

    if isinstance(due, str):
        try:
            # Accept both "2025-11-30" and "2025-11-30T10:20:00Z"
            due_date = datetime.fromisoformat(due.replace("Z", "")).date()
        except Exception:
            # fallback: treat as far future (lowest urgency)
            due_date = date.max
    elif isinstance(due, date):
        due_date = due
    else:
        due_date = date.max

    today = date.today()
    days_until_due = (due_date - today).days

    if days_until_due < 0:
        score += 100      # Overdue → extremely important
    elif days_until_due <= 3:
        score += 50       # Due in 3 days → strong urgency
    elif days_until_due <= 7:
        score += 20       # Due this week → moderate urgency
    else:
        score += 0        # Not urgent

    importance = task.get("importance", 0)
    score += importance * 5   # Weight importance strongly

    est = task.get("estimated_hours", 999)
    if est < 2:
        score += 10          # Quick win
    return score


# sortTasks(): Sorts tasks using any comparator key.

def sortTasks(Tasks,comparator):
    sorted_tasks = sorted(Tasks, key=lambda t: t[comparator])
    return sorted_tasks

'''
getSmartTasks(), getFastestWinningTasks(), getHighImpactTasks(), getDeadlineDrivenTasks()

All functions:
- Recursively include dependencies BEFORE the main task.
- Prevent duplicates.
- Ensure logical order is preserved.
'''


def getSmartTasks(current_tasks, Ans, all_tasks,comparator):
    sorted_tasks = sortTasks(current_tasks,comparator)
    for task in sorted_tasks:
        if task in Ans:
            continue
        deps = task["dependencies"]
        all_done = True

        for dep_id in deps:
            if not any(a["id"] == dep_id for a in Ans):
                all_done = False
                break

        if not all_done:
            required = [t for t in all_tasks if t["id"] in deps and t not in Ans]
            if required:
                getSmartTasks(required, Ans, all_tasks,comparator)

        if task not in Ans:
            Ans.append(task)    

def getFastestWinningTasks(current_tasks, Ans, all_tasks,comparator):
    sorted_tasks = sortTasks(current_tasks,comparator)
    for task in sorted_tasks:
        if task in Ans:
            continue
        deps = task["dependencies"]
        all_done = True

        for dep_id in deps:
            if not any(a["id"] == dep_id for a in Ans):
                all_done = False
                break

        if not all_done:
            required = [t for t in all_tasks if t["id"] in deps and t not in Ans]
            if required:
                getFastestWinningTasks(required, Ans, all_tasks,comparator)

        if task not in Ans:
            Ans.append(task)    

def getHighImpactTasks(current_tasks, Ans, all_tasks,comparator):
    sorted_tasks = sortTasks(current_tasks,comparator)
    sorted_tasks.reverse()
    #print("---->====>",sorted_tasks)
    for task in sorted_tasks:
        if task in Ans:
            continue
        deps = task["dependencies"]
        all_done = True
        for dep_id in deps:
            if not any(a["id"] == dep_id for a in Ans):
                all_done = False
                break

        if not all_done:
            required = [t for t in all_tasks if t["id"] in deps and t not in Ans]
            if required:
                getHighImpactTasks(required, Ans, all_tasks,comparator)

        if task not in Ans:
            Ans.append(task)    

def  getDeadlineDrivenTasks(current_tasks, Ans, all_tasks,comparator):
    sorted_tasks = sortTasks(current_tasks,comparator)
    for task in sorted_tasks:
        if task in Ans:
            continue
        deps = task["dependencies"]
        all_done = True
        for dep_id in deps:
            if not any(a["id"] == dep_id for a in Ans):
                all_done = False
                break

        if not all_done:
            required = [t for t in all_tasks if t["id"] in deps and t not in Ans]
            if required:
                 getDeadlineDrivenTasks(required, Ans, all_tasks,comparator)

        if task not in Ans:
            Ans.append(task)    
    return Ans

'''
checkCycle():
Uses DFS to detect dependency cycles (A → B → C → A).
Returns a tuple: [True, message] when cycle exists.
Prevents infinite recursion and invalid task ordering.
'''

def checkCycle(tasks):
    # convert list to a dictionary for quick lookup
    taskById = {t["id"]: t for t in tasks}

    visited = set()        # tasks that are fully processed
    visiting = set()       # tasks currently in the recursion path

    def dfs(taskId, path):
        if taskId in visiting:
            # cycle found → return path + new node to show cycle
            cyclePath = path[path.index(taskId):] + [taskId]
            msg = "Cycle detected: " + " → ".join(str(x) for x in cyclePath)
            return True, msg

        if taskId in visited:
            return False, ""

        visiting.add(taskId)
        path.append(taskId)

        currentTask = taskById.get(taskId, None)
        if not currentTask:
            visiting.remove(taskId)
            path.pop()
            return False, ""

        for depId in currentTask["dependencies"]:
            found, msg = dfs(depId, path)
            if found:
                return True, msg

        visiting.remove(taskId)
        visited.add(taskId)
        path.pop()
        return False, ""

    # run DFS from each task
    for task in tasks:
        found, msg = dfs(task["id"], [])
        if found:
            return [True, msg]

    return [False, ""]

# sortByFastestWinningTasks():
# Prioritizes shortest estimated hours first.            
def sortByFastestWinningTasks(Tasks):
    cycleExist = checkCycle(Tasks)
    if not cycleExist[0]:
        Ans = []
        getFastestWinningTasks(Tasks, Ans, Tasks, "estimated_hours")
        for i in range(len(Ans)):
            Ans[i]["remarks"] = (
                f"Remark: '{ Ans[i]['title']}' takes { Ans[i]['estimated_hours']} hours and "
                f"has dependencies { Ans[i]['dependencies']}, which were ordered for fastest completion."
            )
        print("fastest ids:", [t["id"] for t in Ans])    
        return Ans
    else:
        return cycleExist[1]

# sortByHighImpactTasks():
# Prioritizes highest importance first.
def sortByHighImpactTasks(Tasks):
    cycleExist = checkCycle(Tasks)
    if not cycleExist[0]:
        Ans=[]
        getHighImpactTasks(Tasks, Ans, Tasks,"importance")
        #print("--Srt Tasks---\n\n\t",Ans,"--\n\n\t")
        for i in range(len(Ans)):
            Ans[i]["remarks"] = (
                f"Remark: '{ Ans[i]['title']}' has high importance level { Ans[i]['importance']} "
                f"and dependencies { Ans[i]['dependencies']}, prioritized for maximum impact."
            )
        print("HighImpact ids:", [t["id"] for t in Ans])    

        return Ans
    else:
        return cycleExist[1]

# sortByDeadlineDrivenTasks():
# Prioritizes nearest deadlines first.
def  sortByDeadlineDrivenTasks(Tasks):
    cycleExist = checkCycle(Tasks)
    if not cycleExist[0]:
        Ans=[]
        getDeadlineDrivenTasks(Tasks, Ans, Tasks,"due_date")
    
        for i in range(len(Ans)):
            Ans[i]["remarks"] = (
                f"Remark: '{ Ans[i]['title']}' has a due date { Ans[i]['due_date']} and "
                f"dependencies { Ans[i]['dependencies']}, ordered to meet the deadline on time."
            )
        print("deadline ids:", [t["id"] for t in Ans])    
        return Ans    
        
    else:
        return cycleExist[1]


# getSmartBalancedTasks():
# Uses the combined 'score' to balance urgency, importance, and effort.
def getSmartBalancedTasks(Tasks):
    cycleExist = checkCycle(Tasks)
    if not cycleExist[0]:
        Ans = []
        getSmartTasks(Tasks,Ans,Tasks,"score")
        for t in Ans:
            t["remarks"] = (
            f"Smart Remark: '{t['title']}' : {t['score']} is prioritized based on estimated "
            f"hours ({t['estimated_hours']}), importance ({t['importance']}), "
            f"and deadline ({t['due_date']}), while resolving dependencies {t['dependencies']}."
            )

        return  Ans
    else:
        return cycleExist[1]

'''
Analyse():
Main function called by views.py.
Adds 'score' to each task.
Based on 'analyseType', selects which strategy to run.
Returns fully ordered list or cycle error.
'''

def Analyse(data):
    priority = data["analyseType"]
    Tasks = data["Tasks"]
    analyesedData = Tasks
    #score each task
    for task in Tasks:
        score=calculate_task_score(task)
        task["score"]=score
    if priority == "Fastest Wins":
        analyesedData = sortByFastestWinningTasks(Tasks)
    elif(priority == "High Impact"):
        analyesedData = sortByHighImpactTasks(Tasks)   
    elif(priority == "Deadline Driven"):
        analyesedData = sortByDeadlineDrivenTasks(Tasks)    
    else:
        analyesedData = getSmartBalancedTasks(Tasks)
    return analyesedData