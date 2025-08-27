import * as vscode from 'vscode';

export class TimeTrackerWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'auraFarmTimeTracker';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'setMethod':
                    {
                        vscode.commands.executeCommand(data.value);
                        break;
                    }
                case 'getStatus':
                    {
                        const pomodoroModeEnabled = vscode.workspace.getConfiguration('auraextension.pomodoro').get('enabled', false);
                        this.updateStatus(`You are currently on ${pomodoroModeEnabled ? 'Pomodoro' : 'Default'} mode`);
                        break;
                    }
                case 'addGoal':
                    {
                        vscode.commands.executeCommand('auraextension.addGoal', data.value);
                        break;
                    }
            }
        });
    }

    public updateStatus(status: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateStatus', value: status });
        }
    }

    public updateStats(stats: any) { // Using 'any' for now, will define a proper interface later if needed
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateStats', value: stats });
        }
    }

    public updateGoals(goals: any[]) { // Using 'any' for now, will define a proper interface later if needed
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateGoals', value: goals });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

        // Do the same for the stylesheet.
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Aura Farm Time Tracker</title>
			</head>
			<body>
				<div class="tab">
					<button class="tablinks active" data-tab="Timer">Timer</button>
					<button class="tablinks" data-tab="Stats">Stats & Tasks</button>
				</div>

				<div id="Timer" class="tabcontent" style="display: block;">
					<p style="font-size: 1.5em; font-weight: bold;">What timer do you want to use?</p>
					<select id="method-select">
						<option value="auraextension.setMethodToDefault">Default</option>
						<option value="auraextension.setMethodToPomodoro">Pomodoro</option>
					</select>
					<p id="status-text"></p>
				</div>

				<div id="Stats" class="tabcontent">
					<h3>Stats</h3>
					<p>Level: <span id="level">1</span></p>
					<p>XP: <span id="xp">0</span> / <span id="xp-to-next-level">100</span></p>
					<progress id="xp-bar" value="0" max="100"></progress>
					<p>Speed: <span id="speed">0</span></p>
					<p>Strength: <span id="strength">0</span></p>
					<p>Knowledge: <span id="knowledge">0</span></p>
					<hr>
					<h3>Goals & Tasks</h3>
					<input type="text" id="goal-input" placeholder="Add a new goal...">
					<button id="add-goal-btn">Add Goal</button>
					<ul id="goal-list">
						<!-- Goals and tasks will be rendered here by main.js -->
					</ul>
				</div>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
