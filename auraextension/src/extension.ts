// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let activeCodingTimeSeconds = 0;
let totalCodingTimeSecondsToday = 0;
let lastActivityTime: number | undefined;
let lastDayReset: string | undefined;
let timer: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;
let globalState: vscode.Memento;

function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function updateStatusBarItem() {
    const activeTimeFormatted = formatTime(activeCodingTimeSeconds);
    const totalTimeFormatted = formatTime(totalCodingTimeSecondsToday);
    statusBarItem.text = `$(watch) Active: ${activeTimeFormatted} | Total Today: ${totalTimeFormatted}`;
    statusBarItem.tooltip = 'Active coding time | Total coding time today';
}

function startTimer() {
    if (timer) {
        clearInterval(timer);
    }
    timer = setInterval(() => {
        activeCodingTimeSeconds++;
        totalCodingTimeSecondsToday++;
        globalState.update('totalCodingTimeSecondsToday', totalCodingTimeSecondsToday);
        updateStatusBarItem();
    }, 1000);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }
}

function recordActivity() {
    lastActivityTime = Date.now();
    startTimer();
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "auraextension" is now active!');

    globalState = context.globalState;

    // Load stored data
    totalCodingTimeSecondsToday = globalState.get('totalCodingTimeSecondsToday', 0);
    lastDayReset = globalState.get('lastDayReset', new Date().toDateString());

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

    // Initial activity recording
    recordActivity();

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

    // The original helloWorld command (can be removed or modified later)
    const disposable = vscode.commands.registerCommand('auraextension.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from AuraFarmProgramming!');
    });
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    stopTimer();
    statusBarItem.dispose();
    globalState.update('totalCodingTimeSecondsToday', totalCodingTimeSecondsToday);
    globalState.update('lastDayReset', lastDayReset);
}
