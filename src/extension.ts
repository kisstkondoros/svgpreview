'use strict';
import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    var disposables: vscode.Disposable[] = [];
    disposables.push(vscode.commands.registerTextEditorCommand('svgpreview.showPreview', (editor) => {
        openDocument(editor);
    }));
    disposables.push(vscode.commands.registerTextEditorCommand('svgpreview.showPreviewToSide', (editor) => {
        openDocument(editor, true)
    }));
    context.subscriptions.push(...disposables);
}

function openDocument(editor: vscode.TextEditor, sideBySide: boolean = false): Thenable<{}> {
    var resource = editor.document.uri;
    var originalResource = resource;
    if (!editor.document.fileName.endsWith('svg')) {
        vscode.window.showErrorMessage('File type unsupported');
        return;
    }
    return vscode.commands.executeCommand('vscode.previewHtml', resource,
        getViewColumn(sideBySide),
        `Preview '${path.basename(originalResource.fsPath)}'`);
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