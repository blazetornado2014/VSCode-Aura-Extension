// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    const select = document.getElementById('method-select');

    if (select) {
        select.addEventListener('change', (event) => {
            if (event.target) {
                vscode.postMessage({
                    type: 'setMethod',
                    value: /** @type {HTMLSelectElement} */ (event.target).value
                });
            }
        });
    }

    const statusText = document.getElementById('status-text');

    // Request the initial status from the extension
    vscode.postMessage({ type: 'getStatus' });

    // Handle messages sent from the extension to the webview
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
        }
    });
}());
