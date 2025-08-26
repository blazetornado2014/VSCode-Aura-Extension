// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { TimeTrackerWebviewProvider } from './TimeTrackerWebviewProvider';

let activeCodingTimeSeconds = 0;
let totalCodingTimeSecondsToday = 0;
let lastActivityTime: number | undefined;
let lastDayReset: string | undefined;
let timer: NodeJS.Timeout | undefined; // Timer for active/total coding time
let statusBarItem: vscode.StatusBarItem;
let globalState: vscode.Memento;
let provider: TimeTrackerWebviewProvider; // Declare provider globally

// Pomodoro variables
enum PomodoroState {
    Idle = 'Idle',
    Working = 'Working',
    ShortBreak = 'ShortBreak',
    LongBreak = 'LongBreak'
}

let pomodoroModeEnabled: boolean = false;
let pomodoroState: PomodoroState = PomodoroState.Idle;
let pomodoroRemainingTime: number = 0; // in seconds
let pomodoroCount: number = 0; // Number of completed work sessions in current cycle
let pomodoroTimer: NodeJS.Timeout | undefined; // Timer for pomodoro intervals

// XP and Stats variables
interface UserStats {
    level: number;
    xp: number;
    xpToNextLevel: number;
    speed: number;
    strength: number;
    knowledge: number;
}

interface Goal {
    id: string;
    text: string;
    completed: boolean;
    tasks: Task[];
}

interface Task {
    id: string;
    text: string;
    completed: boolean;
}

let userStats: UserStats = {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    speed: 0,
    strength: 0,
    knowledge: 0,
};

let goals: Goal[] = [];

// Configuration values (defaults, loaded from settings)
let workDuration: number = 25 * 60; // 25 minutes in seconds
let shortBreakDuration: number = 5 * 60; // 5 minutes in seconds
let longBreakDuration: number = 20 * 60; // 20 minutes in seconds
let pomodorosBeforeLongBreak: number = 4;

function loadConfiguration() {
    const config = vscode.workspace.getConfiguration('auraextension.pomodoro');
    pomodoroModeEnabled = config.get('enabled', false);
    workDuration = config.get('workDuration', 25) * 60;
    shortBreakDuration = config.get('shortBreakDuration', 5) * 60;
    longBreakDuration = config.get('longBreakDuration', 20) * 60;
    pomodorosBeforeLongBreak = config.get('pomodorosBeforeLongBreak', 4);
}

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function updateStatusBarItem() {
    const activeTimeFormatted = formatTime(activeCodingTimeSeconds);
    const totalTimeFormatted = formatTime(totalCodingTimeSecondsToday);

    if (pomodoroModeEnabled) {
        const pomodoroTimeFormatted = formatTime(pomodoroRemainingTime);
        let pomodoroStatus = '';
        switch (pomodoroState) {
            case PomodoroState.Working:
                pomodoroStatus = `Work: ${pomodoroTimeFormatted} (${pomodoroCount}/${pomodorosBeforeLongBreak})`;
                break;
            case PomodoroState.ShortBreak:
                pomodoroStatus = `Short Break: ${pomodoroTimeFormatted}`;
                break;
            case PomodoroState.Idle:
                pomodoroStatus = `Idle`;
                break;
            case PomodoroState.LongBreak:
                pomodoroStatus = `Long Break: ${pomodoroTimeFormatted}`;
                break;
        }
        statusBarItem.text = `$(watch) ${pomodoroStatus} | Active: ${activeTimeFormatted}`;
        statusBarItem.tooltip = `Pomodoro: ${pomodoroState} | Active coding time | Total coding time today: ${totalTimeFormatted}`;
    } else {
        statusBarItem.text = `$(watch) Active: ${activeTimeFormatted} | Total Today: ${totalTimeFormatted}`;
        statusBarItem.tooltip = 'Active coding time | Total coding time today';
    }
}

function startCodingTimer() {
    if (timer) {
        clearInterval(timer);
    }
    timer = setInterval(() => {
        if (pomodoroModeEnabled && pomodoroState !== PomodoroState.Working) {
            // Do not increment coding time during breaks in Pomodoro mode
            return;
        }
        activeCodingTimeSeconds++;
        totalCodingTimeSecondsToday++;
        if (userStats.xp >= userStats.xpToNextLevel) {
            userStats.level++;
            userStats.xp = 0;
            userStats.xpToNextLevel = Math.floor(userStats.xpToNextLevel * 1.2); // Increase XP needed for next level
            vscode.window.showInformationMessage(`Congratulations! You reached Level ${userStats.level}!`);
        }
        globalState.update('totalCodingTimeSecondsToday', totalCodingTimeSecondsToday);
        globalState.update('userStats', userStats); // Persist updated stats
        updateStatusBarItem();
        provider.updateStats(userStats); // Update webview with new stats
    }, 1000);
}

function stopCodingTimer() {
    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }
}

function recordActivity() {
    lastActivityTime = Date.now();
    startCodingTimer();
}

