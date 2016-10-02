'use strict';
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const disposables: vscode.Disposable[] = [];
    let singletonResource = vscode.Uri.parse('svgpreview:///preview.svg');
    let singletonResourceContent = { content: "" };
    let singletonMode: boolean;
    let openedOnce: boolean;
    let provider = new SVGPreviewProvider(singletonResourceContent);

    disposables.push(vscode.commands.registerTextEditorCommand('svgpreview.showPreview', (editor) => {
        openDocument(editor.document);
    }));
    disposables.push(vscode.commands.registerTextEditorCommand('svgpreview.showPreviewToSide', (editor) => {
        openDocument(editor.document, true);
    }));
    const openOnce = (currentDocument: vscode.TextDocument) => {
        if (openedOnce || !singletonMode) {
            return;
        }
        const documents = vscode.window.visibleTextEditors.map(editor => editor.document);
        const allDocuments: vscode.TextDocument[] = [currentDocument, ...documents];

        allDocuments.forEach(document => {
            if (document && document.fileName && document.fileName.endsWith('.svg')) {
                openedOnce = true;
                vscode.window.showTextDocument(document).then(() => {
                    openDocument(document, true).then(() => vscode.window.showTextDocument(document));
                });
                return;
            }
        });
    }
    const update = document => {
        if (!document || document.uri.scheme == "svgpreview" || !document.fileName.endsWith('.svg')) {
            return;
        }
        singletonResourceContent.content = document.getText();
        provider.update(singletonResource);
    };
    if (vscode.window.activeTextEditor) {
        update(vscode.window.activeTextEditor.document);
    }
    disposables.push(vscode.window.onDidChangeActiveTextEditor(editor => editor && update(editor.document)));
    disposables.push(vscode.workspace.onDidOpenTextDocument(document => {
        openOnce(document);
        update(document);
    }));
    disposables.push(vscode.workspace.onDidChangeTextDocument(event => update(event.document)));
    disposables.push(vscode.workspace.registerTextDocumentContentProvider('svgpreview', provider));

    const updateFromConfiguration = () => {
        singletonMode = vscode.workspace.getConfiguration('svgpreview').get('singletonmode', false);
        if (vscode.window.activeTextEditor) {
            const currentDocument = vscode.window.activeTextEditor.document
            openOnce(currentDocument);
            update(currentDocument);
        }
    };
    updateFromConfiguration();
    disposables.push(vscode.workspace.onDidChangeConfiguration(updateFromConfiguration));
    context.subscriptions.push(...disposables);


    function openDocument(document: vscode.TextDocument, sideBySide: boolean = false): Thenable<{}> {
        const resource = document.uri;
        if (!document.fileName.endsWith('.svg')) {
            vscode.window.showErrorMessage('File type unsupported');
            return;
        }
        return vscode.commands.executeCommand('vscode.previewHtml',
            singletonMode ? singletonResource : resource,
            getViewColumn(sideBySide),
            singletonMode ? `SVG Preview` : `Preview '${path.basename(resource.fsPath)}'`);
    }
}
class SVGPreviewProvider implements vscode.TextDocumentContentProvider {
    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _waiting: boolean;
    private _singletonResourceContent;
    constructor(singletonResourceContent: { content: string }) {
        this._singletonResourceContent = singletonResourceContent;
    }
    get onDidChange(): vscode.Event<vscode.Uri> {
        return this._onDidChange.event;
    }
    public update(uri: vscode.Uri) {
        if (!this._waiting) {
            this._waiting = true;
            setTimeout(() => {
                this._waiting = false;
                this._onDidChange.fire(uri);
            }, 300);
        }
    }
    public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
        return this._singletonResourceContent.content;
    }
}
function getViewColumn(sideBySide): vscode.ViewColumn {
    const active = vscode.window.activeTextEditor;
    if (!active) {
        return vscode.ViewColumn.One;
    }

    if (!sideBySide) {
        return active.viewColumn;
    }

    switch (active.viewColumn) {
        case vscode.ViewColumn.One:
            return vscode.ViewColumn.Two;
        case vscode.ViewColumn.Two:
            return vscode.ViewColumn.Three;
    }

    return active.viewColumn;
}