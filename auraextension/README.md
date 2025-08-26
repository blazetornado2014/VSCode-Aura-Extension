# Aura Farm Time Tracker

A VS Code extension to help you track your coding time, manage goals and tasks, and gain XP and levels as you progress.

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/blazetornado2014/VSCode-Aura-Extension.git
    cd VSCode-Aura-Extension/auraextension
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Open in VS Code:**
    Open the `auraextension` folder in VS Code.
4.  **Run the extension:**
    Press `F5` to run the extension in a new Extension Development Host window.

## Features and Commands

The Aura Farm Time Tracker provides the following commands, which can be accessed via the VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

*   **`Aura Extension: Set Method to Pomodoro`**:
    Switches the time tracking method to Pomodoro mode. In this mode, you work in focused intervals (e.g., 25 minutes) followed by short or long breaks.
*   **`Aura Extension: Set Method to Default`**:
    Switches the time tracking method back to Default mode, where your active coding time is continuously tracked.
*   **`Aura Extension: Add Goal`**:
    Allows you to add a new goal to your list. You will be prompted to enter the goal text.
*   **`Aura Extension: Add Task`**:
    (This command is typically used internally by the webview when adding tasks to a specific goal.)
*   **`Aura Extension: Complete Task`**:
    (This command is typically used internally by the webview when marking a task as complete.) Completing a task awards you Speed and XP.
*   **`Aura Extension: Complete Goal`**:
    (This command is typically used internally by the webview when marking a goal as complete.) Completing a goal awards you Strength and XP.
*   **`Aura Extension: Log What I Learned`**:
    Prompts you to enter something you've learned. Logging a learning awards you Knowledge and XP.
*   **`Aura Extension: Reset Stats`**:
    Resets your user level to 1 and XP to 0, along with other stats (Speed, Strength, Knowledge).
*   **`Aura Extension: Hello World`**:
    A simple command that displays a "Hello World" message.

## Usage

Once the extension is running, you will see the "Aura Farm Time Tracker" view in the VS Code sidebar.

*   **Timer Tab**: Select your preferred time tracking method (Default or Pomodoro) and see your current status.
*   **Stats & Tasks Tab**: View your current level, XP, and other stats. You can also add new goals and manage tasks associated with them.

XP is gained by completing tasks, goals, and logging what you've learned. Leveling up requires accumulating enough XP.