function startPomodoroTimer() {
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
    }

    pomodoroTimer = setInterval(() => {
        if (pomodoroRemainingTime > 0) {
            pomodoroRemainingTime--;
        } else {
            // Time's up for current state, transition to next
            clearInterval(pomodoroTimer);
            transitionPomodoroState();
        }
        updateStatusBarItem();
    }, 1000);
}

function stopPomodoroTimer() {
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = undefined;
    }
}

function transitionPomodoroState() {
    switch (pomodoroState) {
        case PomodoroState.Working:
            pomodoroCount++;
            if (pomodoroCount >= pomodorosBeforeLongBreak) {
                pomodoroState = PomodoroState.LongBreak;
                pomodoroRemainingTime = longBreakDuration;
                pomodoroCount = 0; // Reset count after long break
                vscode.window.showInformationMessage('Pomodoro: Long break time! Take a break.');
            } else {
                pomodoroState = PomodoroState.ShortBreak;
                pomodoroRemainingTime = shortBreakDuration;
                vscode.window.showInformationMessage('Pomodoro: Short break time! Stretch your legs.');
            }
            stopCodingTimer(); // Pause coding timer during breaks
            break;
        case PomodoroState.ShortBreak:
        case PomodoroState.LongBreak:
            pomodoroState = PomodoroState.Working;
            pomodoroRemainingTime = workDuration;
            vscode.window.showInformationMessage('Pomodoro: Back to work!');
            startCodingTimer(); // Resume coding timer
            break;
        case PomodoroState.Idle:
            // Initial start
            pomodoroState = PomodoroState.Working;
            pomodoroRemainingTime = workDuration;
            vscode.window.showInformationMessage('Pomodoro: Starting first work session!');
            startCodingTimer();
            break;
    }
    globalState.update('pomodoroState', pomodoroState);
    globalState.update('pomodoroRemainingTime', pomodoroRemainingTime);
    globalState.update('pomodoroCount', pomodoroCount);
    startPomodoroTimer();
}

function setPomodoroMode(enabled: boolean, provider: TimeTrackerWebviewProvider) {
    pomodoroModeEnabled = enabled;
    globalState.update('pomodoroModeEnabled', pomodoroModeEnabled);
    vscode.window.showInformationMessage(`Time Tracking Method: ${pomodoroModeEnabled ? 'Pomodoro' : 'Default'}`);

    if (provider) {
        provider.updateStatus(`You are currently on ${pomodoroModeEnabled ? 'Pomodoro' : 'Default'} mode`);
        provider.updateStats(userStats); // Send initial stats to webview
    }

    if (pomodoroModeEnabled) {
        // Load Pomodoro state or start fresh
        pomodoroState = globalState.get('pomodoroState', PomodoroState.Idle);
        pomodoroRemainingTime = globalState.get('pomodoroRemainingTime', 0);
        pomodoroCount = globalState.get('pomodoroCount', 0);

        if (pomodoroState === PomodoroState.Idle || pomodoroRemainingTime <= 0) {
            transitionPomodoroState(); // Start a new work session
        } else {
            startPomodoroTimer(); // Resume existing timer
            if (pomodoroState === PomodoroState.Working) {
                startCodingTimer();
            } else {
                stopCodingTimer();
            }
        }
    } else {
        stopPomodoroTimer();
        pomodoroState = PomodoroState.Idle;
        pomodoroRemainingTime = 0;
        pomodoroCount = 0;
        globalState.update('pomodoroState', pomodoroState);
        globalState.update('pomodoroRemainingTime', pomodoroRemainingTime);
        globalState.update('pomodoroCount', pomodoroCount);
        startCodingTimer(); // Ensure default coding timer is running
    }
    updateStatusBarItem();
    vscode.commands.executeCommand('auraFarmTimeTracker.refreshEntry'); // Refresh the tree view
}

function checkLevelUp() {
    if (userStats.xp >= userStats.xpToNextLevel) {
        userStats.level++;
        userStats.xp = userStats.xp - userStats.xpToNextLevel; // Carry over excess XP
        userStats.xpToNextLevel = Math.floor(userStats.xpToNextLevel * 1.2); // Increase XP needed for next level
        vscode.window.showInformationMessage(`Congratulations! You reached Level ${userStats.level}!`);
        // Recursively check if multiple level-ups occurred
        checkLevelUp();
    }
}



// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "auraextension" is now active!');

    globalState = context.globalState;
    loadConfiguration(); // Load initial configuration

    // Load stored data
    totalCodingTimeSecondsToday = globalState.get('totalCodingTimeSecondsToday', 0);
    lastDayReset = globalState.get('lastDayReset', new Date().toDateString());

    // Load XP and Stats data
    userStats = globalState.get('userStats', { level: 1, xp: 0, xpToNextLevel: 100, speed: 0, strength: 0, knowledge: 0 });
    goals = globalState.get('goals', []);

    // Check if a new day has started
    const today = new Date().toDateString();
    if (lastDayReset !== today) {
        totalCodingTimeSecondsToday = 0;
        lastDayReset = today;
        globalState.update('lastDayReset', lastDayReset);
        globalState.update('totalCodingTimeSecondsToday', totalCodingTimeSecondsToday);
    }

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    updateStatusBarItem();
    statusBarItem.show();

    // Load Pomodoro state and start if enabled
    pomodoroModeEnabled = globalState.get('pomodoroModeEnabled', false);
    if (pomodoroModeEnabled) {
        pomodoroState = globalState.get('pomodoroState', PomodoroState.Idle);
        pomodoroRemainingTime = globalState.get('pomodoroRemainingTime', 0);
        pomodoroCount = globalState.get('pomodoroCount', 0);

        if (pomodoroState !== PomodoroState.Idle && pomodoroRemainingTime > 0) {
            startPomodoroTimer();
            if (pomodoroState === PomodoroState.Working) {
                startCodingTimer();
            } else {
                stopCodingTimer();
            }
        } else {
            // If Pomodoro was enabled but state is idle or time ran out, start a new work session
            transitionPomodoroState();
        }
    } else {
        // Initial activity recording for default mode
        recordActivity();
    }


    // Listen for text document changes
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (event.contentChanges.length > 0) {
            recordActivity();
        }
    }));

    // Listen for file saves
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(() => {
        recordActivity();
    }));

    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('auraextension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AuraFarmProgramming!');
    }));
    // context.subscriptions.push(vscode.commands.registerCommand('auraextension.togglePomodoro', togglePomodoroMode)); // Removed
    // context.subscriptions.push(vscode.commands.registerCommand('auraextension.selectTimeTrackingMethod', showMethodSelector)); // Removed

    // Register Webview View
    provider = new TimeTrackerWebviewProvider(context.extensionUri); // Assign to global provider

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(TimeTrackerWebviewProvider.viewType, provider));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.setMethodToPomodoro', () => setPomodoroMode(true, provider)));
    context.subscriptions.push(vscode.commands.registerCommand('auraextension.setMethodToDefault', () => setPomodoroMode(false, provider)));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.addGoal', async (goalText: string) => {
        const newGoal: Goal = {
            id: Date.now().toString(), // Simple unique ID
            text: goalText,
            completed: false,
            tasks: []
        };
        goals.push(newGoal);
        globalState.update('goals', goals);
        provider.updateGoals(goals);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.addTask', async (goalId: string, taskText: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            const newTask: Task = {
                id: Date.now().toString(),
                text: taskText,
                completed: false
            };
            goal.tasks.push(newTask);
            globalState.update('goals', goals);
            provider.updateGoals(goals);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.completeTask', async (goalId: string, taskId: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            const task = goal.tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = true;
                userStats.speed += 5; // Award Speed for completing a task
                userStats.xp += 10; // Award XP for completing a task
                checkLevelUp();
                globalState.update('goals', goals);
                globalState.update('userStats', userStats);
                provider.updateGoals(goals);
                provider.updateStats(userStats);
            }
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.completeGoal', async (goalId: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = true;
            userStats.strength += 10; // Award Strength for completing a goal
            userStats.xp += 50; // Award XP for completing a goal
            checkLevelUp();
            globalState.update('goals', goals);
            globalState.update('userStats', userStats);
            provider.updateGoals(goals);
            provider.updateStats(userStats);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.logWhatILearned', async () => {
        const learnedText = await vscode.window.showInputBox({
            prompt: 'What did you learn?',
            placeHolder: 'e.g., How to use Webviews in VS Code extensions'
        });
        if (learnedText) {
            userStats.knowledge += 1; // Award Knowledge for logging a learning
            userStats.xp += 20; // Award XP for logging a learning
            checkLevelUp();
            globalState.update('userStats', userStats);
            provider.updateStats(userStats);
            vscode.window.showInformationMessage('Knowledge gained!');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('auraextension.resetStats', () => {
        userStats = {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            speed: 0,
            strength: 0,
            knowledge: 0,
        };
        globalState.update('userStats', userStats);
        provider.updateStats(userStats);
        vscode.window.showInformationMessage('User stats have been reset.');
    }));

    // Initial update of stats and goals to the webview
    provider.updateStats(userStats);
    provider.updateGoals(goals);


    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('auraextension.pomodoro')) {
            loadConfiguration();
            updateStatusBarItem();
        }
    }));
}

// This method is called when your extension is deactivated
export function deactivate() {
    stopCodingTimer();
    stopPomodoroTimer();
    statusBarItem.dispose();
    globalState.update('totalCodingTimeSecondsToday', totalCodingTimeSecondsToday);
    globalState.update('lastDayReset', lastDayReset);
    globalState.update('pomodoroModeEnabled', pomodoroModeEnabled);
    globalState.update('pomodoroState', pomodoroState);
    globalState.update('pomodoroRemainingTime', pomodoroRemainingTime);
    globalState.update('pomodoroCount', pomodoroCount);
    globalState.update('userStats', userStats);
    globalState.update('goals', goals);
}
