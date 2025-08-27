// @ts-check

// @ts-check

// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    // --- Tab Switching Logic ---
    function openTab(evt, tabName) {
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            /** @type {HTMLElement} */ (tabcontent[i]).style.display = "none";
        }
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
        /** @type {HTMLElement} */ (document.getElementById(tabName)).style.display = "block";
        /** @type {HTMLElement} */ (evt.currentTarget).className += " active";
    }


    // --- Tab Initialization and Event Listeners ---
    document.addEventListener('DOMContentLoaded', () => {
        const tablinks = document.getElementsByClassName("tablinks");
        for (let i = 0; i < tablinks.length; i++) {
            tablinks[i].addEventListener('click', (event) => {
                const tabName = /** @type {HTMLElement} */ (event.currentTarget).dataset.tab;
                if (tabName) {
                    openTab(event, tabName);
                }
            });
        }

        // Automatically open the first tab on load
        if (tablinks.length > 0) {
            /** @type {HTMLElement} */ (tablinks[0]).click();
        }
    });

    // --- Timer Tab Logic ---
    const methodSelect = /** @type {HTMLSelectElement} */ (document.getElementById('method-select'));
    const statusText = document.getElementById('status-text');

    if (methodSelect) {
        methodSelect.addEventListener('change', (event) => {
            if (event.target) {
                vscode.postMessage({
                    type: 'setMethod',
                    value: /** @type {HTMLSelectElement} */ (event.target).value
                });
            }
        });
    }

    // Request the initial status from the extension
    vscode.postMessage({ type: 'getStatus' });


    // --- Stats & Tasks Tab Logic ---
    const levelSpan = document.getElementById('level');
    const xpSpan = document.getElementById('xp');
    const xpToNextLevelSpan = document.getElementById('xp-to-next-level');
    const xpBar = /** @type {HTMLProgressElement} */ (document.getElementById('xp-bar'));
    const speedSpan = document.getElementById('speed');
    const strengthSpan = document.getElementById('strength');
    const knowledgeSpan = document.getElementById('knowledge');
            const goalInput = /** @type {HTMLInputElement} */ (document.getElementById('goal-input'));
            const addGoalBtn = document.getElementById('add-goal-btn');
            const goalList = document.getElementById('goal-list');

            if (addGoalBtn) {
                addGoalBtn.addEventListener('click', () => {
                    if (goalInput && goalInput.value.trim() !== '') {
                        vscode.postMessage({
                            type: 'addGoal',
                            value: goalInput.value.trim()
                        });
                        goalInput.value = '';
                    }
                });
            }

            function renderGoals(goals) {
                if (goalList) {
                    goalList.innerHTML = ''; // Clear existing goals
                    goals.forEach(goal => {
                        const goalLi = document.createElement('li');
                        goalLi.className = 'goal-item';
                        if (goal.completed) {
                            goalLi.classList.add('completed');
                        }

                        const goalHeader = document.createElement('div');
                        goalHeader.className = 'goal-header';

                        const goalTextSpan = document.createElement('span');
                        goalTextSpan.textContent = goal.text;
                        goalHeader.appendChild(goalTextSpan);

                        if (!goal.completed) {
                            const completeGoalBtn = document.createElement('button');
                            completeGoalBtn.textContent = 'Complete Goal';
                            completeGoalBtn.className = 'complete-goal-btn';
                            completeGoalBtn.addEventListener('click', () => {
                                vscode.postMessage({ type: 'completeGoal', value: goal.id });
                            });
                            goalHeader.appendChild(completeGoalBtn);
                        }

                        goalLi.appendChild(goalHeader);

                        const taskList = document.createElement('ul');
                        taskList.className = 'task-list';

                        goal.tasks.forEach(task => {
                            const taskLi = document.createElement('li');
                            taskLi.className = 'task-item';

                            const taskCheckbox = document.createElement('input');
                            taskCheckbox.type = 'checkbox';
                            taskCheckbox.checked = task.completed;
                            taskCheckbox.disabled = goal.completed; // Disable tasks if goal is completed
                            taskCheckbox.addEventListener('change', () => {
                                vscode.postMessage({ type: 'completeTask', goalId: goal.id, taskId: task.id });
                            });
                            taskLi.appendChild(taskCheckbox);

                            const taskTextSpan = document.createElement('span');
                            taskTextSpan.textContent = task.text;
                            if (task.completed) {
                                taskTextSpan.classList.add('completed-task-text');
                            }
                            taskLi.appendChild(taskTextSpan);
                            taskList.appendChild(taskLi);
                        });

                        if (!goal.completed) {
                            const addTaskContainer = document.createElement('div');
                            addTaskContainer.className = 'add-task-container';

                            const addTaskInput = document.createElement('input');
                            addTaskInput.type = 'text';
                            addTaskInput.placeholder = 'Add a new task...';
                            addTaskInput.className = 'add-task-input';

                            const addTaskBtn = document.createElement('button');
                            addTaskBtn.textContent = 'Add Task';
                            addTaskBtn.className = 'add-task-btn';
                            addTaskBtn.addEventListener('click', () => {
                                if (addTaskInput.value.trim() !== '') {
                                    vscode.postMessage({
                                        type: 'addTask',
                                        goalId: goal.id,
                                        value: addTaskInput.value.trim()
                                    });
                                    addTaskInput.value = ''; // Clear input after adding
                                }
                            });
                            addTaskContainer.appendChild(addTaskInput);
                            addTaskContainer.appendChild(addTaskBtn);
                            taskList.appendChild(addTaskContainer);
                        }

                        goalLi.appendChild(taskList);
                        goalList.appendChild(goalLi);
                    });
                }
            }


            // --- Message Handling from Extension ---
            window.addEventListener('message', event => {
                const message = event.data; // The json data that the extension sent
                switch (message.type) {
                    case 'updateStatus':
                        {
                            if (statusText) {
                                statusText.textContent = message.value;
                            }
                            break;
                        }
                    case 'updateStats':
                        {
                            if (levelSpan) levelSpan.textContent = message.value.level;
                            if (xpSpan) xpSpan.textContent = message.value.xp;
                            if (xpToNextLevelSpan) xpToNextLevelSpan.textContent = message.value.xpToNextLevel;
                            if (xpBar) {
                                xpBar.value = message.value.xp;
                                xpBar.max = message.value.xpToNextLevel;
                            }
                            if (speedSpan) speedSpan.textContent = message.value.speed;
                            if (strengthSpan) strengthSpan.textContent = message.value.strength;
                            if (knowledgeSpan) knowledgeSpan.textContent = message.value.knowledge;
                            break;
                        }
                    case 'updateGoals':
                        {
                            renderGoals(message.value);
                            break;
                        }
                }
            });
        }());
